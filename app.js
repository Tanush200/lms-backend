const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
// const cron = require("node-cron");
// const SubscriptionCronService = require("./services/subscriptionCronService");
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

// // ========================================
// // ✅ CRON JOBS
// // ========================================
// console.log("⏰ Initializing subscription cron jobs...");

// // Run subscription checks daily at midnight (00:00)
// cron.schedule("0 0 * * *", async () => {
//   console.log("🔄 Running daily subscription cron jobs...");

//   try {
//     await SubscriptionCronService.checkExpiringSubscriptions();
//     await SubscriptionCronService.checkExpiredSubscriptions();
//     console.log("✅ Subscription cron jobs completed successfully");
//   } catch (error) {
//     console.error("❌ Subscription cron jobs failed:", error);
//   }
// });

// // Run every hour to check for expired subscriptions
// cron.schedule("0 * * * *", async () => {
//   console.log("🔄 Running hourly expired subscription check...");

//   try {
//     await SubscriptionCronService.checkExpiredSubscriptions();
//     console.log("✅ Hourly expiry check completed");
//   } catch (error) {
//     console.error("❌ Hourly expiry check failed:", error);
//   }
// });

// console.log("✅ Subscription cron jobs scheduled");
// console.log("   - Daily check: 00:00 (midnight)");
// console.log("   - Hourly expiry check: Every hour");

// ========================================
// IMPORT ROUTES
// ========================================
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const enrollmentRoutes = require("./routes/enrollments");
const quizRoutes = require("./routes/quizzes");
const questionRoutes = require("./routes/questions");
const quizAttemptRoutes = require("./routes/quizAttempts");
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
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const schoolRegistrationRoutes = require("./routes/schoolRegistrationRoutes");

// ========================================
// IMPORT MIDDLEWARE
// ========================================
const { checkSubscriptionAccess } = require("./middleware/checkSubscription");
const { protect } = require("./middleware/auth");

// ========================================
// HEALTH CHECK
// ========================================
app.get("/api/health", (req, res) => {
  res.json({
    message: "School Management API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0",
  });
});

app.get("/", (req, res) => {
  res.redirect("/api/health");
});

// ========================================
// PUBLIC ROUTES (No Auth Required)
// ========================================
app.use("/api/school-registration", schoolRegistrationRoutes);

// Webhook route (public - no auth)
const { handlePaymentWebhook } = require("./controllers/subscriptionController");
app.post("/api/subscriptions/webhook", handlePaymentWebhook);

// ========================================
// AUTH ROUTES
// ========================================
app.use("/api/auth", authRoutes);

// ========================================
// SUBSCRIPTION ROUTES (Protected but NO subscription check)
// ========================================
// ✅ Subscription routes use protect middleware ONLY
// This allows admins without active subscription to access subscription management
app.use("/api/subscriptions", protect, subscriptionRoutes);

// ========================================
// PROTECTED ROUTES (With Subscription Check)
// ========================================
app.use("/api/users", protect, userRoutes);

app.use("/api/courses", protect, courseRoutes);
app.use("/api/enrollments", protect, enrollmentRoutes);

app.use("/api/quizzes", protect, quizRoutes);
app.use("/api/questions", protect, questionRoutes);

// Quiz attempt routes
app.use((req, res, next) => {
  const p = req.path || "";
  const isQuizPath =
    p.startsWith("/api/quizzes") ||
    p.startsWith("/api/quiz-attempts") ||
    p.startsWith("/api/students/");

  if (!isQuizPath) return next();

  return protect(req, res, () =>
    checkSubscriptionAccess(req, res, () => quizAttemptRoutes(req, res, next))
  );
});

app.use(
  "/api/programming-problems",
  protect,
  programmingProblemRoutes
);
app.use(
  "/api/code-submissions",
  protect,
  codeSubmissionRoutes
);
app.use("/api/judge0", protect, judge0Routes);

app.use("/api/admin", protect, adminRoutes);
app.use(
  "/api/student-management",
  protect,
  studentManagementRoutes
);

app.use(
  "/api/questions/import",
  protect,
  questionImportRoutes
);

app.use("/api/parent", protect, parentRoutes);
app.use("/api/parents", protect, parentRoutes);

app.use("/api/notices", protect, noticeRoutes);

app.use("/api/attendance", protect, attendanceRoutes);

app.use(
  "/api/fee-reminders",
  protect,
  feeReminderRoutes
);

app.use("/api/schools", protect, schoolRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/messages", protect, messageRoutes);

app.use(
  "/api/notifications",
  protect,
  notificationRoutes
);

// ========================================
// SPECIAL ENDPOINTS
// ========================================
app.get("/api/notifications/vapid-public-key", (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
});

// ========================================
// DEBUG/TEST ENDPOINTS
// ========================================
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
      "GET /api/quiz-attempts/:attemptId",
    ],
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
        courseId,
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
        materials: course.materials || [],
      },
    });
  } catch (error) {
    console.error("❌ Test materials error:", error);
    res.status(500).json({
      success: false,
      message: "Test failed",
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

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res, next) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = { app, server };
