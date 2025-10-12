const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../models/User");
const School = require("../models/School");

const createSchoolAdmin = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!MONGO_URI) {
      console.error("❌ MongoDB URI not found in .env file");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ===== CONFIGURATION - CHANGE THESE VALUES =====
    const SCHOOL_CODE = "TSS002"; // Change to your school code
    const ADMIN_NAME = "TSS Admin";
    const ADMIN_EMAIL = "tanush.saha97@gmail.com";
    const ADMIN_PASSWORD = "tanush.saha97@gmail.com"; // Change this!
    // ==============================================

    // Find the school
    const school = await School.findOne({ code: SCHOOL_CODE });
    if (!school) {
      console.error(`❌ School with code "${SCHOOL_CODE}" not found!`);
      console.log("\n💡 Available schools:");
      const schools = await School.find({}).select("name code");
      schools.forEach((s) => console.log(`   - ${s.name} (${s.code})`));

      if (schools.length === 0) {
        console.log("\n⚠️  No schools found. Create a school first using:");
        console.log("   POST /api/schools (as super_admin)");
      }

      await mongoose.connection.close();
      process.exit(1);
    }

    // Check if admin already exists for this school
    const existingAdmin = await User.findOne({
      email: ADMIN_EMAIL,
      role: "admin",
      school: school._id,
    });

    if (existingAdmin) {
      console.log("❌ School admin already exists:", existingAdmin.email);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Create school admin user
    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin", // ✅ School admin role
      school: school._id, // ✅ Link to specific school
      employeeId: `${SCHOOL_CODE}_ADMIN_${Date.now()}`,
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
    });

    console.log("\n🎉 School Admin created successfully!");
    console.log("═══════════════════════════════════════");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password:", ADMIN_PASSWORD);
    console.log("👤 Role: admin (School Admin)");
    console.log("🏫 School:", school.name, `(${school.code})`);
    console.log("🆔 School ID:", school._id);
    console.log("═══════════════════════════════════════");
    console.log("⚠️  IMPORTANT: Change the password after first login!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating school admin:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createSchoolAdmin();
