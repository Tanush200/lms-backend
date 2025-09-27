// backend/controllers/quizAttemptController.js - COMPLETE FIXED VERSION

const QuizAttempt = require("../models/QuizAttempt");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course"); // ✅ Make sure this import exists

// @desc    Start quiz attempt
// @route   POST /api/quizzes/:quizId/attempt
// @access  Private (Students)
// In your backend/controllers/quizAttemptController.js - IMPROVED startQuizAttempt

const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user._id;

    console.log("🚀 Starting quiz attempt for:", { quizId, studentId });

    const quiz = await Quiz.findById(quizId)
      .populate("course", "title")
      .populate("questions");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check enrollment
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

    // ✅ CRITICAL FIX: Use findOneAndUpdate for atomic operation to prevent race conditions
    const existingInProgressAttempt = await QuizAttempt.findOneAndUpdate(
      {
        quiz: quizId,
        student: studentId,
        status: "in_progress",
      },
      { 
        $set: { updatedAt: new Date() } // Just update timestamp to "claim" this attempt
      },
      { 
        new: true,
        upsert: false // Don't create if not found
      }
    );

    if (existingInProgressAttempt) {
      console.log("🔄 Returning existing in-progress attempt:", existingInProgressAttempt._id);
      
      // Return existing attempt data
      const questions = quiz.randomizeQuestions
        ? [...quiz.questions].sort(() => Math.random() - 0.5)
        : quiz.questions;

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

      return res.status(200).json({
        success: true,
        message: "Continuing existing quiz attempt",
        data: {
          attempt: {
            _id: existingInProgressAttempt._id,
            attemptNumber: existingInProgressAttempt.attemptNumber,
            startedAt: existingInProgressAttempt.startedAt,
            timeRemaining: Math.max(0, quiz.duration * 60 - Math.floor((Date.now() - new Date(existingInProgressAttempt.startedAt)) / 1000)),
            status: existingInProgressAttempt.status,
          },
          quiz: quizData,
        },
      });
    }

    // ✅ IMPROVED: Get attempt count with atomic operation
    const attemptCount = await QuizAttempt.countDocuments({
      quiz: quizId,
      student: studentId,
      status: { $in: ["submitted", "auto_submitted"] }
    });

    console.log("📊 Student attempt count:", attemptCount, "Max allowed:", quiz.maxAttempts);

    const canAttemptResult = quiz.canAttempt(req.user, attemptCount);

    if (!canAttemptResult.canAttempt) {
      return res.status(400).json({
        success: false,
        message: canAttemptResult.reason,
      });
    }

    // ✅ CRITICAL FIX: Calculate next attempt number with atomic operation
    const nextAttemptNumber = attemptCount + 1;
    console.log("🎯 Creating attempt number:", nextAttemptNumber);

    // ✅ ATOMIC CREATION: Use findOneAndUpdate with upsert to prevent duplicates
    let attempt;
    try {
      attempt = await QuizAttempt.findOneAndUpdate(
        {
          quiz: quizId,
          student: studentId,
          attemptNumber: nextAttemptNumber,
        },
        {
          $setOnInsert: {
            quiz: quizId,
            student: studentId,
            attemptNumber: nextAttemptNumber,
            maxScore: quiz.totalPoints || 0,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            browserInfo: {
              name: req.get("User-Agent"),
              platform: req.get("User-Agent"),
            },
            startedAt: new Date(),
            status: "in_progress",
            responses: quiz.questions.map((question) => ({
              question: question._id,
              answer: null,
              timeSpent: 0,
              isSkipped: false,
            })),
          }
        },
        {
          new: true,
          upsert: true, // Create if doesn't exist
          setDefaultsOnInsert: true,
        }
      );
    } catch (duplicateError) {
      if (duplicateError.code === 11000) {
        // Duplicate key error - another request already created this attempt
        console.log("🔄 Duplicate attempt detected, fetching existing one");
        
        // Find the existing attempt that was just created
        const existingAttempt = await QuizAttempt.findOne({
          quiz: quizId,
          student: studentId,
          attemptNumber: nextAttemptNumber,
        });

        if (existingAttempt) {
          attempt = existingAttempt;
        } else {
          // Fallback - something went wrong
          return res.status(500).json({
            success: false,
            message: "Failed to create or retrieve quiz attempt",
          });
        }
      } else {
        throw duplicateError; // Re-throw if it's not a duplicate key error
      }
    }

    // Prepare questions for frontend
    const questions = quiz.randomizeQuestions
      ? [...quiz.questions].sort(() => Math.random() - 0.5)
      : quiz.questions;

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
    
    // Handle specific duplicate key error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.quiz) {
      return res.status(409).json({
        success: false,
        message: "Quiz attempt already exists. Please refresh the page.",
      });
    }

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
        select: "title duration course questions showResults showCorrectAnswers endTime",
        populate: [{ path: "course", select: "title" }, { path: "questions" }],
      })
      .populate("student", "name email studentId");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    const isStudent = attempt.student._id.toString() === req.user._id.toString();
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
// In your backend/controllers/quizAttemptController.js - IMPROVED submitAnswer

