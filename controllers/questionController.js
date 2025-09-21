const Question = require("../models/Question");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");

// @desc    Create new question
// @route   POST /api/questions
// @access  Private (Teacher/Admin/Principal)
const createQuestion = async (req, res) => {
  try {
    const {
      question,
      type,
      description,
      options,
      correctAnswer,
      explanation,
      points,
      difficulty,
      timeLimit,
      allowPartialCredit,
      codingLanguage,
      starterCode,
      testCases,
      tags,
      category,
      subject,
      courseId,
    } = req.body;


    if (!question || !type) {
      return res.status(400).json({
        success: false,
        message: "Please provide question text and type",
      });
    }


    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }


      const isInstructor =
        course.instructor.toString() === req.user._id.toString();
      const isAssistant = course.assistantInstructors.includes(req.user._id);
      const isAdmin = ["admin", "principal"].includes(req.user.role);

      if (!isInstructor && !isAssistant && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to create questions for this course",
        });
      }
    }


    const questionData = {
      question,
      type,
      description,
      correctAnswer,
      explanation,
      points: points || 1,
      difficulty: difficulty || "medium",
      timeLimit,
      allowPartialCredit: allowPartialCredit || false,
      tags: tags || [],
      category,
      subject,
      course: courseId,
      creator: req.user._id,
    };

    if (type === "mcq" && options) {
      questionData.options = options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect || false,
      }));
    }


    if (type === "coding") {
      questionData.codingLanguage = codingLanguage;
      questionData.starterCode = starterCode || "";
      questionData.testCases = testCases || [];
    }


    if (req.file) {
      questionData.image = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    const newQuestion = await Question.create(questionData);

    await newQuestion.populate([
      { path: "creator", select: "name email" },
      { path: "course", select: "title subject" },
    ]);

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: { question: newQuestion },
    });
  } catch (error) {
    console.error("Create question error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Could not create question",
      error: error.message,
    });
  }
};

// @desc    Get all questions (Question Bank)
// @route   GET /api/questions
// @access  Private (Teacher/Admin/Principal)
const getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;


    let query = { isActive: true };

    if (req.query.course) {
      query.course = req.query.course;
    }


    if (req.query.type) {
      query.type = req.query.type;
    }


    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }


    if (req.query.creator) {
      query.creator = req.query.creator;
    }


    if (req.query.tags) {
      query.tags = { $in: req.query.tags.split(",") };
    }

    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    if (req.query.search) {
      query.$or = [
        { question: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { tags: { $in: [new RegExp(req.query.search, "i")] } },
      ];
    }


    if (req.user.role === "teacher") {
      const courses = await Course.find({
        $or: [
          { instructor: req.user._id },
          { assistantInstructors: req.user._id },
        ],
      }).select("_id");

      const courseIds = courses.map((course) => course._id);

      query.$or = [{ creator: req.user._id }, { course: { $in: courseIds } }];
    }


    const questions = await Question.find(query)
      .populate("creator", "name email")
      .populate("course", "title subject")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get questions error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get questions",
      error: error.message,
    });
  }
};

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
const getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("creator", "name email")
      .populate("course", "title subject");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }


    let hasAccess = false;

    if (["admin", "principal"].includes(req.user.role)) {
      hasAccess = true;
    } else if (req.user.role === "teacher") {
      hasAccess = question.creator.toString() === req.user._id.toString();


      if (!hasAccess && question.course) {
        const course = await Course.findById(question.course._id);
        if (course) {
          hasAccess =
            course.instructor.toString() === req.user._id.toString() ||
            course.assistantInstructors.includes(req.user._id);
        }
      }
    } else if (req.user.role === "student") {
      hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this question",
      });
    }

    res.json({
      success: true,
      data: { question },
    });
  } catch (error) {
    console.error("Get question error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get question",
      error: error.message,
    });
  }
};

