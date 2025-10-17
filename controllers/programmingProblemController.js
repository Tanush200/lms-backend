const ProgrammingProblem = require("../models/ProgrammingProblem");
const Course = require("../models/Course");
const CodeSubmission = require("../models/CodeSubmission");
const mongoose = require("mongoose");

// @desc    Create new programming problem
// @route   POST /api/programming-problems
// @access  Private (Teacher/Admin/Principal)
const createProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      problemStatement,
      difficulty,
      category,
      tags,
      courseId,
      allowedLanguages,
      timeLimit,
      memoryLimit,
      testCases,
      examples,
      constraints,
      inputFormat,
      outputFormat,
      notes,
      hints,
    } = req.body;

    if (
      !title ||
      !description ||
      !problemStatement ||
      !difficulty ||
      !category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide title, description, problem statement, difficulty, and category",
      });
    }

    if (courseId) {
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
          message: "Not authorized to create problems for this course",
        });
      }
    }


    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one test case is required",
      });
    }


    const problemData = {
      title,
      description,
      problemStatement,
      difficulty,
      category,
      tags: tags || [],
      course: courseId,
      creator: req.user._id,
      allowedLanguages: allowedLanguages || [],
      timeLimit: timeLimit || 2,
      memoryLimit: memoryLimit || 134217728, // 128MB in bytes
      testCases,
      examples: examples || [],
      constraints: constraints || [],
      inputFormat,
      outputFormat,
      notes,
      hints: hints || [],
      status: "draft",
    };

    const problem = await ProgrammingProblem.create(problemData);

    await problem.populate([
      { path: "creator", select: "name email" },
      { path: "course", select: "title" },
    ]);

    res.status(201).json({
      success: true,
      message: "Programming problem created successfully",
      data: { problem },
    });
  } catch (error) {
    console.error("Create problem error:", error);

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
      message: "Could not create programming problem",
      error: error.message,
    });
  }
};

// @desc    Get all programming problems
// @route   GET /api/programming-problems
// @access  Public (published problems)
// const getProblems = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;


//     let query = {};


//     if (!req.user || req.user.role === "student") {
//       query.status = "published";
//     }

 
//     if (req.query.difficulty) query.difficulty = req.query.difficulty;
//     if (req.query.category) query.category = req.query.category;
//     if (req.query.course) query.course = req.query.course;
//     if (req.query.creator) query.creator = req.query.creator;

 
//    if (req.query.tags && req.query.tags.trim()) {
//      query.tags = { $in: req.query.tags.split(",").map((tag) => tag.trim()) };
//    }

//     if (req.query.search) {
//       query.$or = [
//         { title: { $regex: req.query.search, $options: "i" } },
//         { description: { $regex: req.query.search, $options: "i" } },
//         { tags: { $in: [new RegExp(req.query.search, "i")] } },
//       ];
//     }


//     const problems = await ProgrammingProblem.find(query)
//       .populate("creator", "name email")
//       .populate("course", "title subject")
//       .select("-testCases")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     const total = await ProgrammingProblem.countDocuments(query);

//     if (req.user && req.user.role === "student") {
//       for (let problem of problems) {
//         const submissions = await CodeSubmission.find({
//           user: req.user._id,
//           problem: problem._id,
//         })
//           .sort({ submittedAt: -1 })
//           .limit(1);

//         if (submissions.length > 0) {
//           problem._doc.userSubmission = {
//             status: submissions[0].status,
//             score: submissions[0].score,
//             submittedAt: submissions[0].submittedAt,
//             totalAttempts: await CodeSubmission.countDocuments({
//               user: req.user._id,
//               problem: problem._id,
//             }),
//           };
//         }
//       }
//     }

//     res.json({
//       success: true,
//       data: {
//         problems,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get problems error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not get programming problems",
//       error: error.message,
//     });
//   }
// };



// backend/controllers/programmingProblemController.js - DEBUG VERSION

