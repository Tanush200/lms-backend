const CodeSubmission = require("../models/CodeSubmission");
const ProgrammingProblem = require("../models/ProgrammingProblem");
const judge0Service = require("../services/judge0Service");

// @desc    Submit code for execution
// @route   POST /api/programming-problems/:problemId/submit
// @access  Private (Students)
const submitCode = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, language } = req.body;
    const userId = req.user._id;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: "Code and language are required",
      });
    }


    const problem = await ProgrammingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }

    if (problem.status !== "published") {
      return res.status(403).json({
        success: false,
        message: "Problem is not available for submission",
      });
    }

    const languageSupported = problem.allowedLanguages.some(
      (lang) => lang.language === language
    );
    if (!languageSupported) {
      return res.status(400).json({
        success: false,
        message: `Language ${language} is not supported for this problem`,
      });
    }


    const submissionCount = await CodeSubmission.countDocuments({
      user: userId,
      problem: problemId,
    });

    console.log(
      `📝 User ${userId} submitting code for problem ${problemId} (attempt #${
        submissionCount + 1
      })`
    );


    const submission = await judge0Service.executeCode({
      code,
      language,
      problemId,
      userId,
      submissionNumber: submissionCount + 1,
    });

    res.status(201).json({
      success: true,
      message: "Code submitted for execution",
      data: {
        submission: {
          _id: submission._id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          language: submission.language,
          submissionNumber: submission.submissionNumber,
        },
      },
    });
  } catch (error) {
    console.error("Submit code error:", error);
    res.status(500).json({
      success: false,
      message: "Could not submit code",
      error: error.message,
    });
  }
};

// @desc    Test code with examples
// @route   POST /api/programming-problems/:problemId/test
// @access  Private (Students)
const testCode = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, language, exampleIndex = 0 } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: "Code and language are required",
      });
    }

    console.log(
      `🧪 Testing code for problem ${problemId}, example ${exampleIndex}`
    );

    const result = await judge0Service.testExample(
      code,
      language,
      problemId,
      exampleIndex
    );

    res.json({
      success: true,
      message: "Code test completed",
      data: { result },
    });
  } catch (error) {
    console.error("Test code error:", error);
    res.status(500).json({
      success: false,
      message: "Could not test code",
      error: error.message,
    });
  }
};



// @desc    Get submission details
// @route   GET /api/code-submissions/:submissionId
// @access  Private (Submission owner or Teacher/Admin)
const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    console.log("📄 Getting submission details for:", submissionId);
    console.log("👤 User:", req.user ? req.user._id : 'No user');

    const submission = await CodeSubmission.findById(submissionId)
      .populate("problem", "title difficulty testCases")
      .populate("user", "name email studentId");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // ✅ Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ✅ Check authorization with proper null checks
    const isOwner = submission.user && submission.user._id.toString() === req.user._id.toString();
    const isTeacher = req.user.role && ["admin", "principal", "teacher"].includes(req.user.role);

    if (!isOwner && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this submission",
      });
    }

    // ✅ Filter test results for students (hide hidden test cases)
    if (req.user.role === "student") {
      submission.testResults = submission.testResults.filter((result, index) => {
        const testCase = submission.problem.testCases[index];
        return testCase && !testCase.isHidden;
      });
    }

    console.log("✅ Submission details retrieved successfully");

    res.json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    console.error("❌ Get submission error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get submission",
      error: error.message,
    });
  }
};


// @desc    Get user submissions for a problem
// @route   GET /api/programming-problems/:problemId/submissions
// @access  Private (Student: own submissions, Teacher: all submissions)
const getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const problem = await ProgrammingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }


    let query = { problem: problemId };

    if (req.user.role === "student") {
      query.user = req.user._id;
    } else if (req.query.user) {
      query.user = req.query.user;
    }


    if (req.query.status) {
      query.status = req.query.status;
    }

  
    if (req.query.language) {
      query.language = req.query.language;
    }


    const submissions = await CodeSubmission.find(query)
      .populate("user", "name email studentId")
      .select("-code -judge0Results")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CodeSubmission.countDocuments(query);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get problem submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get submissions",
      error: error.message,
    });
  }
};

