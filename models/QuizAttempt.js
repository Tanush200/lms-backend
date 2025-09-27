
const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.ObjectId,
      ref: "Quiz",
      required: [true, "Attempt must belong to a quiz"],
    },
    student: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Attempt must have a student"],
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },


    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: Date,
    timeSpent: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["in_progress", "submitted", "auto_submitted", "abandoned"],
      default: "in_progress",
    },

    responses: [
      {
        question: {
          type: mongoose.Schema.ObjectId,
          ref: "Question",
          required: true,
        },
        answer: mongoose.Schema.Types.Mixed,
        timeSpent: {
          type: Number,
          default: 0,
        },
        isCorrect: {
          type: Boolean,
          default: null,
        },
        score: {
          type: Number,
          default: 0,
        },
        feedback: String,
        answeredAt: {
          type: Date,
          default: Date.now,
        },
        isSkipped: {
          type: Boolean,
          default: false,
        },
      },
    ],

    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    grade: String,
    passed: {
      type: Boolean,
      default: false,
    },

    ipAddress: String,
    userAgent: String,
    browserInfo: {
      name: String,
      version: String,
      platform: String,
    },


    isGraded: {
      type: Boolean,
      default: false,
    },
    needsManualGrading: {
      type: Boolean,
      default: false,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,


    gradedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    gradedAt: Date,
    graderComments: String,


    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


quizAttemptSchema.index(
  { quiz: 1, student: 1, attemptNumber: 1 },
  { unique: true }
);
quizAttemptSchema.index({ quiz: 1, status: 1 });
quizAttemptSchema.index({ student: 1, status: 1 });
quizAttemptSchema.index({ submittedAt: -1 });


quizAttemptSchema.virtual("duration").get(function () {
  if (this.submittedAt && this.startedAt) {
    return Math.ceil((this.submittedAt - this.startedAt) / 1000 / 60); 
  }
  return 0;
});

quizAttemptSchema.virtual("questionsAnswered").get(function () {
  return this.responses.filter(
    (response) => response.answer !== null && response.answer !== ""
  ).length;
});

quizAttemptSchema.virtual("questionsCorrect").get(function () {
  return this.responses.filter(
    (response) => response.isCorrect === true
  ).length;
});

quizAttemptSchema.virtual("questionsIncorrect").get(function () {
  return this.responses.filter(
    (response) => response.isCorrect === false
  ).length;
});


quizAttemptSchema.pre("save", function (next) {
  this.updatedAt = Date.now();


  if (this.responses && this.responses.length > 0) {
    this.totalScore = this.responses.reduce(
      (total, response) => total + (response.score || 0),
      0
    );

    if (this.maxScore > 0) {
      this.percentage = Math.round((this.totalScore / this.maxScore) * 100);
    }
  }

  next();
});


quizAttemptSchema.methods.submitResponse = function (questionId, answer) {
  const responseIndex = this.responses.findIndex(
    (r) => r.question.toString() === questionId.toString()
  );

  const responseData = {
    question: questionId,
    answer: answer,
    answeredAt: new Date(),
  };

  if (responseIndex >= 0) {
    this.responses[responseIndex] = {
      ...this.responses[responseIndex],
      ...responseData,
    };
  } else {
    this.responses.push(responseData);
  }
};

// In your backend/models/QuizAttempt.js - IMPROVED calculateScore method

quizAttemptSchema.methods.calculateScore = async function () {
  try {
    await this.populate("responses.question");

    let totalScore = 0;
    let maxScore = 0;
    let needsManualGrading = false;
    const Question = require("./Question"); // ✅ Make sure to import Question model

    for (let response of this.responses) {
      if (response.question) {
        const questionPoints = response.question.points || 1;
        maxScore += questionPoints;

        if (response.answer !== null && response.answer !== "") {
          // ✅ FIXED: Handle different question types manually (since checkAnswer might not exist)
          let isCorrect = false;
          let score = 0;
          let feedback = '';

          switch (response.question.type) {
            case 'mcq':
              if (response.question.options) {
                if (Array.isArray(response.answer)) {
                  // Multiple correct answers
                  const correctOptions = response.question.options
                    .map((opt, idx) => opt.isCorrect ? idx : -1)
                    .filter(idx => idx !== -1);
                  
                  const studentAnswers = response.answer.sort();
                  const correctAnswers = correctOptions.sort();
                  
                  isCorrect = JSON.stringify(studentAnswers) === JSON.stringify(correctAnswers);
                } else {
                  // Single correct answer
                  const correctIndex = response.question.options.findIndex(opt => opt.isCorrect);
                  isCorrect = response.answer === correctIndex;
                }
                score = isCorrect ? questionPoints : 0;
              }
              break;

            case 'true_false':
              isCorrect = response.answer === response.question.correctAnswer;
              score = isCorrect ? questionPoints : 0;
              break;

            case 'short_answer':
              if (Array.isArray(response.question.correctAnswer)) {
                isCorrect = response.question.correctAnswer.some(correct => 
                  response.answer.toLowerCase().trim() === correct.toLowerCase().trim()
                );
              } else {
                isCorrect = response.answer.toLowerCase().trim() === 
                          response.question.correctAnswer.toLowerCase().trim();
              }
              score = isCorrect ? questionPoints : 0;
              break;

            case 'essay':
            case 'coding':
              // These need manual grading
              isCorrect = null; // Will be graded manually
              score = 0; // Will be set during manual grading
              needsManualGrading = true;
              break;

            default:
              isCorrect = false;
              score = 0;
          }

          response.isCorrect = isCorrect;
          response.score = score;
          response.feedback = feedback;

          totalScore += score;

          // ✅ Only auto-grade if we have a definitive result
          if (isCorrect !== null && response.question.updateStats) {
            try {
              response.question.updateStats(isCorrect);
              await response.question.save();
            } catch (statError) {
              console.warn("Failed to update question stats:", statError);
            }
          }
        }
      }
    }

    this.totalScore = totalScore;
    this.maxScore = maxScore || 1; // ✅ Prevent division by zero
    this.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    this.needsManualGrading = needsManualGrading;
    this.isGraded = !needsManualGrading;

    await this.populate("quiz");
    if (this.quiz && this.quiz.passingScore) {
      this.passed = this.percentage >= this.quiz.passingScore;
    }

    console.log("🎯 Quiz graded:", {
      totalScore: this.totalScore,
      maxScore: this.maxScore,
      percentage: this.percentage,
      passed: this.passed,
      needsManualGrading: this.needsManualGrading,
    });

    return {
      totalScore: this.totalScore,
      maxScore: this.maxScore,
      percentage: this.percentage,
      passed: this.passed,
      needsManualGrading: this.needsManualGrading,
    };
  } catch (error) {
    console.error("❌ Error calculating score:", error);
    // Set safe defaults
    this.totalScore = 0;
    this.maxScore = 1;
    this.percentage = 0;
    this.passed = false;
    this.needsManualGrading = false;
    throw error;
  }
};


// In your backend/models/QuizAttempt.js - FIXED submit method

quizAttemptSchema.methods.submit = async function (isAutoSubmit = false) {
  try {
    // Set basic submission data
    this.status = isAutoSubmit ? 'auto_submitted' : 'submitted';
    this.submittedAt = new Date();
    
    // Calculate time spent if not already set
    if (!this.timeSpent) {
      this.timeSpent = Math.floor((this.submittedAt - this.startedAt) / 1000);
    }

    // ✅ FIX: Use calculateScore instead of grade (which doesn't exist)
    await this.calculateScore();

    // Update quiz statistics
    const Quiz = require("./Quiz"); // ✅ Make sure to import Quiz model
    const quiz = await Quiz.findById(this.quiz);
    
    if (quiz) {
      // ✅ Get all completed attempts for this quiz
      const allAttempts = await this.constructor.find({
        quiz: this.quiz,
        status: { $in: ['submitted', 'auto_submitted'] }
      });

      // ✅ FIXED: Safe statistics calculation with NaN checks
      const totalAttempts = allAttempts.length;
      
      if (totalAttempts > 0) {
        // Calculate average score safely
        const totalScore = allAttempts.reduce((sum, attempt) => {
          const score = attempt.percentage || 0;
          return sum + (isNaN(score) ? 0 : score);
        }, 0);
        
        const averageScore = totalScore / totalAttempts;
        
        // Calculate pass rate safely
        const passedAttempts = allAttempts.filter(attempt => 
          attempt.passed === true
        ).length;
        
        const passRate = (passedAttempts / totalAttempts) * 100;
        
        // Calculate highest and lowest scores safely
        const scores = allAttempts.map(attempt => attempt.percentage || 0).filter(score => !isNaN(score));
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        // ✅ CRITICAL FIX: Only set if values are valid numbers
        quiz.stats.totalAttempts = totalAttempts;
        quiz.stats.averageScore = isNaN(averageScore) ? 0 : Math.round(averageScore);
        quiz.stats.passRate = isNaN(passRate) ? 0 : Math.round(passRate);
        quiz.stats.highestScore = isNaN(highestScore) ? 0 : highestScore;
        quiz.stats.lowestScore = isNaN(lowestScore) ? 0 : lowestScore;
        
        console.log("📊 Updated quiz stats:", {
          totalAttempts,
          averageScore: quiz.stats.averageScore,
          passRate: quiz.stats.passRate,
          highestScore,
          lowestScore
        });
      } else {
        // ✅ Safe defaults when no attempts
        quiz.stats.totalAttempts = 0;
        quiz.stats.averageScore = 0;
        quiz.stats.passRate = 0;
        quiz.stats.highestScore = 0;
        quiz.stats.lowestScore = 0;
      }

      // Save quiz with updated stats
      await quiz.save();
    }

    // Save the attempt
    await this.save();
    
    console.log("✅ Quiz attempt submitted successfully:", this._id);
    return this;
    
  } catch (error) {
    console.error("❌ Error submitting quiz attempt:", error);
    throw error;
  }
};



quizAttemptSchema.statics.findByQuiz = function (quizId, options = {}) {
  const query = { quiz: quizId };
  if (options.status) query.status = options.status;

  return this.find(query)
    .populate("student", "name email studentId")
    .sort({ submittedAt: -1, startedAt: -1 });
};

quizAttemptSchema.statics.findByStudent = function (studentId, options = {}) {
  const query = { student: studentId };
  if (options.status) query.status = options.status;

  return this.find(query)
    .populate("quiz", "title course duration")
    .populate("quiz.course", "title")
    .sort({ startedAt: -1 });
};

quizAttemptSchema.statics.getStudentAttemptCount = function (
  quizId,
  studentId
) {
  return this.countDocuments({
    quiz: quizId,
    student: studentId,
    status: { $in: ["submitted", "auto_submitted"] },
  });
};

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
