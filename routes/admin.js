// backend/routes/admin.js - CREATE THIS FILE
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// @desc    Create user (Admin only)
// @route   POST /api/admin/users
// @access  Private (Admin only)
router.post("/users", protect, authorize("admin"), async (req, res) => {
  try {
    console.log("🔍 Request body:", req.body);
    console.log("🔍 Request headers:", req.headers);
    console.log("🔍 User creating:", req.user?.email);

    const { name, email, password, role, phone, address } = req.body;

    console.log("📝 Extracted data:", {
      name,
      email,
      password: "***",
      role,
      phone,
      address,
    });

    // ✅ VALIDATE REQUIRED FIELDS
    if (!name || !email || !password || !role) {
      console.log("❌ Missing required fields:", {
        name: !!name,
        email: !!email,
        password: !!password,
        role: !!role,
      });
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, password, and role",
      });
    }

    // Admin can create any role
    const allowedRoles = [
      "admin",
      "principal",
      "teacher",
      "student",
      "parent",
      "accountant",
      "librarian",
    ];

    if (!allowedRoles.includes(role)) {
      console.log("❌ Invalid role:", role);
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Check if user already exists
    console.log(
      "🔍 Checking for existing user with email:",
      email.toLowerCase()
    );
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("❌ User already exists:", existingUser.email);
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Generate IDs
    let additionalFields = {};
    if (role === "student") {
      const studentCount = await User.countDocuments({ role: "student" });
      additionalFields.studentId = `STU${Date.now()}${studentCount + 1}`;
      console.log("🆔 Generated studentId:", additionalFields.studentId);
    } else if (
      ["teacher", "admin", "principal", "accountant", "librarian"].includes(
        role
      )
    ) {
      const employeeCount = await User.countDocuments({
        role: {
          $in: ["teacher", "admin", "principal", "accountant", "librarian"],
        },
      });
      additionalFields.employeeId = `EMP${Date.now()}${employeeCount + 1}`;
      console.log("🆔 Generated employeeId:", additionalFields.employeeId);
    }

    // Prepare user data
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone,
      address,
      ...additionalFields,
      isActive: true,
      emailVerified: true,
    };

    console.log("🔨 Creating user with data:", {
      ...userData,
      password: "***",
    });

    // Create user (password will be hashed by pre-save middleware)
    const user = await User.create(userData);

    console.log("✅ User created successfully:", user.email);

    user.password = undefined; // Remove password from response

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          studentId: user.studentId,
          employeeId: user.employeeId,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("❌ Admin user creation error:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);

    // Check for validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      console.log("❌ Validation errors:", validationErrors);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.query.role) {
      query.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not get users',
      error: error.message,
    });
  }
});

module.exports = router;