const getProblems = async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Starting getProblems function');
    console.log('🔍 [DEBUG] User:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = {};

    // Only show published problems to students
    if (!req.user || req.user.role === "student") {
      query.status = "published";
    }

    console.log('🔍 [DEBUG] Initial query:', query);

    // Add filters one by one with debug
    if (req.query.difficulty) {
      console.log('🔍 [DEBUG] Adding difficulty filter:', req.query.difficulty);
      query.difficulty = req.query.difficulty;
    }
    
    if (req.query.category) {
      console.log('🔍 [DEBUG] Adding category filter:', req.query.category);
      query.category = req.query.category;
    }
    
    if (req.query.course) {
      console.log('🔍 [DEBUG] Adding course filter:', req.query.course);
      query.course = req.query.course;
    }
    
    if (req.query.creator) {
      console.log('🔍 [DEBUG] Adding creator filter:', req.query.creator);
      query.creator = req.query.creator;
    }

    // DEBUG: Check tags processing
    console.log('🔍 [DEBUG] req.query.tags:', req.query.tags);
    console.log('🔍 [DEBUG] typeof req.query.tags:', typeof req.query.tags);
    
    if (req.query.tags) {
      console.log('🔍 [DEBUG] Processing tags...');
      if (typeof req.query.tags === 'string' && req.query.tags.trim()) {
        console.log('🔍 [DEBUG] Tags is valid string');
        try {
          const tagsArray = req.query.tags.split(",").map((tag) => tag.trim());
          console.log('🔍 [DEBUG] Tags array:', tagsArray);
          query.tags = { $in: tagsArray };
        } catch (tagError) {
          console.error('❌ [DEBUG] Error processing tags:', tagError);
        }
      } else {
        console.log('🔍 [DEBUG] Tags exists but is not valid string');
      }
    }

    // DEBUG: Search processing  
    if (req.query.search) {
      console.log('🔍 [DEBUG] Adding search filter:', req.query.search);
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { tags: { $in: [new RegExp(req.query.search, "i")] } },
      ];
    }

    console.log('🔍 [DEBUG] Final query:', JSON.stringify(query, null, 2));

    // TEST: Check if ProgrammingProblem model is working
    console.log('🔍 [DEBUG] Testing ProgrammingProblem model...');
    console.log('🔍 [DEBUG] ProgrammingProblem:', typeof ProgrammingProblem);
    console.log('🔍 [DEBUG] ProgrammingProblem.find:', typeof ProgrammingProblem.find);

    // Execute query with debug
    console.log('🔍 [DEBUG] Executing ProgrammingProblem.find...');
    
    const problems = await ProgrammingProblem.find(query)
      .populate("creator", "name email")
      .populate("course", "title subject")
      .select("-testCases") // Don't include test cases in list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('🔍 [DEBUG] Query executed successfully');
    console.log('🔍 [DEBUG] Problems result:', problems ? 'Array' : 'null/undefined');
    console.log('🔍 [DEBUG] Problems length:', problems?.length || 'undefined');
    console.log('🔍 [DEBUG] Is problems array?', Array.isArray(problems));

    const total = await ProgrammingProblem.countDocuments(query);
    console.log('🔍 [DEBUG] Total count:', total);

    // SKIP the CodeSubmission part for now to isolate the issue
    console.log('🔍 [DEBUG] Skipping CodeSubmission processing...');

    // if (req.user && req.user.role === "student") {
    //   for (let problem of problems) {
    //     const submissions = await CodeSubmission.find({
    //       user: req.user._id,
    //       problem: problem._id,
    //     })
    //       .sort({ submittedAt: -1 })
    //       .limit(1);

    //     if (submissions.length > 0) {
    //       problem._doc.userSubmission = {
    //         status: submissions[0].status,
    //         score: submissions[0].score,
    //         submittedAt: submissions[0].submittedAt,
    //         totalAttempts: await CodeSubmission.countDocuments({
    //           user: req.user._id,
    //           problem: problem._id,
    //         }),
    //       };
    //     }
    //   }
    // }

    console.log('🔍 [DEBUG] About to send response...');

    res.json({
      success: true,
      data: {
        problems: problems || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

    console.log('🔍 [DEBUG] Response sent successfully');

  } catch (error) {
    console.error('❌ [DEBUG] Get problems error:', error);
    console.error('❌ [DEBUG] Error name:', error.name);
    console.error('❌ [DEBUG] Error message:', error.message);
    console.error('❌ [DEBUG] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: "Could not get programming problems",
      error: error.message,
      debug: {
        errorName: error.name,
        errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};


// @desc    Get single programming problem
// @route   GET /api/programming-problems/:id
// @access  Public (published) / Private (own problems for teachers)
const getProblem = async (req, res) => {
  try {
    const problem = await ProgrammingProblem.findById(req.params.id)
      .populate("creator", "name email")
      .populate("course", "title subject instructor");

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }

 
    let hasAccess = false;
    let showHiddenTestCases = false;

    if (["admin", "principal"].includes(req.user?.role)) {
      hasAccess = true;
      showHiddenTestCases = true;
    } else if (req.user?.role === "teacher") {
      hasAccess =
        problem.creator._id.toString() === req.user._id.toString() ||
        (problem.course &&
          problem.course.instructor.toString() === req.user._id.toString());
      showHiddenTestCases = hasAccess;
    } else if (req.user?.role === "student") {
      hasAccess = problem.status === "published";
    } else {
      hasAccess = problem.status === "published";
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this programming problem",
      });
    }


    if (!showHiddenTestCases) {
      problem.testCases = problem.testCases.filter((tc) => !tc.isHidden);
    }

    if (req.user?.role === "student") {
      const submissions = await CodeSubmission.find({
        user: req.user._id,
        problem: problem._id,
      })
        .sort({ submittedAt: -1 })
        .limit(5);

      problem._doc.userSubmissions = submissions;
    }

    res.json({
      success: true,
      data: { problem },
    });
  } catch (error) {
    console.error("Get problem error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get programming problem",
      error: error.message,
    });
  }
};

