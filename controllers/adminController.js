// // backend/controllers/adminController.js - ADMIN STUDENT MANAGEMENT
// const User = require("../models/User");
// const Course = require("../models/Course");
// const Enrollment = require("../models/Enrollment");
// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");
// const nodemailer = require("nodemailer");

// // Configure email transporter
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // @desc    Get all students
// // @route   GET /api/admin/students
// // @access  Private (Admin/Principal)
// const getStudents = async (req, res) => {
//   try {
//     const { page = 1, limit = 50, search } = req.query;

//     // Build filter
//     let filter = { role: "student" };
//     if (search) {
//       filter.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//       ];
//     }

//     const students = await User.find(filter)
//       .select("-password")
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await User.countDocuments(filter);

//     // Get enrollment counts for each student
//     const studentsWithEnrollments = await Promise.all(
//       students.map(async (student) => {
//         const enrollmentCount = await Enrollment.countDocuments({
//           student: student._id,
//         });
//         return {
//           ...student.toObject(),
//           enrollmentCount,
//         };
//       })
//     );

//     res.json({
//       success: true,
//       data: studentsWithEnrollments,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         total,
//         hasMore: page * limit < total,
//       },
//     });
//   } catch (error) {
//     console.error("Get students error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not fetch students",
//       error: error.message,
//     });
//   }
// };

// // @desc    Add new student
// // @route   POST /api/admin/students
// // @access  Private (Admin/Principal)
// const addStudent = async (req, res) => {
//   try {
//     const { name, email, sendCredentials = true } = req.body;

//     // Validate input
//     if (!name || !email) {
//       return res.status(400).json({
//         success: false,
//         message: "Name and email are required",
//       });
//     }

//     // Check if email already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email already exists",
//       });
//     }

//     // Generate temporary password
//     const temporaryPassword = crypto.randomBytes(8).toString("hex");
//     const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

//     // Create student
//     const student = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       role: "student",
//       isActive: true,
//       profile: {
//         firstName: name.split(" ")[0],
//         lastName: name.split(" ").slice(1).join(" ") || "",
//       },
//       accountCreated: {
//         method: "admin_created",
//         createdBy: req.user._id,
//         createdAt: new Date(),
//       },
//     });

//     // Send credentials email if requested
//     if (sendCredentials) {
//       try {
//         await sendCredentialsEmail({
//           studentName: name,
//           studentEmail: email,
//           temporaryPassword,
//           loginUrl: `${process.env.FRONTEND_URL}/login`,
//         });
//       } catch (emailError) {
//         console.error("Failed to send credentials email:", emailError);
//         // Don't fail the whole process if email fails
//       }
//     }

//     res.status(201).json({
//       success: true,
//       message: "Student added successfully",
//       data: {
//         student: {
//           _id: student._id,
//           name: student.name,
//           email: student.email,
//           role: student.role,
//           isActive: student.isActive,
//           createdAt: student.createdAt,
//         },
//         credentialsSent: sendCredentials,
//         temporaryPassword: sendCredentials ? temporaryPassword : undefined,
//       },
//     });
//   } catch (error) {
//     console.error("Add student error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not add student",
//       error: error.message,
//     });
//   }
// };

// // @desc    Bulk enroll student in courses
// // @route   POST /api/admin/bulk-enroll
// // @access  Private (Admin/Principal)
// const bulkEnrollStudent = async (req, res) => {
//   try {
//     const { studentId, courseIds } = req.body;

//     // Validate input
//     if (
//       !studentId ||
//       !courseIds ||
//       !Array.isArray(courseIds) ||
//       courseIds.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Student ID and course IDs array are required",
//       });
//     }

//     // Verify student exists
//     const student = await User.findById(studentId);
//     if (!student || student.role !== "student") {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found",
//       });
//     }

//     // Verify courses exist
//     const courses = await Course.find({ _id: { $in: courseIds } });
//     if (courses.length !== courseIds.length) {
//       return res.status(400).json({
//         success: false,
//         message: "One or more courses not found",
//       });
//     }

//     // Check for existing enrollments
//     const existingEnrollments = await Enrollment.find({
//       student: studentId,
//       course: { $in: courseIds },
//     });

//     const existingCourseIds = existingEnrollments.map((e) =>
//       e.course.toString()
//     );
//     const newCourseIds = courseIds.filter(
//       (id) => !existingCourseIds.includes(id)
//     );

//     // Create new enrollments
//     const enrollmentPromises = newCourseIds.map((courseId) =>
//       Enrollment.create({
//         student: studentId,
//         course: courseId,
//         status: "active",
//         enrolledAt: new Date(),
//         enrolledBy: req.user._id,
//         source: "admin_enrolled",
//       })
//     );

