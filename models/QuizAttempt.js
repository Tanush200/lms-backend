
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

quizAttemptSchema.methods.calculateScore = async function () {
  await this.populate("responses.question");

  let totalScore = 0;
  let maxScore = 0;
  let needsManualGrading = false;

  for (let response of this.responses) {
    if (response.question) {
      maxScore += response.question.points;

      if (response.answer !== null && response.answer !== "") {
        const result = response.question.checkAnswer(response.answer);

        response.isCorrect = result.isCorrect;
        response.score = result.score;
        response.feedback = result.feedback;

        totalScore += result.score;


        if (result.isCorrect === null) {
          needsManualGrading = true;
        }

        if (result.isCorrect !== null) {
          response.question.updateStats(result.isCorrect);
          await response.question.save();
        }
      }
    }
  }

  this.totalScore = totalScore;
  this.maxScore = maxScore;
  this.percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  this.needsManualGrading = needsManualGrading;
  this.isGraded = !needsManualGrading;

  await this.populate("quiz");
  if (this.quiz && this.quiz.passingScore) {
    this.passed = this.percentage >= this.quiz.passingScore;
  }

  return {
    totalScore: this.totalScore,
    maxScore: this.maxScore,
    percentage: this.percentage,
    passed: this.passed,
    needsManualGrading: this.needsManualGrading,
  };
};

quizAttemptSchema.methods.submit = async function (autoSubmit = false) {
  if (this.status !== "in_progress") {
    throw new Error("Only in-progress attempts can be submitted");
  }

  this.submittedAt = new Date();
  this.status = autoSubmit ? "auto_submitted" : "submitted";
  this.timeSpent = Math.ceil((this.submittedAt - this.startedAt) / 1000);


  await this.calculateScore();

  await this.populate("quiz");
  if (this.quiz) {
    this.quiz.stats.totalAttempts += 1;

    const allAttempts = await this.constructor.find({
      quiz: this.quiz._id,
      status: { $in: ["submitted", "auto_submitted"] },
    });
    const scores = allAttempts.map((attempt) => attempt.percentage);

    this.quiz.stats.averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    this.quiz.stats.highestScore = Math.max(...scores);
    this.quiz.stats.lowestScore = Math.min(...scores);
    this.quiz.stats.passRate =
      (allAttempts.filter((attempt) => attempt.passed).length /
        allAttempts.length) *
      100;

    await this.quiz.save();
  }

  await this.save();
  return this;
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
