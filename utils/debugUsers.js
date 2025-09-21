// backend/utils/debugUsers.js
const express = require("express");
const User = require("../models/User");
require("dotenv").config();
const connectDB = require("../database");

const debugUsers = async () => {
  try {
    console.log("🔍 Debugging Users Route...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Test direct User model query
    console.log("📊 Testing User.find()...");
    const allUsers = await User.find().select("-password");
    console.log("✅ Users found:", allUsers.length);

    if (allUsers.length > 0) {
      console.log("👤 Sample user:", {
        id: allUsers[0]._id,
        name: allUsers[0].name,
        email: allUsers[0].email,
        role: allUsers[0].role,
      });
    }

    // Test the exact query from the route
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const usersList = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({});

    console.log("📈 Query results:");
    console.log("- Users returned:", usersList.length);
    console.log("- Total count:", total);

    const response = {
      success: true,
      data: {
        users: usersList,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    console.log("✅ Response structure looks good");
    console.log("🎉 Debug completed successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  }
};

debugUsers();