// @desc    Submit answer for a question
// @route   PATCH /api/quiz-attempts/:attemptId/answer
// @access  Private (Student who owns attempt)
const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answer, timeSpent } = req.body;

    console.log("📝 Submitting answer:", { attemptId, questionId, answer, timeSpent });

    // ✅ Validate input
    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
    }

    // ✅ Find attempt with better error handling
    const attempt = await QuizAttempt.findById(attemptId).populate("quiz", "duration endTime");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    // ✅ Check ownership
    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this quiz attempt",
      });
    }

    // ✅ Check attempt status
    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Quiz attempt is ${attempt.status}. Cannot submit answers.`,
      });
    }

    // ✅ Enhanced time limit checking
    const now = new Date();
    const startTime = new Date(attempt.startedAt);
    const durationMs = (attempt.quiz?.duration || 30) * 60 * 1000; // Convert to milliseconds
    const timeLimit = new Date(startTime.getTime() + durationMs);
    const quizEndTime = attempt.quiz?.endTime ? new Date(attempt.quiz.endTime) : null;

    // Check if time has expired
    if (now > timeLimit) {
      console.log("⏰ Quiz time limit exceeded, auto-submitting");
      try {
        await attempt.submit(true);
        return res.status(400).json({
          success: false,
          message: "Quiz time has expired. Your attempt has been auto-submitted.",
          data: { 
            attempt: {
              _id: attempt._id,
              status: attempt.status,
              submittedAt: attempt.submittedAt,
            }
          },
        });
      } catch (submitError) {
        console.error("Error auto-submitting expired attempt:", submitError);
        return res.status(400).json({
          success: false,
          message: "Quiz time has expired.",
        });
      }
    }

    // Check if quiz end time has passed
    if (quizEndTime && now > quizEndTime) {
      console.log("📅 Quiz end time reached, auto-submitting");
      try {
        await attempt.submit(true);
        return res.status(400).json({
          success: false,
          message: "Quiz has ended. Your attempt has been auto-submitted.",
          data: { 
            attempt: {
              _id: attempt._id,
              status: attempt.status,
              submittedAt: attempt.submittedAt,
            }
          },
        });
      } catch (submitError) {
        console.error("Error auto-submitting ended attempt:", submitError);
        return res.status(400).json({
          success: false,
          message: "Quiz has ended.",
        });
      }
    }

    // ✅ Enhanced response submission
    try {
      // Find or create response
      let responseIndex = attempt.responses.findIndex(
        (r) => r.question.toString() === questionId.toString()
      );

      if (responseIndex === -1) {
        // Create new response if it doesn't exist
        attempt.responses.push({
          question: questionId,
          answer: answer,
          timeSpent: 0,
          answeredAt: new Date(),
          isSkipped: false,
        });
        responseIndex = attempt.responses.length - 1;
      } else {
        // Update existing response
        attempt.responses[responseIndex].answer = answer;
        attempt.responses[responseIndex].answeredAt = new Date();
        attempt.responses[responseIndex].isSkipped = false;
      }

      // ✅ Update time spent safely
      if (timeSpent && !isNaN(timeSpent) && timeSpent > 0) {
        const additionalTime = Math.min(timeSpent, 300); // Cap at 5 minutes per submission
        attempt.responses[responseIndex].timeSpent += additionalTime;
        attempt.timeSpent += additionalTime;
      }

      // Save the attempt
      await attempt.save();

      console.log("✅ Answer submitted successfully for question:", questionId);

      res.json({
        success: true,
        message: "Answer submitted successfully",
        data: {
          questionId,
          answer,
          timeSpent: attempt.responses[responseIndex].timeSpent,
          remainingTime: Math.max(0, Math.floor((timeLimit - now) / 1000)),
        },
      });

    } catch (saveError) {
      console.error("Error saving answer:", saveError);
      return res.status(500).json({
        success: false,
        message: "Failed to save answer",
        error: saveError.message,
      });
    }

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

    // ✅ Handle comma-separated status values
    if (req.query.status) {
      if (req.query.status.includes(',')) {
        query.status = { $in: req.query.status.split(',') };
      } else {
        query.status = req.query.status;
      }
    }

    if (req.query.quiz) {
      query.quiz = req.query.quiz;
    }

    const attempts = await QuizAttempt.find(query)
      .populate({
        path: "quiz",
        select: "title course type totalPoints duration passingScore",
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

// @desc    Get quiz attempts (for teachers and general use)
// @route   GET /api/quizzes/:quizId/attempts OR GET /api/quiz-attempts
// @access  Private
const getQuizAttempts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // ✅ Handle quiz filter from both route params and query
    if (req.params.quizId) {
      query.quiz = req.params.quizId;
    } else if (req.query.quiz) {
      query.quiz = req.query.quiz;
    }

    // ✅ Handle status filter (including comma-separated)
    if (req.query.status) {
      if (req.query.status.includes(',')) {
        query.status = { $in: req.query.status.split(',') };
      } else {
        query.status = req.query.status;
      }
    }

    // ✅ Handle student filter
    if (req.query.student) {
      query.student = req.query.student;
    }

    console.log("🔍 Quiz attempts query:", query);

    // ✅ FIXED: Authorization check with proper error handling
    try {
      if (req.user.role === 'teacher') {
        // Teachers can only see attempts for their quizzes
        if (query.quiz) {
          const quiz = await Quiz.findById(query.quiz).populate('course', 'instructor assistantInstructors');
          if (!quiz) {
            return res.status(404).json({
              success: false,
              message: 'Quiz not found',
            });
          }

          const isInstructor = quiz.course.instructor.toString() === req.user._id.toString();
          const isAssistant = quiz.course.assistantInstructors && quiz.course.assistantInstructors.includes(req.user._id);

          if (!isInstructor && !isAssistant) {
            return res.status(403).json({
              success: false,
              message: 'Not authorized to view these quiz attempts',
            });
          }
        } else {
          // ✅ FIXED: Safer teacher course filtering
          try {
            const teacherCourses = await Course.find({
              $or: [
                { instructor: req.user._id },
                { assistantInstructors: req.user._id }
              ]
            }).select('_id');
            
            const courseIds = teacherCourses.map(c => c._id);
            
            if (courseIds.length === 0) {
              // Teacher has no courses
              return res.json({
                success: true,
                data: {
                  attempts: [],
                  pagination: { page, limit, total: 0, pages: 0 },
                },
              });
            }
            
            const teacherQuizzes = await Quiz.find({
              course: { $in: courseIds }
            }).select('_id');
            
            const quizIds = teacherQuizzes.map(q => q._id);
            
            if (quizIds.length === 0) {
              // Teacher has no quizzes
              return res.json({
                success: true,
                data: {
                  attempts: [],
                  pagination: { page, limit, total: 0, pages: 0 },
                },
              });
            }
            
            query.quiz = { $in: quizIds };
          } catch (courseError) {
            console.error("Error fetching teacher courses:", courseError);
            return res.status(500).json({
              success: false,
              message: 'Error checking teacher authorization',
            });
          }
        }
      } else if (req.user.role === 'student') {
        // Students can only see their own attempts
        query.student = req.user._id;
      }
      // Admins and principals can see all
    } catch (authError) {
      console.error("Authorization error:", authError);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }

    const attempts = await QuizAttempt.find(query)
      .populate({
        path: 'quiz',
        select: 'title course duration totalPoints passingScore',
        populate: {
          path: 'course',
          select: 'title subject'
        }
      })
      .populate('student', 'name email studentId')
      .populate('gradedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuizAttempt.countDocuments(query);

    console.log("✅ Found quiz attempts:", attempts.length);

    // ✅ Calculate summary statistics
    const submittedAttempts = attempts.filter(a => 
      ['submitted', 'auto_submitted'].includes(a.status)
    );
    
    const summary = {
      totalAttempts: total,
      submittedAttempts: submittedAttempts.length,
      averageScore: submittedAttempts.length > 0 
        ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / submittedAttempts.length)
        : 0,
      needsManualGrading: submittedAttempts.filter(a => a.needsManualGrading).length,
    };

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
        summary,
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

    const isCreator = attempt.quiz.creator.toString() === req.user._id.toString();
    const isInstructor = attempt.quiz.course.instructor.toString() === req.user._id.toString();
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
            attempt.responses[responseIndex].isCorrect = responseUpdate.isCorrect;
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