// @desc    Update question
// @route   PATCH /api/questions/:id
// @access  Private (Question creator or Admin/Principal)
const updateQuestion = async (req, res) => {
  try {
    let question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }


    const isCreator = question.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this question",
      });
    }


    const activeQuizzes = await Quiz.find({
      questions: question._id,
      status: { $in: ["published", "active"] },
      endTime: { $gt: new Date() },
    });

    if (activeQuizzes.length > 0 && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify question used in active quizzes",
      });
    }


    const allowedUpdates = [
      "question",
      "description",
      "options",
      "correctAnswer",
      "explanation",
      "points",
      "difficulty",
      "timeLimit",
      "allowPartialCredit",
      "codingLanguage",
      "starterCode",
      "testCases",
      "tags",
      "category",
      "subject",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });


    if (req.file) {

      if (question.image && question.image.public_id) {
        const { deleteFile } = require("../config/cloudinary");
        try {
          await deleteFile(question.image.public_id);
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }

      updates.image = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    question = await Question.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate([
      { path: "creator", select: "name email" },
      { path: "course", select: "title subject" },
    ]);

    res.json({
      success: true,
      message: "Question updated successfully",
      data: { question },
    });
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update question",
      error: error.message,
    });
  }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Question creator or Admin/Principal)
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const isCreator = question.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this question",
      });
    }

    const quizzesUsingQuestion = await Quiz.find({ questions: question._id });

    if (quizzesUsingQuestion.length > 0 && !isAdmin) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete question used in quizzes. Please contact administrator.",
      });
    }


    if (quizzesUsingQuestion.length > 0 && isAdmin) {
      await Quiz.updateMany(
        { questions: question._id },
        { $pull: { questions: question._id } }
      );


      for (const quiz of quizzesUsingQuestion) {
        await quiz.calculateTotalPoints();
        await quiz.save();
      }
    }


    if (question.image && question.image.public_id) {
      const { deleteFile } = require("../config/cloudinary");
      try {
        await deleteFile(question.image.public_id);
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }


    await Question.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete question",
      error: error.message,
    });
  }
};

// @desc    Get question statistics
// @route   GET /api/questions/:id/stats
// @access  Private (Question creator or Admin/Principal)
const getQuestionStats = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate(
      "creator",
      "name email"
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }


    const isCreator =
      question.creator._id.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal", "teacher"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view question statistics",
      });
    }


    const quizzes = await Quiz.find({ questions: question._id })
      .select("title course")
      .populate("course", "title");

    const stats = {
      usage: {
        timesUsed: question.stats.timesUsed,
        totalAttempts: question.stats.totalAttempts,
        correctAttempts: question.stats.correctAttempts,
        averageScore: question.stats.averageScore,
        successRate: question.successRate,
      },
      quizzes: quizzes,
      performance: {
        difficulty: question.difficulty,
        points: question.points,
        type: question.type,
      },
    };

    res.json({
      success: true,
      data: {
        question: {
          id: question._id,
          question: question.question,
          type: question.type,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Get question stats error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get question statistics",
      error: error.message,
    });
  }
};

// @desc    Bulk create questions
// @route   POST /api/questions/bulk
// @access  Private (Teacher/Admin/Principal)
const bulkCreateQuestions = async (req, res) => {
  try {
    const { questions, courseId } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of questions",
      });
    }


    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const isInstructor =
        course.instructor.toString() === req.user._id.toString();
      const isAssistant = course.assistantInstructors.includes(req.user._id);
      const isAdmin = ["admin", "principal"].includes(req.user.role);

      if (!isInstructor && !isAssistant && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to create questions for this course",
        });
      }
    }


    const questionsToCreate = questions.map((q) => ({
      ...q,
      creator: req.user._id,
      course: courseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));


    const createdQuestions = await Question.insertMany(questionsToCreate, {
      ordered: false,
      rawResult: true,
    });

    res.status(201).json({
      success: true,
      message: `${createdQuestions.insertedCount} questions created successfully`,
      data: {
        created: createdQuestions.insertedCount,
        total: questions.length,
      },
    });
  } catch (error) {
    console.error("Bulk create questions error:", error);


    if (error.writeErrors) {
      const successful = error.result.insertedCount || 0;
      const failed = error.writeErrors.length;

      return res.status(207).json({
        success: true,
        message: `Bulk operation completed with ${successful} successful and ${failed} failed`,
        data: {
          created: successful,
          failed: failed,
          errors: error.writeErrors.map((err) => err.errmsg),
        },
      });
    }

    res.status(500).json({
      success: false,
      message: "Could not create questions",
      error: error.message,
    });
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionStats,
  bulkCreateQuestions,
};
