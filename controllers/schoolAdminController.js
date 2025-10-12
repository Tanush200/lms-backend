const User = require("../models/User");
const School = require("../models/School");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { logActivity } = require("./superAdminController");

// @desc    Get all school admins
// @route   GET /api/super-admin/school-admins
// @access  Private (Super Admin)
const getSchoolAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, schoolId, role, status } = req.query;

    // Build filter
    const filter = {
      role: { $in: ["admin", "principal", "school_admin"] },
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (schoolId) filter.school = schoolId;
    if (role && role !== "all") filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const admins = await User.find(filter)
      .select("-password")
      .populate("school", "name code")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: admins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get school admins error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get school admins",
      error: error.message,
    });
  }
};

// @desc    Get single school admin
// @route   GET /api/super-admin/school-admins/:id
// @access  Private (Super Admin)
const getSchoolAdminById = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id)
      .select("-password")
      .populate("school", "name code");

    if (!admin || !["admin", "principal", "school_admin"].includes(admin.role)) {
      return res.status(404).json({
        success: false,
        message: "School admin not found",
      });
    }

    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Get school admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get school admin",
      error: error.message,
    });
  }
};

// @desc    Create school admin
// @route   POST /api/super-admin/school-admins
// @access  Private (Super Admin)
const createSchoolAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      schoolId,
      role = "admin",
      isActive = true,
      generatePassword = true,
      password,
    } = req.body;

    // Validate required fields
    if (!name || !email || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and school are required",
      });
    }

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Generate or use provided password
    let temporaryPassword;
    let hashedPassword;

    if (generatePassword) {
      temporaryPassword = crypto.randomBytes(8).toString("hex");
      hashedPassword = await bcrypt.hash(temporaryPassword, 12);
    } else {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required when not auto-generating",
        });
      }
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create admin
    const admin = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      school: schoolId,
      isActive,
      isTemporaryPassword: generatePassword,
      accountCreated: {
        method: "super_admin_created",
        createdBy: req.user._id,
        createdAt: new Date(),
      },
    });

    // Populate school info
    await admin.populate("school", "name code");

    // Log activity
    await logActivity(
      "admin_created",
      `School admin ${admin.name} created for ${school.name}`,
      req.user._id,
      admin._id,
      "User",
      schoolId
    );

    res.status(201).json({
      success: true,
      message: "School admin created successfully",
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          school: admin.school,
          isActive: admin.isActive,
        },
        temporaryPassword: generatePassword ? temporaryPassword : undefined,
      },
    });
  } catch (error) {
    console.error("Create school admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create school admin",
      error: error.message,
    });
  }
};

// @desc    Update school admin
// @route   PUT /api/super-admin/school-admins/:id
// @access  Private (Super Admin)
const updateSchoolAdmin = async (req, res) => {
  try {
    const { name, phone, schoolId, role, isActive } = req.body;

    const admin = await User.findById(req.params.id);
    if (!admin || !["admin", "principal"].includes(admin.role)) {
      return res.status(404).json({
        success: false,
        message: "School admin not found",
      });
    }

    // Verify new school exists if changing
    if (schoolId && schoolId !== admin.school.toString()) {
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }
    }

    // Update fields
    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (schoolId) admin.school = schoolId;
    if (role) admin.role = role;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();
    await admin.populate("school", "name code");

    // Log activity
    await logActivity(
      "admin_updated",
      `School admin ${admin.name} updated`,
      req.user._id,
      admin._id,
      "User",
      admin.school
    );

    res.json({
      success: true,
      message: "School admin updated successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Update school admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update school admin",
      error: error.message,
    });
  }
};

// @desc    Delete school admin
// @route   DELETE /api/super-admin/school-admins/:id
// @access  Private (Super Admin)
const deleteSchoolAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || !["admin", "principal"].includes(admin.role)) {
      return res.status(404).json({
        success: false,
        message: "School admin not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(
      "admin_deleted",
      `School admin ${admin.name} deleted`,
      req.user._id,
      admin._id,
      "User",
      admin.school
    );

    res.json({
      success: true,
      message: "School admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete school admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete school admin",
      error: error.message,
    });
  }
};

// @desc    Reset school admin password
// @route   POST /api/super-admin/school-admins/:id/reset-password
// @access  Private (Super Admin)
const resetAdminPassword = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || !["admin", "principal"].includes(admin.role)) {
      return res.status(404).json({
        success: false,
        message: "School admin not found",
      });
    }

    // Generate new password
    const newPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    admin.password = hashedPassword;
    admin.isTemporaryPassword = true;
    await admin.save();

    res.json({
      success: true,
      message: "Password reset successfully",
      data: {
        newPassword,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

module.exports = {
  getSchoolAdmins,
  getSchoolAdminById,
  createSchoolAdmin,
  updateSchoolAdmin,
  deleteSchoolAdmin,
  resetAdminPassword,
};
