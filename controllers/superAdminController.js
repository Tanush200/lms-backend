const User = require("../models/User");
const School = require("../models/School");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const ActivityLog = require("../models/ActivityLog");

// @desc    Get dashboard statistics
// @route   GET /api/super-admin/dashboard/stats
// @access  Private (Super Admin)
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalSchools,
      activeSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalCourses,
      totalEnrollments,
      recentSchools,
    ] = await Promise.all([
      School.countDocuments(),
      School.countDocuments({ isActive: true }),
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      School.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name code isActive createdAt"),
    ]);

    // Calculate growth (last 30 days vs previous 30 days)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [usersLast30, usersPrevious30] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      User.countDocuments({
        createdAt: { $gte: previous30Days, $lt: last30Days },
      }),
    ]);

    const userGrowth =
      usersPrevious30 > 0
        ? ((usersLast30 - usersPrevious30) / usersPrevious30) * 100
        : 100;

    res.json({
      success: true,
      data: {
        totalSchools,
        activeSchools,
        inactiveSchools: totalSchools - activeSchools,
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins: totalUsers - totalStudents - totalTeachers,
        totalCourses,
        totalEnrollments,
        userGrowth: Math.round(userGrowth * 10) / 10,
        recentSchools,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard statistics",
      error: error.message,
    });
  }
};

// @desc    Get recent activity
// @route   GET /api/super-admin/activity
// @access  Private (Super Admin)
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const activities = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("performedBy", "name email")
      .populate("school", "name code");

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get recent activity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recent activity",
      error: error.message,
    });
  }
};

// @desc    Get platform health status
// @route   GET /api/super-admin/health
// @access  Private (Super Admin)
const getPlatformHealth = async (req, res) => {
  try {
    const mongoose = require("mongoose");

    const health = {
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date(),
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error("Get platform health error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get platform health",
      error: error.message,
    });
  }
};

// @desc    Get schools overview
// @route   GET /api/super-admin/schools/overview
// @access  Private (Super Admin)
const getSchoolsOverview = async (req, res) => {
  try {
    const schools = await School.find()
      .select("name code logo isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user count for each school
    const schoolsWithStats = await Promise.all(
      schools.map(async (school) => {
        const totalUsers = await User.countDocuments({ school: school._id });
        return {
          ...school.toObject(),
          totalUsers,
        };
      })
    );

    res.json({
      success: true,
      data: schoolsWithStats,
    });
  } catch (error) {
    console.error("Get schools overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get schools overview",
      error: error.message,
    });
  }
};

// @desc    Get all users across all schools
// @route   GET /api/super-admin/users
// @access  Private (Super Admin)
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      school: schoolId,
      status,
    } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role && role !== "all") filter.role = role;
    if (schoolId) filter.school = schoolId;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const users = await User.find(filter)
      .select("-password")
      .populate("school", "name code")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users",
      error: error.message,
    });
  }
};

// Log activity helper function
const logActivity = async (
  type,
  description,
  performedBy,
  targetId,
  targetModel,
  school
) => {
  try {
    await ActivityLog.create({
      type,
      description,
      performedBy,
      targetId,
      targetModel,
      school,
      schoolName: school ? (await School.findById(school))?.name : null,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getPlatformHealth,
  getSchoolsOverview,
  getAllUsers,
  logActivity,
};