//     const newEnrollments = await Promise.all(enrollmentPromises);

//     // Update course stats
//     await Promise.all(
//       newCourseIds.map((courseId) =>
//         Course.findByIdAndUpdate(courseId, {
//           $inc: { "stats.totalStudents": 1 },
//         })
//       )
//     );

//     res.json({
//       success: true,
//       message: `Successfully enrolled student in ${newEnrollments.length} course(s)`,
//       data: {
//         student: {
//           _id: student._id,
//           name: student.name,
//           email: student.email,
//         },
//         enrollmentsCreated: newEnrollments.length,
//         existingEnrollments: existingEnrollments.length,
//         totalEnrollments: newEnrollments.length + existingEnrollments.length,
//       },
//     });
//   } catch (error) {
//     console.error("Bulk enroll error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not enroll student",
//       error: error.message,
//     });
//   }
// };

// // @desc    Send login credentials to student
// // @route   POST /api/admin/send-credentials/:studentId
// // @access  Private (Admin/Principal)
// const sendLoginCredentials = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const student = await User.findById(studentId);
//     if (!student || student.role !== "student") {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found",
//       });
//     }

//     // Generate new temporary password
//     const temporaryPassword = crypto.randomBytes(8).toString("hex");
//     const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

//     // Update student password
//     await User.findByIdAndUpdate(studentId, {
//       password: hashedPassword,
//     });

//     // Send credentials email
//     await sendCredentialsEmail({
//       studentName: student.name,
//       studentEmail: student.email,
//       temporaryPassword,
//       loginUrl: `${process.env.FRONTEND_URL}/login`,
//       isPasswordReset: true,
//     });

//     res.json({
//       success: true,
//       message: "Login credentials sent successfully",
//       data: {
//         emailSent: true,
//         temporaryPassword,
//       },
//     });
//   } catch (error) {
//     console.error("Send credentials error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not send credentials",
//       error: error.message,
//     });
//   }
// };

// // Helper function to send credentials email
// const sendCredentialsEmail = async ({
//   studentName,
//   studentEmail,
//   temporaryPassword,
//   loginUrl,
//   isPasswordReset = false,
// }) => {
//   const emailContent = `
//     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//       <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
//         <h1 style="margin: 0; font-size: 28px;">
//           🎓 ${
//             isPasswordReset
//               ? "Password Reset"
//               : "Welcome to Our Learning Platform!"
//           }
//         </h1>
//       </div>
      
//       <div style="padding: 30px; background: #f8f9fa;">
//         <h2 style="color: #333; margin-bottom: 20px;">Hi ${studentName}! 👋</h2>
        
//         <p style="font-size: 16px; color: #555; line-height: 1.6;">
//           ${
//             isPasswordReset
//               ? "Your password has been reset. Here are your new login credentials:"
//               : "Your learning account has been created! Here are your login credentials:"
//           }
//         </p>

//         <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea; margin: 20px 0;">
//           <h3 style="color: #667eea; margin-top: 0;">🔐 Your Login Credentials</h3>
//           <p style="margin: 10px 0;"><strong>Email:</strong> ${studentEmail}</p>
//           <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #f1f1f1; padding: 5px; border-radius: 4px;">${temporaryPassword}</code></p>
//           <p style="color: #e74c3c; font-size: 14px; margin-top: 15px;">
//             ⚠️ Please change your password after your first login for security.
//           </p>
//         </div>

//         <div style="text-align: center; margin: 30px 0;">
//           <a href="${loginUrl}" 
//              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
//             🚀 Login Now
//           </a>
//         </div>

//         <p style="color: #777; font-size: 14px; margin-top: 30px;">
//           Need help? Contact our support team at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>
//         </p>
//       </div>
//     </div>
//   `;

//   await transporter.sendMail({
//     from: `"Learning Platform" <${process.env.EMAIL_USER}>`,
//     to: studentEmail,
//     subject: isPasswordReset
//       ? `🔐 Password Reset - Learning Platform`
//       : `🎓 Welcome! Your learning account is ready`,
//     html: emailContent,
//   });

//   console.log(`📧 Credentials email sent to: ${studentEmail}`);
// };

// const linkStudentsToParent = async (req, res) => {
//   try {
//     const parentId = req.params.parentId;
//     const { studentIds } = req.body; // expects array of student user IDs

//     if (!Array.isArray(studentIds) || studentIds.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Student IDs required" });
//     }

