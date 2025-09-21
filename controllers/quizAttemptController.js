const QuizAttempt = require("../models/QuizAttempt");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Enrollment = require("../models/Enrollment");

// @desc    Start quiz attempt
// @route   POST /api/quizzes/:quizId/attempt
// @access  Private (Students)
const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user._id;

    const quiz = await Quiz.findById(quizId)
      .populate("course", "title")
      .populate("questions");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }


    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: quiz.course._id,
      status: { $in: ["active", "completed"] },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in the course to take this quiz",
      });
    }


    const attemptCount = await QuizAttempt.getStudentAttemptCount(
      quizId,
      studentId
    );
    const canAttemptResult = quiz.canAttempt(req.user, attemptCount);

    if (!canAttemptResult.canAttempt) {
      return res.status(400).json({
        success: false,
        message: canAttemptResult.reason,
      });
    }


    const existingAttempt = await QuizAttempt.findOne({
      quiz: quizId,
      student: studentId,
      status: "in_progress",
    });

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message: "You already have an in-progress attempt for this quiz",
        data: {
          attemptId: existingAttempt._id,
          startedAt: existingAttempt.startedAt,
        },
      });
    }


    const attempt = await QuizAttempt.create({
      quiz: quizId,
      student: studentId,
      attemptNumber: attemptCount + 1,
      maxScore: quiz.totalPoints || 0,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      browserInfo: {
        name: req.get("User-Agent"),
        platform: req.get("User-Agent"),
      },
    });

    const questions = quiz.randomizeQuestions
      ? [...quiz.questions].sort(() => Math.random() - 0.5)
      : quiz.questions;

    const responses = questions.map((question) => ({
      question: question._id,
      answer: null,
      timeSpent: 0,
      isSkipped: false,
    }));

    attempt.responses = responses;
    await attempt.save();


    const quizData = {
      ...quiz.toObject(),
      questions: questions.map((q) => {
        const questionData = {
          _id: q._id,
          question: q.question,
          type: q.type,
          description: q.description,
          image: q.image,
          points: q.points,
          timeLimit: q.timeLimit,
        };

        if (q.type === "mcq" && q.options) {
          questionData.options = quiz.randomizeOptions
            ? [...q.options].sort(() => Math.random() - 0.5)
            : q.options;
          questionData.options = questionData.options.map((option) => ({
            text: option.text,
            image: option.image,
          }));
        }


        if (q.type === "coding") {
          questionData.codingLanguage = q.codingLanguage;
          questionData.starterCode = q.starterCode;
        }

        return questionData;
      }),
    };


    delete quizData.creator;
    delete quizData.stats;

    res.status(201).json({
      success: true,
      message: "Quiz attempt started successfully",
      data: {
        attempt: {
          _id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          startedAt: attempt.startedAt,
          timeRemaining: quiz.duration * 60,
          status: attempt.status,
        },
        quiz: quizData,
      },
    });
  } catch (error) {
    console.error("Start quiz attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Could not start quiz attempt",
      error: error.message,
    });
  }
};

// @desc    Get quiz attempt
// @route   GET /api/quiz-attempts/:attemptId
// @access  Private (Student who owns attempt or Teacher/Admin)
const getQuizAttempt = async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate({
        path: "quiz",
        select:
          "title duration course questions showResults showCorrectAnswers",
        populate: [{ path: "course", select: "title" }, { path: "questions" }],
      })
      .populate("student", "name email studentId");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }


    const isStudent =
      attempt.student._id.toString() === req.user._id.toString();
    const isTeacher = ["admin", "principal", "teacher"].includes(req.user.role);

    if (!isStudent && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this quiz attempt",
      });
    }


    let responseData = attempt.toObject();

    if (isStudent) {
      const now = new Date();
      const showResults = attempt.quiz.showResults;
      const quizEnded = now > attempt.quiz.endTime;


      if (
        showResults === "never" ||
        (showResults === "after_end" && !quizEnded) ||
        (showResults === "manual" && !attempt.isGraded)
      ) {
        responseData.responses = responseData.responses.map((r) => ({
          question: r.question,
          answer: r.answer,
          timeSpent: r.timeSpent,
          answeredAt: r.answeredAt,
          isSkipped: r.isSkipped,
        }));

        delete responseData.totalScore;
        delete responseData.percentage;
        delete responseData.grade;
        delete responseData.passed;
      }


      if (!attempt.quiz.showCorrectAnswers || !quizEnded) {
        responseData.quiz.questions = responseData.quiz.questions.map((q) => {
          const { correctAnswer, explanation, ...questionWithoutAnswers } = q;
          return questionWithoutAnswers;
        });
      }
    }

    res.json({
      success: true,
      data: { attempt: responseData },
    });
  } catch (error) {
    console.error("Get quiz attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get quiz attempt",
      error: error.message,
    });
  }
};

