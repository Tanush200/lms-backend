const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      maxlength: [2000, "Question cannot exceed 2000 characters"],
    },
    type: {
      type: String,
      enum: [
        "mcq",
        "true_false",
        "short_answer",
        "essay",
        "coding",
        "fill_blank",
      ],
      required: [true, "Question type is required"],
    },

    description: {
      type: String,
      trim: true,
    },
    image: {
      url: String,
      public_id: String,
    },


    options: [
      {
        text: {
          type: String,
          required: true,
        },
        image: {
          url: String,
          public_id: String,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],


    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
    },


    explanation: {
      type: String,
      trim: true,
      maxlength: [1000, "Explanation cannot exceed 1000 characters"],
    },


    points: {
      type: Number,
      default: 1,
      min: [0, "Points cannot be negative"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },


    timeLimit: {
      type: Number,
      default: null,
    },
    allowPartialCredit: {
      type: Boolean,
      default: false,
    },

    codingLanguage: {
      type: String,
      enum: ["javascript", "python", "java", "cpp", "c"],
      default: null,
    },
    starterCode: {
      type: String,
      default: "",
    },
    testCases: [
      {
        input: String,
        expectedOutput: String,
        isHidden: {
          type: Boolean,
          default: false,
        },
        points: {
          type: Number,
          default: 1,
        },
      },
    ],


    tags: [String],
    category: String,
    subject: String,


    creator: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Question must have a creator"],
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: "Course",
    },

    stats: {
      timesUsed: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      correctAttempts: {
        type: Number,
        default: 0,
      },
      totalAttempts: {
        type: Number,
        default: 0,
      },
    },


    isActive: {
      type: Boolean,
      default: true,
    },


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


questionSchema.index({ creator: 1 });
questionSchema.index({ course: 1 });
questionSchema.index({ type: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ question: "text" });


questionSchema.virtual("correctAnswerCount").get(function () {
  if (this.type === "mcq") {
    if (this.options && Array.isArray(this.options)) {
      return this.options.filter((option) => option && option.isCorrect).length;
    }
    return 0; 
  }
  return 1;
});

questionSchema.virtual("successRate").get(function () {
  if (!this.stats || typeof this.stats !== "object") {
    return 0;
  }
  if (this.stats.totalAttempts === 0) {
    return 0;
  }
  return Math.round(
    (this.stats.correctAttempts / this.stats.totalAttempts) * 100
  );
});

questionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();


  if (this.type === "mcq") {
    if (!this.options || this.options.length < 2) {
      return next(new Error("MCQ questions must have at least 2 options"));
    }

    const correctOptions = this.options.filter((option) => option.isCorrect);
    if (correctOptions.length === 0) {
      return next(
        new Error("MCQ questions must have at least one correct option")
      );
    }


    this.correctAnswer = this.options.findIndex((option) => option.isCorrect);
  }


  if (this.type === "true_false") {
    if (typeof this.correctAnswer !== "boolean") {
      return next(
        new Error("True/False questions must have a boolean correct answer")
      );
    }
  }


  if (this.type === "coding") {
    if (!this.codingLanguage) {
      return next(
        new Error("Coding questions must specify a programming language")
      );
    }
    if (!this.testCases || this.testCases.length === 0) {
      return next(
        new Error("Coding questions must have at least one test case")
      );
    }
  }

  next();
});


questionSchema.methods.checkAnswer = function (studentAnswer) {
  let isCorrect = false;
  let score = 0;
  let feedback = "";

  switch (this.type) {
    case "mcq":
      isCorrect = parseInt(studentAnswer) === this.correctAnswer;
      score = isCorrect ? this.points : 0;
      feedback = isCorrect
        ? "Correct!"
        : `Incorrect. The correct answer is: ${
            this.options[this.correctAnswer].text
          }`;
      break;

    case "true_false":
      isCorrect = studentAnswer === this.correctAnswer;
      score = isCorrect ? this.points : 0;
      feedback = isCorrect
        ? "Correct!"
        : `Incorrect. The correct answer is: ${this.correctAnswer}`;
      break;

    case "short_answer":
      const correctAnswers = Array.isArray(this.correctAnswer)
        ? this.correctAnswer
        : [this.correctAnswer];
      isCorrect = correctAnswers.some(
        (answer) =>
          answer.toLowerCase().trim() === studentAnswer.toLowerCase().trim()
      );
      score = isCorrect ? this.points : 0;
      feedback = isCorrect
        ? "Correct!"
        : "Please review your answer with the instructor";
      break;

    case "essay":
      isCorrect = null;
      score = 0;
      feedback = "This answer requires manual grading";
      break;

    case "coding":

      isCorrect = null;
      score = 0;
      feedback = "Code execution in progress...";
      break;

    default:
      feedback = "Unknown question type";
  }

  return {
    isCorrect,
    score,
    feedback,
    explanation: this.explanation,
  };
};

questionSchema.methods.updateStats = function (isCorrect) {
  this.stats.totalAttempts += 1;
  if (isCorrect) {
    this.stats.correctAttempts += 1;
  }
  this.stats.timesUsed += 1;


  this.stats.averageScore =
    (this.stats.correctAttempts / this.stats.totalAttempts) * 100;
};


questionSchema.statics.findByType = function (type, courseId = null) {
  const query = { type, isActive: true };
  if (courseId) query.course = courseId;
  return this.find(query);
};

questionSchema.statics.findByDifficulty = function (
  difficulty,
  courseId = null
) {
  const query = { difficulty, isActive: true };
  if (courseId) query.course = courseId;
  return this.find(query);
};

questionSchema.statics.getQuestionBank = function (filters = {}) {
  const query = { isActive: true, ...filters };
  return this.find(query)
    .populate("creator", "name")
    .populate("course", "title")
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model("Question", questionSchema);
