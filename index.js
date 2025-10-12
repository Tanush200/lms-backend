require("dotenv").config();

const { app, server } = require("./app");
const connectDB = require("./database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("🔄 Starting School Management System...");
    console.log("🔍 Environment:", process.env.NODE_ENV);


    await connectDB();
    console.log("✅ Database connected successfully");


    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend URL: http://localhost:3000`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};


process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully");
  process.exit(0);
});

startServer();
