const express = require("express");
const { protect, authorize, ownerOrAdmin } = require("../middleware/auth");
const { getSchoolFilter } = require("../middleware/schoolAuth");
const User = require("../models/User");

const router = express.Router();

router.use(protect);

router.get("/", authorize("admin", "principal", "super_admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Apply school filter so admins/principals only see their school's users
    const schoolFilter = getSchoolFilter(req);
    let query = { ...schoolFilter };

    if (req.query.role) {
      query.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const usersList = await User.find(query)
      .select("-password")
      .populate("school", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
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
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get users",
      error: error.message,
    });
  }
});

router.get("/:id", ownerOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get user",
      error: error.message,
    });
  }
});



router.patch("/:id", ownerOrAdmin, async (req, res) => {
  try {
    const allowedUpdates = ["name", "phone", "address"];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (req.user.role === "admin") {
      const adminUpdates = [
        "isActive",
        "role",
        "emailVerified",
        "phoneVerified",
      ];
      adminUpdates.forEach((key) => {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update user",
      error: error.message,
    });
  }
});



router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete user",
      error: error.message,
    });
  }
});




router.get("/role/:role", authorize("admin", "principal"), async (req, res) => {
  try {
    const role = req.params;
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
        message: `Invalid role. Valid roles: ${validRoles.join(", ")}`,
      });
    }

    const users = await User.find({ role, isActive: true })
      .select("-password")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        role,
        count: users.length,
        users,
      },
    });
  } catch (error) {
    console.error("Get users by role error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get users by role",
      error: error.message,
    });
  }
});


module.exports = router