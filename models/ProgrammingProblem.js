const mongoose = require("mongoose");

const programmingProblemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Problem title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Problem description is required"],
      maxlength: [10000, "Description cannot exceed 10,000 characters"],
    },
    problemStatement: {
      type: String,
      required: [true, "Problem statement is required"],
      maxlength: [20000, "Problem statement cannot exceed 20,000 characters"],
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: [true, "Difficulty level is required"],
    },
    category: {
      type: String,
      enum: [
        "array",
        "string",
        "linked-list",
        "tree",
        "graph",
        "dynamic-programming",
        "greedy",
        "backtracking",
        "sorting",
        "searching",
        "math",
        "recursion",
        "other",
      ],
      required: [true, "Problem category is required"],
    },
    tags: [String],

    course: {
      type: mongoose.Schema.ObjectId,
      ref: "Course",
    },
    creator: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Problem must have a creator"],
    },


    allowedLanguages: [
      {
        language: {
          type: String,
          enum: ["javascript", "python", "java", "cpp", "c"],
          required: true,
        },
        judge0Id: {
          type: Number,
          required: true,
        },
        template: String,
      },
    ],


    timeLimit: {
      type: Number,
      default: 2,
      min: [1, "Time limit must be at least 1 second"],
      max: [10, "Time limit cannot exceed 10 seconds"],
    },
    memoryLimit: {
      type: Number,
      default: 128000,
      min: [16000, "Memory limit must be at least 16MB"],
      max: [512000, "Memory limit cannot exceed 512MB"],
    },

    testCases: [
      {
        input: {
          type: String,
          required: true,
        },
        expectedOutput: {
          type: String,
          required: true,
        },
        isHidden: {
          type: Boolean,
          default: false,
        },
        points: {
          type: Number,
          default: 1,
          min: 0,
        },
        explanation: String,
      },
    ],


    examples: [
      {
        input: {
          type: String,
          required: true,
        },
        output: {
          type: String,
          required: true,
        },
        explanation: String,
      },
    ],

    constraints: [String],
    inputFormat: {
      type: String,
      required: true,
    },
    outputFormat: {
      type: String,
      required: true,
    },
    notes: String,


    hints: [
      {
        level: {
          type: Number,
          min: 1,
          max: 5,
        },
        content: String,
        penaltyPercentage: {
          type: Number,
          default: 10,
          min: 0,
          max: 50,
        },
      },
    ],

    maxScore: {
      type: Number,
      default: 100,
    },
    partialCredit: {
      type: Boolean,
      default: true,
    },


    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },


    stats: {
      totalSubmissions: { type: Number, default: 0 },
      acceptedSubmissions: { type: Number, default: 0 },
      averageAttempts: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      languageStats: {
        javascript: {
          submissions: { type: Number, default: 0 },
          accepted: { type: Number, default: 0 },
        },
        python: {
          submissions: { type: Number, default: 0 },
          accepted: { type: Number, default: 0 },
        },
        java: {
          submissions: { type: Number, default: 0 },
          accepted: { type: Number, default: 0 },
        },
        cpp: {
          submissions: { type: Number, default: 0 },
          accepted: { type: Number, default: 0 },
        },
        c: {
          submissions: { type: Number, default: 0 },
          accepted: { type: Number, default: 0 },
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);


programmingProblemSchema.index({ creator: 1, status: 1 });
programmingProblemSchema.index({ course: 1, difficulty: 1 });
programmingProblemSchema.index({ category: 1, difficulty: 1 });
programmingProblemSchema.index({ tags: 1 });
programmingProblemSchema.index({ title: "text", description: "text" });


const defaultLanguages = [
  {
    language: "javascript",
    judge0Id: 63,
    template:
      "// Your solution here\nfunction solve() {\n    // Write your code\n}\n\nsolve();",
  },
  {
    language: "python",
    judge0Id: 71,
    template:
      "# Your solution here\ndef solve():\n    # Write your code\n    pass\n\nsolve()",
  },
  {
    language: "java",
    judge0Id: 62,
    template:
      "public class Solution {\n    public static void main(String[] args) {\n        // Your solution here\n    }\n}",
  },
  {
    language: "cpp",
    judge0Id: 54,
    template:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    return 0;\n}",
  },
  {
    language: "c",
    judge0Id: 50,
    template:
      "#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
  },
];


programmingProblemSchema.pre("save", function (next) {
  if (this.testCases.length === 0) {
    return next(new Error("Problem must have at least one test case"));
  }

  if (this.allowedLanguages.length === 0) {
    this.allowedLanguages = defaultLanguages.slice(0, 2);
  }

  this.maxScore = this.testCases.reduce(
    (total, tc) => total + (tc.points || 1),
    0
  );

  next();
});

programmingProblemSchema.virtual("acceptanceRate").get(function () {
  if (!this.stats || this.stats.totalSubmissions === 0) return 0;
  return Math.round(
    (this.stats.acceptedSubmissions / this.stats.totalSubmissions) * 100
  );
});

programmingProblemSchema.virtual("totalTestCases").get(function () {
  if (!this.testCases || !Array.isArray(this.testCases)) return 0;
  return this.testCases.length;
});

programmingProblemSchema.virtual("publicTestCases").get(function () {
  if (!this.testCases || !Array.isArray(this.testCases)) return 0;
  return this.testCases.filter((tc) => !tc.isHidden).length;
});
programmingProblemSchema.virtual("hiddenTestCases").get(function () {
  if (!this.testCases || !Array.isArray(this.testCases)) {
    return 0;
  }
  return this.testCases.filter((tc) => tc && tc.isHidden).length;
});


programmingProblemSchema.methods.updateStats = function (submission) {
  this.stats.totalSubmissions += 1;

  if (submission.overallStatus === "accepted") {
    this.stats.acceptedSubmissions += 1;
  }


  const lang = submission.language;
  if (this.stats.languageStats[lang]) {
    this.stats.languageStats[lang].submissions += 1;
    if (submission.overallStatus === "accepted") {
      this.stats.languageStats[lang].accepted += 1;
    }
  }
};

programmingProblemSchema.methods.getTemplate = function (language) {
  const langConfig = this.allowedLanguages.find((l) => l.language === language);
  return (
    langConfig?.template ||
    defaultLanguages.find((l) => l.language === language)?.template ||
    ""
  );
};

programmingProblemSchema.methods.getJudge0Id = function (language) {
  const langConfig = this.allowedLanguages.find((l) => l.language === language);
  return (
    langConfig?.judge0Id ||
    defaultLanguages.find((l) => l.language === language)?.judge0Id
  );
};

programmingProblemSchema.statics.findPublished = function (filters = {}) {
  return this.find({ ...filters, status: "published" })
    .populate("creator", "name")
    .populate("course", "title")
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model("ProgrammingProblem", programmingProblemSchema);