// @desc    Submit answer for a question
// @route   PATCH /api/quiz-attempts/:attemptId/answer
// @access  Private (Student who owns attempt)
const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answer, timeSpent } = req.body;

    const attempt = await QuizAttempt.findById(attemptId).populate(
      "quiz",
      "duration endTime"
    );

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }


    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this quiz attempt",
      });
    }


    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Quiz attempt is not in progress",
      });
    }


    const now = new Date();
    const timeLimit = new Date(
      attempt.startedAt.getTime() + attempt.quiz.duration * 60 * 1000
    );

    if (now > timeLimit || now > attempt.quiz.endTime) {
      await attempt.submit(true);
      return res.status(400).json({
        success: false,
        message: "Quiz time has expired. Your attempt has been auto-submitted.",
        data: { attempt },
      });
    }


    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
    }


    attempt.submitResponse(questionId, answer);

    const responseIndex = attempt.responses.findIndex(
      (r) => r.question.toString() === questionId.toString()
    );

    if (responseIndex >= 0 && timeSpent) {
      attempt.responses[responseIndex].timeSpent += timeSpent;
      attempt.timeSpent += timeSpent;
    }

    await attempt.save();

    res.json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        questionId,
        answer,
        timeSpent: attempt.responses[responseIndex]?.timeSpent || 0,
      },
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({
      success: false,
      message: "Could not submit answer",
      error: error.message,
    });
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quiz-attempts/:attemptId/submit
// @access  Private (Student who owns attempt)
const submitQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await QuizAttempt.findById(attemptId)
      .populate("quiz", "title course showResults")
      .populate("quiz.course", "title");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this quiz attempt",
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Quiz attempt is not in progress",
      });
    }


    await attempt.submit(false);


    const responseData = {
      attempt: {
        _id: attempt._id,
        quiz: attempt.quiz.title,
        course: attempt.quiz.course.title,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        timeSpent: attempt.timeSpent,
        questionsAnswered: attempt.questionsAnswered,
        totalQuestions: attempt.responses.length,
      },
    };

    if (
      attempt.quiz.showResults === "immediately" ||
      ["admin", "principal", "teacher"].includes(req.user.role)
    ) {
      responseData.results = {
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        grade: attempt.grade,
        passed: attempt.passed,
        needsManualGrading: attempt.needsManualGrading,
      };
    }

    res.json({
      success: true,
      message: "Quiz submitted successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Submit quiz attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Could not submit quiz attempt",
      error: error.message,
    });
  }
};

// @desc    Get student's quiz attempts
// @route   GET /api/students/:studentId/quiz-attempts
// @access  Private (Student themselves or Teacher/Admin)
const getStudentAttempts = async (req, res) => {
  try {
    const { studentId } = req.params;


    const isOwnAttempts = studentId === req.user._id.toString();
    const isTeacher = ["admin", "principal", "teacher"].includes(req.user.role);

    if (!isOwnAttempts && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Access denied to these quiz attempts",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    let query = { student: studentId };

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.quiz) {
      query.quiz = req.query.quiz;
    }

    const attempts = await QuizAttempt.find(query)
      .populate({
        path: "quiz",
        select: "title course type totalPoints",
        populate: { path: "course", select: "title" },
      })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuizAttempt.countDocuments(query);

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get student attempts error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get quiz attempts",
      error: error.message,
    });
  }
};

