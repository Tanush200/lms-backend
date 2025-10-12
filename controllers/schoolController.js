const School = require("../models/School");

// Create a new school (super_admin only)
exports.createSchool = async (req, res) => {
  try {
    const { name, code, address, contact, logo, establishedYear, settings } =
      req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "School name and code are required",
      });
    }

    const school = await School.create({
      name,
      code,
      address,
      contact,
      logo,
      establishedYear,
      settings,
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
exports.listSchools = async (req, res) => {
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
exports.getSchool = async (req, res) => {
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
exports.updateSchool = async (req, res) => {
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
exports.deleteSchool = async (req, res) => {
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
