/**
 * Script to clean up orphaned enrollments (enrollments with deleted students)
 * Run this to remove enrollments that reference non-existent students
 * 
 * Usage: node scripts/cleanupOrphanedEnrollments.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

const cleanupOrphanedEnrollments = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    console.log("\n🔍 Finding all enrollments...");
    const allEnrollments = await Enrollment.find({});
    console.log(`📊 Found ${allEnrollments.length} total enrollments`);

    let orphaned = 0;
    let valid = 0;

    console.log("\n🔍 Checking each enrollment...");
    for (const enrollment of allEnrollments) {
      // Check if student exists
      const studentExists = await User.findById(enrollment.student);
      
      if (!studentExists) {
        console.log(`🗑️ Deleting orphaned enrollment ${enrollment._id} (student ${enrollment.student} not found)`);
        await Enrollment.findByIdAndDelete(enrollment._id);
        orphaned++;
      } else {
        valid++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Valid enrollments: ${valid}`);
    console.log(`   🗑️ Orphaned enrollments deleted: ${orphaned}`);
    console.log(`   📝 Total processed: ${allEnrollments.length}`);

    if (orphaned > 0) {
      console.log(`\n✅ Cleanup complete! Removed ${orphaned} orphaned enrollments.`);
    } else {
      console.log(`\n✅ No orphaned enrollments found! Database is clean.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

cleanupOrphanedEnrollments();