// @desc    Get quiz attempts (for teachers)
// @route   GET /api/quizzes/:quizId/attempts
// @access  Private (Teacher/Admin)
const getQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId).populate("course", "instructor");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    const isCreator = quiz.creator.toString() === req.user._id.toString();
    const isInstructor =
      quiz.course.instructor.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view quiz attempts",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = { quiz: quizId };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const attempts = await QuizAttempt.find(query)
      .populate("student", "name email studentId")
      .sort({ submittedAt: -1, startedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuizAttempt.countDocuments(query);

    const submittedAttempts = attempts.filter((a) =>
      ["submitted", "auto_submitted"].includes(a.status)
    );
    const avgScore =
      submittedAttempts.length > 0
        ? submittedAttempts.reduce((sum, a) => sum + a.percentage, 0) /
          submittedAttempts.length
        : 0;

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalAttempts: total,
          submittedAttempts: submittedAttempts.length,
          averageScore: Math.round(avgScore),
          needsManualGrading: submittedAttempts.filter(
            (a) => a.needsManualGrading
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Get quiz attempts error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get quiz attempts",
      error: error.message,
    });
  }
};

// @desc    Grade quiz attempt manually
// @route   PATCH /api/quiz-attempts/:attemptId/grade
// @access  Private (Teacher/Admin)
const gradeQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses, totalScore, grade, comments } = req.body;

    const attempt = await QuizAttempt.findById(attemptId)
      .populate("quiz", "course creator")
      .populate("quiz.course", "instructor");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    const isCreator =
      attempt.quiz.creator.toString() === req.user._id.toString();
    const isInstructor =
      attempt.quiz.course.instructor.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to grade this attempt",
      });
    }

    if (responses && Array.isArray(responses)) {
      responses.forEach((responseUpdate) => {
        const responseIndex = attempt.responses.findIndex(
          (r) => r.question.toString() === responseUpdate.questionId
        );

        if (responseIndex >= 0) {
          if (responseUpdate.score !== undefined) {
            attempt.responses[responseIndex].score = responseUpdate.score;
          }
          if (responseUpdate.feedback !== undefined) {
            attempt.responses[responseIndex].feedback = responseUpdate.feedback;
          }
          if (responseUpdate.isCorrect !== undefined) {
            attempt.responses[responseIndex].isCorrect =
              responseUpdate.isCorrect;
          }
        }
      });
    }


    if (totalScore !== undefined) {
      attempt.totalScore = totalScore;
      attempt.percentage =
        attempt.maxScore > 0
          ? Math.round((totalScore / attempt.maxScore) * 100)
          : 0;
    } else {
      attempt.totalScore = attempt.responses.reduce(
        (sum, r) => sum + (r.score || 0),
        0
      );
      attempt.percentage =
        attempt.maxScore > 0
          ? Math.round((attempt.totalScore / attempt.maxScore) * 100)
          : 0;
    }


    attempt.grade = grade || attempt.grade;
    attempt.graderComments = comments || attempt.graderComments;
    attempt.gradedBy = req.user._id;
    attempt.gradedAt = new Date();
    attempt.isGraded = true;
    attempt.needsManualGrading = false;


    await attempt.populate("quiz", "passingScore");
    if (attempt.quiz.passingScore) {
      attempt.passed = attempt.percentage >= attempt.quiz.passingScore;
    }

    await attempt.save();

    res.json({
      success: true,
      message: "Quiz attempt graded successfully",
      data: {
        attempt: {
          _id: attempt._id,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          grade: attempt.grade,
          passed: attempt.passed,
          gradedBy: req.user.name,
          gradedAt: attempt.gradedAt,
        },
      },
    });
  } catch (error) {
    console.error("Grade quiz attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Could not grade quiz attempt",
      error: error.message,
    });
  }
};

module.exports = {
  startQuizAttempt,
  getQuizAttempt,
  submitAnswer,
  submitQuizAttempt,
  getStudentAttempts,
  getQuizAttempts,
  gradeQuizAttempt,
};
