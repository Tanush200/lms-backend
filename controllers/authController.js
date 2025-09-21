const User = require("../models/User");
const { createTokenResponse } = require("../utils/jwt");
const bcrypt = require("bcrypt");

const register = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, password, and role",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const validRoles = [
      "admin",
      "principal",
      "teacher",
      "student",
      "parent",
      "accountant",
      "librarian",
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(", ")}`,
      });
    }

    let additionalFields = {};
    if (role == "student") {
      const studentCount = await User.countDocuments({ role: "student" });
      additionalFields.studentId = `STU${Date.now()}${studentCount + 1}`;
    } else if (
      ["teacher", "principal", "accountant", "librarian"].includes(role)
    ) {
      const employeeCount = await User.countDocuments({
        role: { $in: ["teacher", "principal", "accountant", "librarian"] },
      });
      additionalFields.employeeId = `EMP${Date.now()}${employeeCount + 1}`;
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      address,
      role,
      ...additionalFields,
    });

    const tokenData = createTokenResponse(user);

    user.password = undefined;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          employeeId: user.employeeId,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        auth: tokenData,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact administrator.",
      });
    }

    const isValidPassword = await user.correctPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    user.lastLogin = new Date();

    await user.save({ validateBeforeSave: false });

    const tokenData = createTokenResponse(user);
    user.password = undefined;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          employeeId: user.employeeId,
          profilePhoto: user.profilePhoto,
          lastLogin: user.lastLogin,
        },
        auth: tokenData,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          studentId: user.studentId,
          employeeId: user.employeeId,
          profilePhoto: user.profilePhoto,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get user profile",
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current password and new password",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Could not change password",
      error: error.message,
    });
  }
};



module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
};