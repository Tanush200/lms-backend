const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const QuizAttempt = require("../models/QuizAttempt");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

// @desc    Create new quiz
// @route   POST /api/quizzes
// @access  Private (Teacher/Admin/Principal)
const createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      courseId,
      type,
      category,
      duration,
      startTime,
      endTime,
      maxAttempts,
      allowRetry,
      questionsPerPage,
      showResults,
      showCorrectAnswers,
      randomizeQuestions,
      randomizeOptions,
      passingScore,
      gradingType,
      questions,
    } = req.body;


    if (!title || !courseId || !duration || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide title, course, duration, start time, and end time",
      });
    }

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
        message: "Not authorized to create quizzes for this course",
      });
    }


    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time",
      });
    }


    const quizData = {
      title,
      description,
      instructions,
      course: courseId,
      creator: req.user._id,
      type: type || "quiz",
      category: category || "practice",
      duration,
      startTime: start,
      endTime: end,
      maxAttempts: maxAttempts || 1,
      allowRetry: allowRetry || false,
      questionsPerPage: questionsPerPage || 1,
      showResults: showResults || "after_end",
      showCorrectAnswers: showCorrectAnswers || false,
      randomizeQuestions: randomizeQuestions || false,
      randomizeOptions: randomizeOptions || false,
      passingScore: passingScore || 60,
      gradingType: gradingType || "percentage",
      questions: questions || [],
    };

    const quiz = await Quiz.create(quizData);

    if (questions && questions.length > 0) {
      await quiz.calculateTotalPoints();
      await quiz.save();
    }

    await quiz.populate([
      { path: "course", select: "title" },
      { path: "creator", select: "name email" },
      { path: "questions", select: "question type points difficulty" },
    ]);

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: { quiz },
    });
  } catch (error) {
    console.error("Create quiz error:", error);

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
      message: "Could not create quiz",
      error: error.message,
    });
  }
};

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    let query = {};

    if (req.query.course) {
      query.course = req.query.course;
    }


    if (req.query.status) {
      query.status = req.query.status;
    }


    if (req.query.type) {
      query.type = req.query.type;
    }


    if (req.user.role === "student") {
      const now = new Date();
      query.status = "published";
      query.startTime = { $lte: now };
      query.endTime = { $gte: now };

      const enrollments = await Enrollment.find({
        student: req.user._id,
        status: { $in: ["active", "completed"] },
      }).select("course");

      const enrolledCourses = enrollments.map(
        (enrollment) => enrollment.course
      );
      query.course = { $in: enrolledCourses };
    }


    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const quizzes = await Quiz.find(query)
      .populate("course", "title subject")
      .populate("creator", "name email")
      .populate("questions", "type points")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quiz.countDocuments(query);


    if (req.user.role === "student") {
      for (let quiz of quizzes) {
        const attemptCount = await QuizAttempt.getStudentAttemptCount(
          quiz._id,
          req.user._id
        );
        const lastAttempt = await QuizAttempt.findOne({
          quiz: quiz._id,
          student: req.user._id,
        }).sort({ attemptNumber: -1 });

        quiz._doc.attemptCount = attemptCount;
        quiz._doc.lastAttempt = lastAttempt;
        quiz._doc.canAttempt = quiz.canAttempt(req.user, attemptCount);
      }
    }

    res.json({
      success: true,
      data: {
        quizzes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get quizzes",
      error: error.message,
    });
  }
};

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Private
const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate("course", "title subject instructor")
      .populate("creator", "name email")
      .populate({
        path: "questions",
        select:
          req.user.role === "student"
            ? "question type options points difficulty image description timeLimit"
            : "question type options correctAnswer points difficulty image description explanation timeLimit stats",
      });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }


    let hasAccess = false;

    if (["admin", "principal"].includes(req.user.role)) {
      hasAccess = true;
    } else if (req.user.role === "teacher") {
      hasAccess =
        quiz.course.instructor.toString() === req.user._id.toString() ||
        quiz.creator.toString() === req.user._id.toString();
    } else if (req.user.role === "student") {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: quiz.course._id,
        status: { $in: ["active", "completed"] },
      });

      hasAccess = !!enrollment;

      if (hasAccess) {
        const attemptCount = await QuizAttempt.getStudentAttemptCount(
          quiz._id,
          req.user._id
        );
        const lastAttempt = await QuizAttempt.findOne({
          quiz: quiz._id,
          student: req.user._id,
        }).sort({ attemptNumber: -1 });

        quiz._doc.attemptCount = attemptCount;
        quiz._doc.lastAttempt = lastAttempt;
        quiz._doc.canAttempt = quiz.canAttempt(req.user, attemptCount);


        if (quiz.showCorrectAnswers === false || new Date() < quiz.endTime) {
          quiz.questions.forEach((question) => {
            if (question.correctAnswer !== undefined) {
              delete question._doc.correctAnswer;
            }
            if (question.explanation !== undefined) {
              delete question._doc.explanation;
            }
          });
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this quiz",
      });
    }

    res.json({
      success: true,
      data: { quiz },
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get quiz",
      error: error.message,
    });
  }
};