//     const parent = await User.findById(parentId);
//     if (!parent || parent.role !== "parent") {
//       return res
//         .status(404)
//         .json({ success: false, message: "Parent not found or invalid role" });
//     }

//     // Remove duplicates - merge existing student IDs with new
//     const existingIds = parent.parentOf.map((id) => id.toString());
//     const newIds = studentIds.filter((id) => !existingIds.includes(id));
//     parent.parentOf = [...existingIds, ...newIds];

//     await parent.save();

//     res.json({
//       success: true,
//       message: "Students linked successfully",
//       parent,
//     });
//   } catch (error) {
//     console.error("Error linking students to parent:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// module.exports = {
//   getStudents,
//   addStudent,
//   bulkEnrollStudent,
//   sendLoginCredentials,
//   linkStudentsToParent,
// };




// backend/controllers/adminController.js - ADMIN STUDENT MANAGEMENT
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const School = require("../models/School");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { getSchoolFilter } = require("../middleware/schoolAuth");

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private (Admin/Principal)
const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    // Apply school filter
    const schoolFilter = getSchoolFilter(req);

    // Build filter
    let filter = { role: "student", ...schoolFilter };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(filter)
      .select("-password")
      .populate("school", "name code")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Get enrollment counts for each student (only for their school)
    const studentsWithEnrollments = await Promise.all(
      students.map(async (student) => {
        const enrollmentCount = await Enrollment.countDocuments({
          student: student._id,
          ...schoolFilter,
        });
        return {
          ...student.toObject(),
          enrollmentCount,
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithEnrollments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch students",
      error: error.message,
    });
  }
};

// @desc    Add new student
// @route   POST /api/admin/students
// @access  Private (Admin/Principal)
const addStudent = async (req, res) => {
  try {
    const { name, email, sendCredentials = true, schoolId } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // Determine school
    let school;
    if (req.user.role === 'super_admin') {
      school = schoolId;
      if (!school) {
        return res.status(400).json({
          success: false,
          message: 'Super admin must specify school for student',
        });
      }
    } else {
      school = req.user.school;
    }

    // Verify school exists
    const schoolDoc = await School.findById(school);
    if (!schoolDoc) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
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

    // Generate temporary password
    const temporaryPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create student
    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      school, // Add school reference
      isActive: true,
      profile: {
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" ") || "",
      },
      accountCreated: {
        method: "admin_created",
        createdBy: req.user._id,
        createdAt: new Date(),
      },
    });

    // Send credentials email if requested
    if (sendCredentials) {
      try {
        await sendCredentialsEmail({
          studentName: name,
          studentEmail: email,
          temporaryPassword,
          loginUrl: `${process.env.FRONTEND_URL}/login`,
          schoolName: schoolDoc.name,
        });
      } catch (emailError) {
        console.error("Failed to send credentials email:", emailError);
      }
    }

    // Populate school info for response
    await student.populate("school", "name code");

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          school: student.school,
          isActive: student.isActive,
          createdAt: student.createdAt,
        },
        credentialsSent: sendCredentials,
        temporaryPassword: sendCredentials ? temporaryPassword : undefined,
      },
    });
  } catch (error) {
    console.error("Add student error:", error);
    res.status(500).json({
      success: false,
      message: "Could not add student",
      error: error.message,
    });
  }
};

// @desc    Bulk enroll student in courses
// @route   POST /api/admin/bulk-enroll
// @access  Private (Admin/Principal)
const bulkEnrollStudent = async (req, res) => {
  try {
    const { studentId, courseIds } = req.body;

    // Validate input
    if (
      !studentId ||
      !courseIds ||
      !Array.isArray(courseIds) ||
      courseIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Student ID and course IDs array are required",
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // School access validation
    if (req.user.role !== 'super_admin' && 
        student.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot enroll student from different school",
      });
    }

    // Verify courses exist and belong to same school
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more courses not found",
      });
    }

    // Verify all courses belong to student's school
    const invalidCourses = courses.filter(
      (course) => course.school.toString() !== student.school.toString()
    );
    if (invalidCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot enroll student in courses from different school",
      });
    }

    // Check for existing enrollments
    const existingEnrollments = await Enrollment.find({
      student: studentId,
      course: { $in: courseIds },
    });

    const existingCourseIds = existingEnrollments.map((e) => e.course.toString());
    const newCourseIds = courseIds.filter(
      (id) => !existingCourseIds.includes(id)
    );

    // Create new enrollments
    const enrollmentPromises = newCourseIds.map((courseId) =>
      Enrollment.create({
        student: studentId,
        course: courseId,
        school: student.school, // Add school reference
        status: "active",
        enrolledAt: new Date(),
        enrolledBy: req.user._id,
        source: "admin_enrolled",
      })
    );

    const newEnrollments = await Promise.all(enrollmentPromises);

    // Update course stats
    await Promise.all(
      newCourseIds.map((courseId) =>
        Course.findByIdAndUpdate(courseId, {
          $inc: { "stats.totalStudents": 1 },
        })
      )
    );

    res.json({
      success: true,
      message: `Successfully enrolled student in ${newEnrollments.length} course(s)`,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          school: student.school,
        },
        enrollmentsCreated: newEnrollments.length,
        existingEnrollments: existingEnrollments.length,
        totalEnrollments: newEnrollments.length + existingEnrollments.length,
      },
    });
  } catch (error) {
    console.error("Bulk enroll error:", error);
    res.status(500).json({
      success: false,
      message: "Could not enroll student",
      error: error.message,
    });
  }
};

