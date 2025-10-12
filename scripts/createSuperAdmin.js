const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../models/User");

const createSuperAdmin = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!MONGO_URI) {
      console.error("❌ MongoDB URI not found in .env file");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });
    if (existingSuperAdmin) {
      console.log("❌ Super Admin already exists:", existingSuperAdmin.email);
      process.exit(0);
    }

    // Password for super admin
    const password = "sahatanush05@gmail.com"; // Change this!
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create super admin user
    const superAdmin = await User.create({
      name: "Super Administrator",
      email: "sahatanush05@gmail.com", // Change this email!
      password: hashedPassword,
      role: "super_admin", // ✅ Super admin role
      school: null, // ✅ No school for super admin
      employeeId: `SUPER${Date.now()}`,
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
    });

    console.log("\n🎉 Super Admin created successfully!");
    console.log("═══════════════════════════════════════");
    console.log("📧 Email:", superAdmin.email);
    console.log("🔑 Password:", password);
    console.log("👤 Role: super_admin");
    console.log("🏫 School: N/A (Can access all schools)");
    console.log("═══════════════════════════════════════");
    console.log("⚠️  IMPORTANT: Change the password after first login!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createSuperAdmin();