// @desc    Get user's all submissions
// @route   GET /api/users/:userId/submissions
// @access  Private (Own submissions or Teacher/Admin)
const getUserSubmissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;


    const isOwnSubmissions = userId === req.user._id.toString();
    const isTeacher = ["admin", "principal", "teacher"].includes(req.user.role);

    if (!isOwnSubmissions && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Access denied to these submissions",
      });
    }

    let query = { user: userId };

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.language) {
      query.language = req.query.language;
    }

    if (req.query.problem) {
      query.problem = req.query.problem;
    }


    const submissions = await CodeSubmission.find(query)
      .populate("problem", "title difficulty")
      .select("-code -judge0Results")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CodeSubmission.countDocuments(query);


    const stats = await CodeSubmission.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const userStats = {
      totalSubmissions: total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      acceptanceRate: stats.find((s) => s._id === "accepted")?.count || 0,
    };

    if (userStats.totalSubmissions > 0) {
      userStats.acceptanceRate = Math.round(
        (userStats.acceptanceRate / userStats.totalSubmissions) * 100
      );
    }

    res.json({
      success: true,
      data: {
        submissions,
        stats: userStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get user submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get user submissions",
      error: error.message,
    });
  }
};

// @desc    Get problem leaderboard
// @route   GET /api/programming-problems/:problemId/leaderboard
// @access  Public
const getProblemLeaderboard = async (req, res) => {
  try {
    const { problemId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const problem = await ProgrammingProblem.findById(problemId);
    if (!problem || problem.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }


    const leaderboard = await CodeSubmission.getLeaderboard(problemId, limit);

    res.json({
      success: true,
      data: {
        problem: {
          id: problem._id,
          title: problem.title,
          difficulty: problem.difficulty,
        },
        leaderboard,
      },
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get leaderboard",
      error: error.message,
    });
  }
};

// @desc    Get submission status (for polling)
// @route   GET /api/code-submissions/:submissionId/status
// @access  Private (Submission owner)
const getSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    console.log("📊 Getting submission status for:", submissionId);
    console.log("👤 User:", req.user ? req.user._id : 'No user');

    // Validate submission ID format
    if (!submissionId || !submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format",
      });
    }

    const submission = await CodeSubmission.findById(submissionId)
      .select("status passedTests totalTests score submittedAt completedAt user");

    if (!submission) {
      console.log("❌ Submission not found:", submissionId);
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check authorization
    const isOwner = submission.user.toString() === req.user._id.toString();
    const isTeacher = req.user.role && ["admin", "teacher", "principal"].includes(req.user.role);

    if (!isOwner && !isTeacher) {
      console.log("❌ Access denied for user:", req.user._id);
      return res.status(403).json({
        success: false,
        message: "Access denied to this submission",
      });
    }

    console.log("✅ Submission status retrieved successfully");

    res.json({
      success: true,
      data: {
        status: submission.status,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
        score: submission.score,
        isCompleted: submission.isCompleted,
        submittedAt: submission.submittedAt,
        completedAt: submission.completedAt,
      },
    });
  } catch (error) {
    console.error("❌ Get submission status error:", error);
    
    // Handle specific database errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Could not get submission status",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// @desc    Get code template for a problem
// @route   GET /api/programming-problems/:problemId/template/:language
// @access  Private
const getCodeTemplate = async (req, res) => {
  try {
    const { problemId, language } = req.params;

    const problem = await ProgrammingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }


    const languageSupported = problem.allowedLanguages.some(
      (lang) => lang.language === language
    );
    if (!languageSupported) {
      return res.status(400).json({
        success: false,
        message: `Language ${language} is not supported for this problem`,
      });
    }

    const template = problem.getTemplate(language);

    res.json({
      success: true,
      data: {
        language,
        template,
        judge0Id: problem.getJudge0Id(language),
      },
    });
  } catch (error) {
    console.error("Get template error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get code template",
      error: error.message,
    });
  }
};

module.exports = {
  submitCode,
  testCode,
  getSubmission,
  getProblemSubmissions,
  getUserSubmissions,
  getProblemLeaderboard,
  getSubmissionStatus,
  getCodeTemplate,
};
