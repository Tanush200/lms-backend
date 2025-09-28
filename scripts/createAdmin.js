const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("❌ Admin user already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Change this password!
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("test@gmail.com", salt); // Change this password!

    // Create admin user
    const admin = await User.create({
      name: "System Administrator",
      email: "test@gmail.com", // Change this email!
      password: hashedPassword,
      role: "admin",
      employeeId: `EMP${Date.now()}001`,
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
    });

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password: admin123");
    console.log("⚠️  Please change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();


// // backend/scripts/checkAdmin.js - CHECK IF ADMIN EXISTS
// const mongoose = require('mongoose');
// require('dotenv').config();

// const User = require('../models/User');

// const checkAdmin = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('Connected to MongoDB');

//     // Find all admin users
//     const admins = await User.find({ role: 'admin' });
//     console.log('📊 Found', admins.length, 'admin users:');
    
//     admins.forEach((admin, index) => {
//       console.log(`${index + 1}. Name: ${admin.name}`);
//       console.log(`   Email: ${admin.email}`);
//       console.log(`   Role: ${admin.role}`);
//       console.log(`   Active: ${admin.isActive}`);
//       console.log(`   Password Hash: ${admin.password.substring(0, 20)}...`);
//       console.log('---');
//     });

//     // Also check total users
//     const totalUsers = await User.countDocuments();
//     console.log(`📈 Total users in database: ${totalUsers}`);

//     process.exit(0);
//   } catch (error) {
//     console.error('❌ Error:', error);
//     process.exit(1);
//   }
// };

// checkAdmin();
