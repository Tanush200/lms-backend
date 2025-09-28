const mongoose = require("mongoose");

const codeSubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Submission must have a user"],
    },
    problem: {
      type: mongoose.Schema.ObjectId,
      ref: "ProgrammingProblem",
      required: [true, "Submission must be for a problem"],
    },

    language: {
      type: String,
      enum: ["javascript", "python", "java", "cpp", "c"],
      required: [true, "Programming language is required"],
    },
    code: {
      type: String,
      required: [true, "Code is required"],
      maxlength: [50000, "Code cannot exceed 50,000 characters"],
    },


    judge0Token: String,
    judge0Results: [
      {
        testCaseIndex: Number,
        token: String,
        status: {
          id: Number,
          description: String,
        },
        time: String,
        memory: Number,
        stdout: String,
        stderr: String,
        compileOutput: String,
      },
    ],

    testResults: [
      {
        testCaseId: {
          type: mongoose.Schema.ObjectId,
          required: true,
        },
        status: {
          type: String,
          enum: ["passed", "failed", "error", "timeout"],
          required: true,
        },
        input: String,
        expectedOutput: String,
        actualOutput: String,
        executionTime: Number,
        memoryUsed: Number,
        errorMessage: String,
      },
    ],

    status: {
      type: String,
      enum: [
        "pending", // Being processed
        "running", // Currently executing
        "completed", // Execution finished
        "accepted", // All test cases passed
        "wrong_answer", // Some test cases failed
        "compile_error", // Compilation failed
        "runtime_error", // Runtime error
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "internal_error",
      ],
      default: "pending",
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    passedTests: {
      type: Number,
      default: 0,
    },
    totalTests: {
      type: Number,
      default: 0,
    },


    totalExecutionTime: Number,
    maxMemoryUsed: Number,
    averageExecutionTime: Number,

    submissionNumber: {
      type: Number,
      default: 1,
    },
    hintsUsed: [
      {
        hintLevel: Number,
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],


    ipAddress: String,
    userAgent: String,


    submittedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

codeSubmissionSchema.index({ user: 1, problem: 1, createdAt: -1 });
codeSubmissionSchema.index({ problem: 1, status: 1 });
codeSubmissionSchema.index({ status: 1, submittedAt: -1 });
codeSubmissionSchema.index({ user: 1, status: 1 });


codeSubmissionSchema.virtual("successRate").get(function () {
  if (this.totalTests === 0) return 0;
  return Math.round((this.passedTests / this.totalTests) * 100);
});

codeSubmissionSchema.virtual("isCompleted").get(function () {
  return [
    "completed",
    "accepted",
    "wrong_answer",
    "compile_error",
    "runtime_error",
    "time_limit_exceeded",
    "memory_limit_exceeded",
    "internal_error",
  ].includes(this.status);
});

codeSubmissionSchema.virtual("duration").get(function () {
  if (this.completedAt && this.submittedAt) {
    return Math.ceil((this.completedAt - this.submittedAt) / 1000); // Duration in seconds
  }
  return 0;
});


codeSubmissionSchema.pre("save", function (next) {
  if (this.totalTests > 0) {
    this.score = Math.round((this.passedTests / this.totalTests) * 100);
  }


  if (this.testResults && this.testResults.length > 0) {
    const validTimes = this.testResults
      .filter((result) => result.executionTime > 0)
      .map((result) => result.executionTime);

    if (validTimes.length > 0) {
      this.averageExecutionTime =
        validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
    }
  }

  next();
});


codeSubmissionSchema.methods.updateResults = function (
  judge0Results,
  testCases
) {
  this.judge0Results = judge0Results;

  // Helper function to normalize output for comparison
  const normalizeOutput = (output) => {
    if (!output) return "";
    return output
      .trim()
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Handle old Mac line endings
      .replace(/\n+/g, '\n')   // Collapse multiple newlines
      .trim();
  };

  this.testResults = judge0Results.map((result, index) => {
    const testCase = testCases[index];
    
    // Safely decode base64 output
    let actualOutput = "";
    let errorMessage = "";
    
    try {
      actualOutput = result.stdout
        ? Buffer.from(result.stdout, "base64").toString()
        : "";
    } catch (e) {
      console.error(`Error decoding stdout for test ${index}:`, e);
      actualOutput = "";
    }
    
    try {
      errorMessage = result.stderr
        ? Buffer.from(result.stderr, "base64").toString()
        : "";
    } catch (e) {
      console.error(`Error decoding stderr for test ${index}:`, e);
      errorMessage = "";
    }

    const expectedOutput = testCase.expectedOutput;
    
    // Determine status based on Judge0 status ID
    let status = "failed";
    
    switch (result.status.id) {
      case 3: // Accepted - execution completed successfully
        // Check if output matches (Judge0 already did this check)
        const normalizedActual = normalizeOutput(actualOutput);
        const normalizedExpected = normalizeOutput(expectedOutput);
        status = normalizedActual === normalizedExpected ? "passed" : "failed";
        break;
      case 4: // Wrong Answer - Judge0 determined output doesn't match
        status = "failed";
        break;
      case 5: // Time Limit Exceeded
        status = "timeout";
        break;
      case 6: // Compilation Error
        status = "error";
        break;
      case 7: // Runtime Error
      case 8: // Runtime Error (NZEC)
      case 9: // Runtime Error (Other)
      case 10: // Runtime Error (SIGSEGV)
      case 11: // Runtime Error (SIGFPE)
      case 12: // Runtime Error (SIGABRT)
        status = "error";
        break;
      default:
        status = "error";
    }

    console.log(`Test ${index}: Judge0 Status ${result.status.id} (${result.status.description}), Our Status: ${status}`);
    console.log(`Expected: "${normalizeOutput(expectedOutput)}"`);
    console.log(`Actual: "${normalizeOutput(actualOutput)}"`);
    console.log(`Match: ${normalizeOutput(actualOutput) === normalizeOutput(expectedOutput)}`);

    return {
      testCaseId: testCase._id,
      status,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: actualOutput.trim(),
      executionTime: parseFloat(result.time) || 0,
      memoryUsed: parseInt(result.memory) || 0,
      errorMessage: errorMessage,
      judge0Status: result.status,
    };
  });


  this.passedTests = this.testResults.filter(
    (r) => r.status === "passed"
  ).length;
  this.totalTests = this.testResults.length;
  this.totalExecutionTime = this.testResults.reduce(
    (sum, r) => sum + (r.executionTime || 0),
    0
  );
  this.maxMemoryUsed = Math.max(
    ...this.testResults.map((r) => r.memoryUsed || 0)
  );


  const hasCompileError = judge0Results.some((r) => r.status.id === 6);
  const hasRuntimeError = judge0Results.some(
    (r) => r.status.id >= 7 && r.status.id <= 12
  );
  const hasTimeoutError = judge0Results.some((r) => r.status.id === 5);

  if (hasCompileError) {
    this.status = "compile_error";
  } else if (hasTimeoutError) {
    this.status = "time_limit_exceeded";
  } else if (hasRuntimeError) {
    this.status = "runtime_error";
  } else if (this.passedTests === this.totalTests) {
    this.status = "accepted";
  } else {
    this.status = "wrong_answer";
  }

  this.completedAt = new Date();
};


codeSubmissionSchema.statics.findUserSubmissions = function (
  userId,
  problemId = null
) {
  const query = { user: userId };
  if (problemId) query.problem = problemId;

  return this.find(query)
    .populate("problem", "title difficulty")
    .sort({ submittedAt: -1 });
};

codeSubmissionSchema.statics.getLeaderboard = function (problemId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        problem: new mongoose.Types.ObjectId(problemId),
        status: "accepted",
      },
    },
    { $sort: { score: -1, totalExecutionTime: 1 } },
    {
      $group: {
        _id: "$user",
        bestSubmission: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$bestSubmission" } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        user: "$userInfo.name",
        language: 1,
        score: 1,
        totalExecutionTime: 1,
        submittedAt: 1,
      },
    },
  ]);
};

module.exports = mongoose.model("CodeSubmission", codeSubmissionSchema);
