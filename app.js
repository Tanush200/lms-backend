const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();


app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["your-production-domain.com"]
        : ["http://localhost:3000"],
    credentials: true,
  })
);


app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses')
const enrollmentRoutes = require('./routes/enrollments')
const quizRoutes = require('./routes/quizzes');
const questionRoutes = require('./routes/questions')
const quizAttemptRoutes = require('./routes/quizAttempts')
const programmingProblemRoutes = require("./routes/programmingProblems");
const codeSubmissionRoutes = require("./routes/codeSubmissions"); 
const judge0Routes = require("./routes/judge0"); 
const adminRoutes = require("./routes/admin");
const studentManagementRoutes = require("./routes/studentManagementRoutes"); 
const questionImportRoutes = require("./routes/questionImportRoutes");


app.get("/api/health", (req, res) => {
  res.json({
    message: "School Management API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0",
  });
});

app.use('/api/auth',authRoutes);
app.use('/api/users',userRoutes);

app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);

app.use("/api/quizzes", quizRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api", quizAttemptRoutes);

app.use("/api/programming-problems", programmingProblemRoutes);
app.use("/api/code-submissions", codeSubmissionRoutes);
app.use("/api/judge0", judge0Routes);

app.use("/api/admin", adminRoutes);
app.use("/api/student-management", studentManagementRoutes);

app.use("/api/questions/import", questionImportRoutes);




app.get("/api/debug/models", async (req, res) => {
  try {
    const ProgrammingProblem = require("./models/ProgrammingProblem");
    const CodeSubmission = require("./models/CodeSubmission");

    console.log("🔍 Testing models...");
    console.log("ProgrammingProblem type:", typeof ProgrammingProblem);
    console.log("CodeSubmission type:", typeof CodeSubmission);


    const problemCount = await ProgrammingProblem.countDocuments();
    const submissionCount = await CodeSubmission.countDocuments();

    const problems = await ProgrammingProblem.find().limit(1);

    res.json({
      success: true,
      data: {
        problemCount,
        submissionCount,
        sampleProblem: problems[0] || null,
        modelTypes: {
          ProgrammingProblem: typeof ProgrammingProblem,
          CodeSubmission: typeof CodeSubmission,
        },
      },
    });
  } catch (error) {
    console.error("Model debug error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

app.get("/api/test-routes", (req, res) => {
  res.json({
    message: "Route mounting test",
    routes: [
      "POST /api/auth/register",
      "POST /api/auth/login", 
      "GET /api/courses",
      "POST /api/quizzes",
      "POST /api/quizzes/:quizId/attempt",
      "GET /api/quiz-attempts/:attemptId"
    ]
  });
});

app.get("/api/test-roles", (req, res) => {
  const roles = [
    "admin",
    "principal",
    "teacher",
    "student",
    "parent",
    "accountant",
    "librarian",
  ];
  res.json({
    message: "User roles configured",
    roles: roles,
    count: roles.length,
  });
});


app.get("/api/test-db", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const User = require("./models/User");

    const userCount = await User.countDocuments();

    res.json({
      message: "Database connection successful",
      userCount: userCount,
      dbState:
        mongoose.connection.readyState === 1 ? "Connected" : "Not Connected",
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});


app.get("/api/test-cloudinary", async (req, res) => {
  try {
    const { testCloudinaryConnection } = require("./config/cloudinary");
    const isConnected = await testCloudinaryConnection();

    res.json({
      message: "Cloudinary test completed",
      connected: isConnected,
    });
  } catch (error) {
    res.status(500).json({
      message: "Cloudinary test failed",
      error: error.message,
    });
  }
});


app.use((req, res, next) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});


app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