// @desc    Update programming problem
// @route   PATCH /api/programming-problems/:id
// @access  Private (Problem creator or Admin)
const updateProblem = async (req, res) => {
  try {
    let problem = await ProgrammingProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }


    const isCreator = problem.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this problem",
      });
    }

    const allowedUpdates = [
      "title",
      "description",
      "problemStatement",
      "difficulty",
      "category",
      "tags",
      "allowedLanguages",
      "timeLimit",
      "memoryLimit",
      "testCases",
      "examples",
      "constraints",
      "inputFormat",
      "outputFormat",
      "notes",
      "hints",
      "status",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Log test cases update for debugging
    if (updates.testCases) {
      console.log(`📝 Updating test cases for problem ${req.params.id}:`, {
        count: updates.testCases.length,
        testCases: updates.testCases
      });
    }

    problem = await ProgrammingProblem.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate([
      { path: "creator", select: "name email" },
      { path: "course", select: "title subject" },
    ]);

    console.log(`✅ Problem updated successfully. Test cases count: ${problem.testCases?.length || 0}`);

    res.json({
      success: true,
      message: "Programming problem updated successfully",
      data: { problem },
    });
  } catch (error) {
    console.error("Update problem error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update programming problem",
      error: error.message,
    });
  }
};

// @desc    Delete programming problem
// @route   DELETE /api/programming-problems/:id
// @access  Private (Problem creator or Admin)
const deleteProblem = async (req, res) => {
  try {
    const problem = await ProgrammingProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }

 
    const isCreator = problem.creator.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this problem",
      });
    }


    const submissionCount = await CodeSubmission.countDocuments({
      problem: problem._id,
    });

    if (submissionCount > 0 && !isAdmin) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete problem with existing submissions. Please contact administrator.",
      });
    }

    // Delete problem and its submissions (if admin)
    if (submissionCount > 0 && isAdmin) {
      await CodeSubmission.deleteMany({ problem: problem._id });
    }

    await ProgrammingProblem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Programming problem deleted successfully",
    });
  } catch (error) {
    console.error("Delete problem error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete programming problem",
      error: error.message,
    });
  }
};

// @desc    Get problem statistics
// @route   GET /api/programming-problems/:id/stats
// @access  Private (Problem creator or Admin)
const getProblemStats = async (req, res) => {
  try {
    const problem = await ProgrammingProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Programming problem not found",
      });
    }


    const isCreator = problem.creator.toString() === req.user._id.toString();
    const isAuthorized = ["admin", "principal", "teacher"].includes(
      req.user.role
    );

    if (!isCreator && !isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view problem statistics",
      });
    }


    const submissions = await CodeSubmission.find({ problem: problem._id });

    const stats = {
      problem: {
        id: problem._id,
        title: problem.title,
        difficulty: problem.difficulty,
      },
      submissions: {
        total: submissions.length,
        accepted: submissions.filter((s) => s.status === "accepted").length,
        byLanguage: problem.stats.languageStats,
        byStatus: {
          accepted: submissions.filter((s) => s.status === "accepted").length,
          wrong_answer: submissions.filter((s) => s.status === "wrong_answer")
            .length,
          compile_error: submissions.filter((s) => s.status === "compile_error")
            .length,
          runtime_error: submissions.filter((s) => s.status === "runtime_error")
            .length,
          time_limit_exceeded: submissions.filter(
            (s) => s.status === "time_limit_exceeded"
          ).length,
        },
      },
      performance: {
        acceptanceRate: problem.acceptanceRate,
        averageAttempts: problem.stats.averageAttempts,
        averageScore: problem.stats.averageScore,
      },
      recentSubmissions: submissions
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 10)
        .map((s) => ({
          user: s.user,
          language: s.language,
          status: s.status,
          score: s.score,
          submittedAt: s.submittedAt,
        })),
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get problem stats error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get problem statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createProblem,
  getProblems,
  getProblem,
  updateProblem,
  deleteProblem,
  getProblemStats,
};