// @desc    Send login credentials to student
// @route   POST /api/admin/send-credentials/:studentId
// @access  Private (Admin/Principal)
const sendLoginCredentials = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId).populate("school", "name code");
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // School access validation
    if (req.user.role !== 'super_admin' && 
        student.school._id.toString() !== req.user.school.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot send credentials to student from different school",
      });
    }

    // Generate new temporary password
    const temporaryPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Update student password
    await User.findByIdAndUpdate(studentId, {
      password: hashedPassword,
    });

    // Send credentials email
    await sendCredentialsEmail({
      studentName: student.name,
      studentEmail: student.email,
      temporaryPassword,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      schoolName: student.school.name,
      isPasswordReset: true,
    });

    res.json({
      success: true,
      message: "Login credentials sent successfully",
      data: {
        emailSent: true,
        temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Send credentials error:", error);
    res.status(500).json({
      success: false,
      message: "Could not send credentials",
      error: error.message,
    });
  }
};

// Helper function to send credentials email
const sendCredentialsEmail = async ({
  studentName,
  studentEmail,
  temporaryPassword,
  loginUrl,
  schoolName,
  isPasswordReset = false,
}) => {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">
          🎓 ${isPasswordReset ? "Password Reset" : "Welcome to Our Learning Platform!"}
        </h1>
        ${schoolName ? `<p style="margin: 10px 0; font-size: 16px;">📚 ${schoolName}</p>` : ''}
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${studentName}! 👋</h2>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          ${isPasswordReset
            ? "Your password has been reset. Here are your new login credentials:"
            : "Your learning account has been created! Here are your login credentials:"}
        </p>

        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">🔐 Your Login Credentials</h3>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${studentEmail}</p>
          <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #f1f1f1; padding: 5px; border-radius: 4px;">${temporaryPassword}</code></p>
          <p style="color: #e74c3c; font-size: 14px; margin-top: 15px;">
            ⚠️ Please change your password after your first login for security.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🚀 Login Now
          </a>
        </div>

        <p style="color: #777; font-size: 14px; margin-top: 30px;">
          Need help? Contact our support team at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Learning Platform" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: isPasswordReset
      ? `🔐 Password Reset - Learning Platform`
      : `🎓 Welcome! Your learning account is ready`,
    html: emailContent,
  });

  console.log(`📧 Credentials email sent to: ${studentEmail}`);
};

const linkStudentsToParent = async (req, res) => {
  try {
    const parentId = req.params.parentId;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Student IDs required" 
      });
    }

    const parent = await User.findById(parentId);
    if (!parent || parent.role !== "parent") {
      return res.status(404).json({ 
        success: false, 
        message: "Parent not found or invalid role" 
      });
    }

    // School access validation
    if (req.user.role !== 'super_admin' && 
        parent.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot link students to parent from different school",
      });
    }

    // Verify all students belong to same school as parent
    const students = await User.find({ 
      _id: { $in: studentIds }, 
      role: "student" 
    });

    const invalidStudents = students.filter(
      (student) => student.school.toString() !== parent.school.toString()
    );

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot link students from different school to parent",
      });
    }

    // Remove duplicates - merge existing student IDs with new
    const existingIds = parent.parentOf.map((id) => id.toString());
    const newIds = studentIds.filter((id) => !existingIds.includes(id));
    parent.parentOf = [...existingIds, ...newIds];

    await parent.save();

    res.json({
      success: true,
      message: "Students linked successfully",
      parent,
    });
  } catch (error) {
    console.error("Error linking students to parent:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

module.exports = {
  getStudents,
  addStudent,
  bulkEnrollStudent,
  sendLoginCredentials,
  linkStudentsToParent,
};
