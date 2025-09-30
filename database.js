const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    console.log("🔄 Connecting to MongoDB...");

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `📊 MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`
    );
    console.log(`📁 Database: ${conn.connection.name}`);


    mongoose.connection.on("disconnected", () => {
      console.log("📊 MongoDB disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("📊 MongoDB error:", err);
    });

    mongoose.connection.on("reconnected", () => {
      console.log("📊 MongoDB reconnected");
    });

    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    process.exit(1);
  }
};

module.exports = connectDB;
