const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { initializeSocket } = require("./socket/socketServer");

const app = express();
const server = http.createServer(app);

const io = initializeSocket(server);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://lms-frontend-jm31.vercel.app"]
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
const parentRoutes = require("./routes/parent");
const noticeRoutes = require("./routes/notices");
const attendanceRoutes = require("./routes/attendanceRoutes");
const feeReminderRoutes = require("./routes/feeReminderRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); 


app.get("/api/health", (req, res) => {
  res.json({
    message: "School Management API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0",
  });
});


// Helpful root route -> redirect to health
app.get("/", (req, res) => {
  res.redirect("/api/health");
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

app.use("/api/parent", parentRoutes);
// Alias (plural) for parent routes to support /api/parents/* endpoints
app.use("/api/parents", parentRoutes);

app.use("/api/notices", noticeRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/fee-reminders", feeReminderRoutes);

app.use("/api/schools", schoolRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/messages", messageRoutes);


app.use("/api/notifications", notificationRoutes);




app.get("/api/notifications/vapid-public-key", (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
});

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

// ✅ Test endpoint for materials debugging
app.get("/api/test-materials/:courseId", async (req, res) => {
  try {
    const Course = require("./models/Course");
    const { courseId } = req.params;
    
    console.log("🧪 Testing materials endpoint for course:", courseId);
    
    const course = await Course.findById(courseId)
      .populate("school", "name code")
      .select("title instructor school materials");
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
        courseId
      });
    }
    
    res.json({
      success: true,
      message: "Course found",
      data: {
        courseId: course._id,
        title: course.title,
        instructor: course.instructor,
        school: course.school,
        materialsCount: course.materials?.length || 0,
        materials: course.materials || []
      }
    });
  } catch (error) {
    console.error("❌ Test materials error:", error);
    res.status(500).json({
      success: false,
      message: "Test failed",
      error: error.message
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


app.get("/", (req, res) => {
  res.redirect("/api/health");
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

module.exports = { app, server };
