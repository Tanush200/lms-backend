const School = require("../models/School");

// Create a new school (super_admin only)
const createSchool = async (req, res) => {
  try {
    const {
      name,
      code,
      email,
      phone,
      logo,
      address,
      city,
      state,
      zipCode,
      country,
      website,
      description,
      isActive,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "School name and code are required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "School email is required",
      });
    }

    const school = await School.create({
      name,
      code,
      email,
      phone,
      logo,
      address,
      city,
      state,
      zipCode,
      country,
      website,
      description,
      isActive: isActive !== undefined ? !!isActive : true,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      data: { school },
    });
  } catch (error) {
    console.error("Create school error:", error);
    res.status(500).json({
      success: false,
      message: "Could not create school",
      error: error.message,
    });
  }
};

// List all schools (super_admin sees all, admin sees only their school)
const listSchools = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let filter = {};

    if (req.user.role === "admin") {
      filter._id = req.user.school; // Admin sees only their school
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const schools = await School.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ name: 1 });

    const total = await School.countDocuments(filter);

    res.json({
      success: true,
      data: schools,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List schools error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch schools",
      error: error.message,
    });
  }
};

// Get single school
const getSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.json({
      success: true,
      data: { school },
    });
  } catch (error) {
    console.error("Get school error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch school",
      error: error.message,
    });
  }
};

// Update school
const updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const updates = req.body;

    const school = await School.findByIdAndUpdate(
      schoolId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.json({
      success: true,
      data: { school },
    });
  } catch (error) {
    console.error("Update school error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update school",
      error: error.message,
    });
  }
};

// Delete school (super_admin only)
const deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findByIdAndDelete(schoolId);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error) {
    console.error("Delete school error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete school",
      error: error.message,
    });
  }
};

const getSchoolStats = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const [totalUsers, totalStudents, totalTeachers, totalCourses] =
      await Promise.all([
        User.countDocuments({ school: req.params.id }),
        User.countDocuments({ school: req.params.id, role: "student" }),
        User.countDocuments({ school: req.params.id, role: "teacher" }),
        Course.countDocuments({ school: req.params.id }),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalCourses,
      },
    });
  } catch (error) {
    console.error("Get school stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get school statistics",
      error: error.message,
    });
  }
};

// @desc    Toggle school status (activate/deactivate)
// @route   PATCH /api/schools/:id/toggle-status
// @access  Private (Super Admin)
const toggleSchoolStatus = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    school.isActive = !school.isActive;
    await school.save();

    // Log activity
    const { logActivity } = require("./superAdminController");
    await logActivity(
      "school_updated",
      `School ${school.name} ${school.isActive ? "activated" : "deactivated"}`,
      req.user._id,
      school._id,
      "School",
      school._id
    );

    res.json({
      success: true,
      message: `School ${
        school.isActive ? "activated" : "deactivated"
      } successfully`,
      data: school,
    });
  } catch (error) {
    console.error("Toggle school status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle school status",
      error: error.message,
    });
  }
};

module.exports = {
  createSchool,
  listSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  getSchoolStats,
  toggleSchoolStatus,
};