// @desc    Update quiz
// @route   PATCH /api/quizzes/:id
// @access  Private (Quiz creator or Admin/Principal)
const updateQuiz = async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    const isCreator = quiz.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this quiz",
      });
    }


    const hasAttempts =
      (await QuizAttempt.countDocuments({ quiz: quiz._id })) > 0;

    if (hasAttempts) {
      const restrictedFields = ["questions", "totalPoints", "duration"];
      const hasRestrictedUpdates = restrictedFields.some(
        (field) => req.body[field] !== undefined
      );

      if (hasRestrictedUpdates && !isAdmin) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot modify quiz structure after students have attempted it",
        });
      }
    }


    const allowedUpdates = [
      "title",
      "description",
      "instructions",
      "type",
      "category",
      "duration",
      "startTime",
      "endTime",
      "maxAttempts",
      "allowRetry",
      "questionsPerPage",
      "showResults",
      "showCorrectAnswers",
      "randomizeQuestions",
      "randomizeOptions",
      "passingScore",
      "gradingType",
      "questions",
      "status",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });


    if (updates.startTime || updates.endTime) {
      const startTime = new Date(updates.startTime || quiz.startTime);
      const endTime = new Date(updates.endTime || quiz.endTime);

      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          message: "End time must be after start time",
        });
      }
    }


    quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate([
      { path: "course", select: "title subject" },
      { path: "creator", select: "name email" },
      { path: "questions", select: "question type points" },
    ]);


    if (updates.questions) {
      await quiz.calculateTotalPoints();
      await quiz.save();
    }

    res.json({
      success: true,
      message: "Quiz updated successfully",
      data: { quiz },
    });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update quiz",
      error: error.message,
    });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Quiz creator or Admin/Principal)
// In your backend/controllers/quizController.js - Update deleteQuiz function

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Quiz creator or Admin/Principal)
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    console.log("🗑️ Attempting to delete quiz:", {
      quizId: quiz._id,
      title: quiz.title,
      creator: quiz.creator,
      currentUser: req.user._id,
      userRole: req.user.role
    });

    // ✅ Check authorization
    const isCreator = quiz.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      console.log("❌ Authorization failed - not creator or admin");
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this quiz",
      });
    }

    // ✅ Check for student attempts
    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });
    console.log("📊 Quiz attempt count:", attemptCount);

    if (attemptCount > 0 && !isAdmin) {
      console.log("❌ Cannot delete - quiz has attempts and user is not admin");
      return res.status(400).json({
        success: false,
        message: `Cannot delete quiz with ${attemptCount} student attempts. Please contact administrator.`,
      });
    }

    // ✅ If admin and has attempts, delete attempts first
    if (attemptCount > 0 && isAdmin) {
      console.log("🗑️ Admin deleting quiz with attempts - removing attempts first");
      await QuizAttempt.deleteMany({ quiz: quiz._id });
      console.log("✅ Quiz attempts deleted");
    }

    // ✅ Delete the quiz
    await Quiz.findByIdAndDelete(req.params.id);
    console.log("✅ Quiz deleted successfully");

    res.json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete quiz",
      error: error.message,
    });
  }
};


// @desc    Get quiz statistics
// @route   GET /api/quizzes/:id/stats
// @access  Private (Quiz creator or Admin/Principal)
const getQuizStats = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate("course", "title");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }


    const isCreator = quiz.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal", "teacher"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view quiz statistics",
      });
    }


    const attempts = await QuizAttempt.find({
      quiz: quiz._id,
      status: { $in: ["submitted", "auto_submitted"] },
    }).populate("student", "name email studentId");


    const stats = {
      basic: {
        totalAttempts: attempts.length,
        uniqueStudents: new Set(attempts.map((a) => a.student._id.toString()))
          .size,
        averageScore: quiz.stats.averageScore,
        highestScore: quiz.stats.highestScore,
        lowestScore: quiz.stats.lowestScore,
        passRate: quiz.stats.passRate,
      },
      timing: {
        averageTimeSpent:
          attempts.reduce((sum, a) => sum + a.timeSpent, 0) /
          (attempts.length || 1),
        quickestCompletion: Math.min(...attempts.map((a) => a.timeSpent)),
        slowestCompletion: Math.max(...attempts.map((a) => a.timeSpent)),
      },
      distribution: {
        scoreRanges: {
          "90-100": attempts.filter((a) => a.percentage >= 90).length,
          "80-89": attempts.filter(
            (a) => a.percentage >= 80 && a.percentage < 90
          ).length,
          "70-79": attempts.filter(
            (a) => a.percentage >= 70 && a.percentage < 80
          ).length,
          "60-69": attempts.filter(
            (a) => a.percentage >= 60 && a.percentage < 70
          ).length,
          "Below 60": attempts.filter((a) => a.percentage < 60).length,
        },
      },
      recent: attempts.slice(0, 10),
    };

    res.json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          course: quiz.course.title,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Get quiz stats error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get quiz statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizStats,
};
