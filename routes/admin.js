// const express = require("express");
// const { protect, authorize } = require("../middleware/auth");
// const User = require("../models/User");
// const {
//   linkStudentsToParent,
//   getStudents,
// } = require("../controllers/adminController");
// const router = express.Router();

// // @desc    Create user (Admin only)
// // @route   POST /api/admin/users
// // @access  Private (Admin only)
// router.post("/users", protect, authorize("admin"), async (req, res) => {
//   try {
//     console.log("🔍 Request body:", req.body);
//     console.log("🔍 Request headers:", req.headers);
//     console.log("🔍 User creating:", req.user?.email);

//     const { name, email, password, role, phone, address } = req.body;

//     console.log("📝 Extracted data:", {
//       name,
//       email,
//       password: "***",
//       role,
//       phone,
//       address,
//     });

//     if (!name || !email || !password || !role) {
//       console.log("❌ Missing required fields:", {
//         name: !!name,
//         email: !!email,
//         password: !!password,
//         role: !!role,
//       });
//       return res.status(400).json({
//         success: false,
//         message: "Please provide name, email, password, and role",
//       });
//     }

//     const allowedRoles = [
//       "admin",
//       "principal",
//       "teacher",
//       "student",
//       "parent",
//       "accountant",
//       "librarian",
//     ];

//     if (!allowedRoles.includes(role)) {
//       console.log("❌ Invalid role:", role);
//       return res.status(400).json({
//         success: false,
//         message: "Invalid role specified",
//       });
//     }

//     console.log(
//       "🔍 Checking for existing user with email:",
//       email.toLowerCase()
//     );
//     const existingUser = await User.findOne({ email: email.toLowerCase() });
//     if (existingUser) {
//       console.log("❌ User already exists:", existingUser.email);
//       return res.status(400).json({
//         success: false,
//         message: "User already exists with this email",
//       });
//     }

//     let additionalFields = {};
//     if (role === "student") {
//       const studentCount = await User.countDocuments({ role: "student" });
//       additionalFields.studentId = `STU${Date.now()}${studentCount + 1}`;
//       console.log("🆔 Generated studentId:", additionalFields.studentId);
//     } else if (
//       ["teacher", "admin", "principal", "accountant", "librarian"].includes(
//         role
//       )
//     ) {
//       const employeeCount = await User.countDocuments({
//         role: {
//           $in: ["teacher", "admin", "principal", "accountant", "librarian"],
//         },
//       });
//       additionalFields.employeeId = `EMP${Date.now()}${employeeCount + 1}`;
//       console.log("🆔 Generated employeeId:", additionalFields.employeeId);
//     }

//     const userData = {
//       name,
//       email: email.toLowerCase(),
//       password,
//       role,
//       phone,
//       address,
//       ...additionalFields,
//       isActive: true,
//       emailVerified: true,
//     };

//     console.log("🔨 Creating user with data:", {
//       ...userData,
//       password: "***",
//     });

//     const user = await User.create(userData);

//     console.log("✅ User created successfully:", user.email);

//     user.password = undefined;

//     res.status(201).json({
//       success: true,
//       message: "User created successfully",
//       data: {
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           phone: user.phone,
//           studentId: user.studentId,
//           employeeId: user.employeeId,
//           isActive: user.isActive,
//           createdAt: user.createdAt,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("❌ Admin user creation error:", error);
//     console.error("❌ Error name:", error.name);
//     console.error("❌ Error message:", error.message);

//     if (error.name === "ValidationError") {
//       const validationErrors = Object.values(error.errors).map(
//         (err) => err.message
//       );
//       console.log("❌ Validation errors:", validationErrors);
//       return res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: validationErrors,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Error creating user",
//       error: error.message,
//     });
//   }
// });

// // @desc    Get all users (Admin only)
// // @route   GET /api/admin/users
// // @access  Private (Admin only)
// router.get("/users", protect, authorize("admin"), async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     let query = {};

//     if (req.query.role) {
//       query.role = req.query.role;
//     }

//     if (req.query.isActive !== undefined) {
//       query.isActive = req.query.isActive === "true";
//     }

//     if (req.query.search) {
//       query.$or = [
//         { name: { $regex: req.query.search, $options: "i" } },
//         { email: { $regex: req.query.search, $options: "i" } },
//       ];
//     }

//     const users = await User.find(query)
//       .select("-password")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     const total = await User.countDocuments(query);

//     res.json({
//       success: true,
//       data: {
//         users,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get admin users error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not get users",
//       error: error.message,
//     });
//   }
// });

// module.exports = router;

