// scripts/migrateToMultiSchool.js
require("dotenv").config(); // ✅ ADD THIS LINE AT THE TOP

const mongoose = require("mongoose");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const FeeReminder = require("../models/FeeReminder");
const Notice = require("../models/Notice");
const School = require("../models/School");

async function migrateToMultiSchool() {
  try {
    // Check if MONGO_URI exists
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is not defined in .env file");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🚀 Starting multi-school migration...");

    // Step 1: Create a default school
    let defaultSchool = await School.findOne({ code: "DEFAULT" });
    if (!defaultSchool) {
      defaultSchool = await School.create({
        name: "Default School",
        code: "DEFAULT",
        isActive: true,
      });
      console.log("✅ Default school created:", defaultSchool._id);
    } else {
      console.log("✅ Default school already exists:", defaultSchool._id);
    }

    // Step 2: Update all users (except super_admin) to belong to default school
    const userUpdate = await User.updateMany(
      { role: { $ne: "super_admin" }, school: { $exists: false } },
      { $set: { school: defaultSchool._id } }
    );
    console.log(`✅ Updated ${userUpdate.modifiedCount} users`);

    // Step 3: Update all courses
    const courseUpdate = await Course.updateMany(
      { school: { $exists: false } },
      { $set: { school: defaultSchool._id } }
    );
    console.log(`✅ Updated ${courseUpdate.modifiedCount} courses`);

    // Step 4: Update all enrollments
    const enrollmentUpdate = await Enrollment.updateMany(
      { school: { $exists: false } },
      { $set: { school: defaultSchool._id } }
    );
    console.log(`✅ Updated ${enrollmentUpdate.modifiedCount} enrollments`);

    // Step 5: Update all attendance records
    const attendanceUpdate = await Attendance.updateMany(
      { school: { $exists: false } },
      { $set: { school: defaultSchool._id } }
    );
    console.log(
      `✅ Updated ${attendanceUpdate.modifiedCount} attendance records`
    );

    // Step 6: Update all fee reminders
    const feeUpdate = await FeeReminder.updateMany(
      { school: { $exists: false } },
      { $set: { school: defaultSchool._id } }
    );
    console.log(`✅ Updated ${feeUpdate.modifiedCount} fee reminders`);

    // Step 7: Update all notices
    const noticeUpdate = await Notice.updateMany(
      { school: { $exists: false } },
      { $set: { school: defaultSchool._id } }
    );
    console.log(`✅ Updated ${noticeUpdate.modifiedCount} notices`);

    console.log("🎉 Migration completed successfully!");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateToMultiSchool();
