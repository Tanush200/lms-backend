// backend/scripts/fixAdminPassword.js - CREATE THIS FILE
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

const fixAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the admin user
    const admin = await User.findOne({
      email: "sahatanush05@gmail.com",
      role: "admin",
    }).select("+password");

    if (!admin) {
      console.log("❌ Admin user not found");
      process.exit(1);
    }

    console.log("🔍 Current admin details:");
    console.log("   Name:", admin.name);
    console.log("   Email:", admin.email);
    console.log("   Has Password:", admin.password ? "YES" : "NO");

    // Hash password manually (bypass pre-save middleware issues)
    const newPassword = "sahatanush05@gmail.com";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log("🔐 Setting new password:", newPassword);
    console.log("🔐 Generated hash:", hashedPassword.substring(0, 30) + "...");

    // Update directly with updateOne to avoid middleware issues
    const result = await User.updateOne(
      { _id: admin._id },
      {
        password: hashedPassword,
        isActive: true,
      }
    );

    console.log("📝 Update result:", result);

    if (result.modifiedCount > 0) {
      console.log("✅ Admin password updated successfully!");
      console.log("📧 Login with:");
      console.log("   Email: sahatanush05@gmail.com");
      console.log("   Password: admin123");
    } else {
      console.log("❌ No admin user was updated");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing admin password:", error);
    process.exit(1);
  }
};

fixAdminPassword();