// router.post(
//   "/parents/:parentId/link-students",
//   protect,
//   authorize("admin"),
//   linkStudentsToParent
// );

// router.get(
//   "/parents/:parentId/children",
//   protect,
//   authorize("admin"),
//   async (req, res) => {
//     try {
//       const { parentId } = req.params;
//       const parent = await User.findById(parentId)
//         .select("-password")
//         .populate({ path: "parentOf", select: "name email role isActive" });

//       if (!parent || parent.role !== "parent") {
//         return res.status(404).json({
//           success: false,
//           message: "Parent not found or invalid role",
//         });
//       }

//       const children = Array.isArray(parent.parentOf) ? parent.parentOf : [];

//       return res.json({ success: true, data: { children } });
//     } catch (error) {
//       console.error("Get parent children (admin) error:", error);
//       return res
//         .status(500)
//         .json({
//           success: false,
//           message: "Server error",
//           error: error.message,
//         });
//     }
//   }
// );


// router.get("/students", protect, authorize("admin", "principal"), getStudents);



const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const User = require("../models/User");
const School = require("../models/School"); // ✅ Add this
const { getSchoolFilter } = require("../middleware/schoolAuth"); // ✅ Add this
const {
  linkStudentsToParent,
  getStudents,
} = require("../controllers/adminController");
const router = express.Router();

// @desc    Create user (Admin only)
// @route   POST /api/admin/users
// @access  Private (Admin only)
router.post(
  "/users",
  protect,
  authorize("admin", "super_admin"),
  async (req, res) => {
    // ✅ Add super_admin
    try {
      console.log("🔍 Request body:", req.body);
      console.log(
        "🔍 User creating:",
        req.user?.email,
        "Role:",
        req.user?.role
      );

      const { name, email, password, role, phone, address, schoolId } =
        req.body; // ✅ Add schoolId

      console.log("📝 Extracted data:", {
        name,
        email,
        password: "***",
        role,
        phone,
        address,
        schoolId,
      });

      if (!name || !email || !password || !role) {
        console.log("❌ Missing required fields");
        return res.status(400).json({
          success: false,
          message: "Please provide name, email, password, and role",
        });
      }

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

      // ✅ Determine school
      let school;
      if (req.user.role === "super_admin") {
        school = schoolId;
        if (!school) {
          return res.status(400).json({
            success: false,
            message: "Super admin must specify school for user",
          });
        }
      } else {
        school = req.user.school;
      }

      // ✅ Verify school exists
      const schoolDoc = await School.findById(school);
      if (!schoolDoc) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

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

      const userData = {
        name,
        email: email.toLowerCase(),
        password,
        role,
        school, // ✅ Add school
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

      const user = await User.create(userData);
      await user.populate("school", "name code"); // ✅ Populate school

      console.log("✅ User created successfully:", user.email);

      user.password = undefined;

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            school: user.school, // ✅ Include school
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
  }
);

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get(
  "/users",
  protect,
  authorize("admin", "super_admin"),
  async (req, res) => {
    // ✅ Add super_admin
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // ✅ Apply school filter
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

      console.log("🔍 Query filter:", query); // ✅ Debug log

      const users = await User.find(query)
        .select("-password")
        .populate("school", "name code") // ✅ Populate school
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      console.log(`✅ Found ${users.length} users for school filter`); // ✅ Debug log

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
      console.error("Get admin users error:", error);
      res.status(500).json({
        success: false,
        message: "Could not get users",
        error: error.message,
      });
    }
  }
);

// Other routes remain the same...
router.post(
  "/parents/:parentId/link-students",
  protect,
  authorize("admin", "super_admin"), // ✅ Add super_admin
  linkStudentsToParent
);

router.get(
  "/parents/:parentId/children",
  protect,
  authorize("admin", "super_admin"), // ✅ Add super_admin
  async (req, res) => {
    try {
      const { parentId } = req.params;

      // ✅ Apply school filter
      const schoolFilter = getSchoolFilter(req);

      const parent = await User.findOne({ _id: parentId, ...schoolFilter })
        .select("-password")
        .populate({ path: "parentOf", select: "name email role isActive" })
        .populate("school", "name code");

      if (!parent || parent.role !== "parent") {
        return res.status(404).json({
          success: false,
          message: "Parent not found or invalid role",
        });
      }

      const children = Array.isArray(parent.parentOf) ? parent.parentOf : [];

      return res.json({ success: true, data: { children } });
    } catch (error) {
      console.error("Get parent children (admin) error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

router.get(
  "/students",
  protect,
  authorize("admin", "principal", "super_admin"),
  getStudents
); // ✅ Add super_admin

module.exports = router;
