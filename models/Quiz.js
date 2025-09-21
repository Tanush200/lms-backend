const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: [200, "Quiz title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [2000, "Instructions cannot exceed 2000 characters"],
    },

    course: {
      type: mongoose.Schema.ObjectId,
      ref: "Course",
      required: [true, "Quiz must belong to a course"],
    },
    creator: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Quiz must have a creator"],
    },


    type: {
      type: String,
      enum: ["quiz", "test", "exam", "assignment"],
      default: "quiz",
    },
    category: {
      type: String,
      enum: ["practice", "graded", "final", "midterm"],
      default: "practice",
    },


    duration: {
      type: Number,
      required: [true, "Quiz duration is required"],
      min: [1, "Duration must be at least 1 minute"],
    },
    startTime: {
      type: Date,
      required: [true, "Quiz start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "Quiz end time is required"],
    },

    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, "Maximum attempts must be at least 1"],
    },
    allowRetry: {
      type: Boolean,
      default: false,
    },
    retryDelay: {
      type: Number,
      default: 0,
    },

    questionsPerPage: {
      type: Number,
      default: 1,
      min: [1, "Must show at least 1 question per page"],
    },
    showResults: {
      type: String,
      enum: ["immediately", "after_end", "manual", "never"],
      default: "after_end",
    },
    showCorrectAnswers: {
      type: Boolean,
      default: false,
    },
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    randomizeOptions: {
      type: Boolean,
      default: false,
    },


    totalPoints: {
      type: Number,
      default: 0,
    },
    passingScore: {
      type: Number,
      default: 60,
    },
    gradingType: {
      type: String,
      enum: ["points", "percentage", "letter"],
      default: "percentage",
    },

    questions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Question",
      },
    ],


    status: {
      type: String,
      enum: ["draft", "published", "active", "ended", "archived"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },


    stats: {
      totalAttempts: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      highestScore: {
        type: Number,
        default: 0,
      },
      lowestScore: {
        type: Number,
        default: 0,
      },
      passRate: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


quizSchema.index({ course: 1, status: 1 });
quizSchema.index({ creator: 1 });
quizSchema.index({ startTime: 1, endTime: 1 });
quizSchema.index({ title: "text", description: "text" });
quizSchema.index({ course: 1, creator: 1 });
quizSchema.index({ status: 1, startTime: 1, endTime: 1 });
quizSchema.index({ creator: 1, createdAt: -1 });
quizSchema.index({ course: 1, type: 1, status: 1 });


quizSchema.virtual("isAvailable").get(function () {
  const now = new Date();
  return (
    this.status === "published" && now >= this.startTime && now <= this.endTime
  );
});

quizSchema.virtual("timeRemaining").get(function () {
  const now = new Date();
  if (now < this.startTime) {
    return Math.ceil((this.startTime - now) / (1000 * 60)); 
  } else if (now <= this.endTime) {
    return Math.ceil((this.endTime - now) / (1000 * 60)); 
  }
  return 0;
});

quizSchema.virtual("questionCount").get(function () {
  return this.questions.length;
});

quizSchema.pre("save", function (next) {
  this.updatedAt = Date.now();


  if (this.endTime <= this.startTime) {
    return next(new Error("End time must be after start time"));
  }


  if (this.duration > 1440) {
    return next(new Error("Quiz duration cannot exceed 24 hours"));
  }


  if (this.passingScore < 0 || this.passingScore > 100) {
    return next(new Error("Passing score must be between 0 and 100"));
  }


  if (this.maxAttempts > 50) {
    return next(new Error("Maximum attempts cannot exceed 50"));
  }


  if (this.questionsPerPage > 20) {
    return next(new Error("Questions per page cannot exceed 20"));
  }


  if (this.retryDelay < 0) {
    return next(new Error("Retry delay cannot be negative"));
  }

  next();
});



quizSchema.methods.canAttempt = function (user, attemptCount = 0) {
  const now = new Date();


  if (this.status !== "published") {
    return { canAttempt: false, reason: "Quiz is not published" };
  }


  if (now < this.startTime) {
    return { canAttempt: false, reason: "Quiz has not started yet" };
  }

  if (now > this.endTime) {
    return { canAttempt: false, reason: "Quiz has ended" };
  }


  if (attemptCount >= this.maxAttempts) {
    return { canAttempt: false, reason: "Maximum attempts reached" };
  }

  return { canAttempt: true };
};


quizSchema.methods.calculateTotalPoints = async function () {
  try {
    if (!this.questions || !Array.isArray(this.questions)) {
      this.totalPoints = 0;
      return this.totalPoints;
    }

    if (this.questions.length === 0) {
      this.totalPoints = 0;
      return this.totalPoints;
    }

    const firstQuestion = this.questions[0];
    const needsPopulation =
      firstQuestion &&
      (typeof firstQuestion === "string" ||
        (firstQuestion._id && !firstQuestion.points));

    if (needsPopulation) {
      await this.populate("questions");
    }


    this.totalPoints = this.questions.reduce((total, question) => {
      let points = 0;
      if (question.points !== undefined) {
        points = question.points;
      } else if (question._doc && question._doc.points !== undefined) {
        points = question._doc.points;
      }
      return total + (points || 0);
    }, 0);

    return this.totalPoints;
  } catch (error) {
    console.error("Error calculating total points:", error);
    this.totalPoints = 0;
    return this.totalPoints;
  }
};


quizSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  return (
    this.status === "published" && now >= this.startTime && now <= this.endTime
  );
};

quizSchema.statics.findAvailable = function (courseId = null) {
  const now = new Date();
  const query = {
    status: "published",
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  if (courseId) {
    query.course = courseId;
  }

  return this.find(query)
    .populate("course", "title")
    .populate("creator", "name");
};

quizSchema.statics.findByCourse = function (courseId) {
  return this.find({ course: courseId })
    .populate("creator", "name email")
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model("Quiz", quizSchema);
