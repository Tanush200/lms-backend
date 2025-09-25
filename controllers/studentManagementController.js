// // backend/controllers/studentManagementController.js - FIXED VERSION
// const User = require("../models/User");
// const Course = require("../models/Course");
// const Enrollment = require("../models/Enrollment");
// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");
// const nodemailer = require("nodemailer");

// // ✅ Fixed: createTransport (not createTransporter)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // @desc    Get all students for admin
// // @route   GET /api/student-management/students
// // @access  Private (Admin/Principal)
// const getStudentsForAdmin = async (req, res) => {
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

// // @desc    Add new student manually
// // @route   POST /api/student-management/add-student
// // @access  Private (Admin/Principal)
// const addStudentManually = async (req, res) => {
//   try {
//     const { name, email, sendCredentials = true } = req.body;

//     console.log("🎓 Adding new student:", { name, email, sendCredentials });

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
//         createdBy: req.user ? req.user._id : null,
//         createdAt: new Date(),
//       },
//     });

//     console.log("✅ Student created successfully:", student._id);

//     // Send credentials email if requested and email config exists
//     if (sendCredentials && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
//       try {
//         await sendCredentialsEmail({
//           studentName: name,
//           studentEmail: email,
//           temporaryPassword,
//           loginUrl: `${
//             process.env.FRONTEND_URL || "http://localhost:3000"
//           }/login`,
//         });
//         console.log("📧 Credentials email sent to:", email);
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
//         credentialsSent: sendCredentials && process.env.EMAIL_USER,
//         temporaryPassword: temporaryPassword, // ✅ Always return for admin reference
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

// // @desc    Enroll student in multiple courses
// // @route   POST /api/student-management/enroll-courses
// // @access  Private (Admin/Principal)
// const enrollStudentInCourses = async (req, res) => {
//   try {
//     const { studentId, courseIds } = req.body;

//     console.log("📚 Enrolling student in courses:", { studentId, courseIds });

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

//     console.log(
//       `📊 Enrollment check - Existing: ${existingCourseIds.length}, New: ${newCourseIds.length}`
//     );

//     // Create new enrollments
//     const enrollmentPromises = newCourseIds.map((courseId) =>
//       Enrollment.create({
//         student: studentId,
//         course: courseId,
//         status: "active", // Direct activation for admin-enrolled students
//         enrolledAt: new Date(),
//         enrolledBy: req.user ? req.user._id : null,
//         source: "admin_enrolled",
//       })
//     );

//     const newEnrollments = await Promise.all(enrollmentPromises);

//     // Update course stats (if the field exists)
//     await Promise.all(
//       newCourseIds.map(async (courseId) => {
//         try {
//           await Course.findByIdAndUpdate(courseId, {
//             $inc: { "stats.totalStudents": 1 },
//           });
//         } catch (err) {
//           // If stats field doesn't exist, that's okay
//           console.log("Stats field not found for course:", courseId);
//         }
//       })
//     );

//     console.log(`✅ Successfully created ${newEnrollments.length} enrollments`);

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
//         coursesEnrolled: courses.map((course) => ({
//           _id: course._id,
//           title: course.title,
//           enrolled: !existingCourseIds.includes(course._id.toString()),
//         })),
//       },
//     });
//   } catch (error) {
//     console.error("Enroll student error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not enroll student",
//       error: error.message,
//     });
//   }
// };

// // @desc    Send/resend login credentials
// // @route   POST /api/student-management/send-credentials/:studentId
// // @access  Private (Admin/Principal)
// const sendStudentCredentials = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     console.log("📧 Sending credentials to student:", studentId);

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

//     // Send credentials email if email config exists
//     let emailSent = false;
//     if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
//       try {
//         await sendCredentialsEmail({
//           studentName: student.name,
//           studentEmail: student.email,
//           temporaryPassword,
//           loginUrl: `${
//             process.env.FRONTEND_URL || "http://localhost:3000"
//           }/login`,
//           isPasswordReset: true,
//         });
//         emailSent = true;
//         console.log("✅ Credentials sent successfully to:", student.email);
//       } catch (emailError) {
//         console.error("Email sending failed:", emailError);
//       }
//     }

//     res.json({
//       success: true,
//       message: emailSent
//         ? "Login credentials sent successfully"
//         : "Password reset successfully (email not configured)",
//       data: {
//         emailSent,
//         temporaryPassword,
//         studentEmail: student.email,
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

// // @desc    Get student details with enrollments
// // @route   GET /api/student-management/student/:studentId
// // @access  Private (Admin/Principal)
// const getStudentDetails = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const student = await User.findById(studentId).select("-password").lean();

//     if (!student || student.role !== "student") {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found",
//       });
//     }

//     // Get enrollments with course details
//     const enrollments = await Enrollment.find({ student: studentId })
//       .populate("course", "title category price")
//       .populate("enrolledBy", "name")
//       .sort({ enrolledAt: -1 });

//     res.json({
//       success: true,
//       data: {
//         student: {
//           ...student,
//           enrollmentCount: enrollments.length,
//         },
//         enrollments,
//       },
//     });
//   } catch (error) {
//     console.error("Get student details error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not fetch student details",
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
//   // ✅ Only try to send email if transporter is configured
//   if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
//     console.log("📧 Email not configured, skipping email sending");
//     return;
//   }

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

//         <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0;">
//           <h4 style="color: #28a745; margin-top: 0;">✅ What's Next?</h4>
//           <ul style="color: #555; padding-left: 20px;">
//             <li>Login to your account using the credentials above</li>
//             <li>Change your password for security</li>
//             <li>Complete your profile setup</li>
//             <li>Start learning and track your progress</li>
//           </ul>
//         </div>

//         <p style="color: #777; font-size: 14px; margin-top: 30px;">
//           Need help? Contact our support team at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>
//         </p>
//       </div>
//     </div>
//   `;

//   try {
//     await transporter.sendMail({
//       from: `"Learning Platform" <${process.env.EMAIL_USER}>`,
//       to: studentEmail,
//       subject: isPasswordReset
//         ? `🔐 Password Reset - Learning Platform`
//         : `🎓 Welcome! Your learning account is ready`,
//       html: emailContent,
//     });

//     console.log(`📧 Credentials email sent to: ${studentEmail}`);
//   } catch (error) {
//     console.error("Failed to send email:", error);
//     throw error;
//   }
// };

// module.exports = {
//   getStudentsForAdmin,
//   addStudentManually,
//   enrollStudentInCourses,
//   sendStudentCredentials,
//   getStudentDetails,
// };


// backend/controllers/studentManagementController.js - UPDATED WITH EMAIL SERVICE
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const emailService = require("../services/emailService"); // ✅ Use the email service

// @desc    Get all students for admin
// @route   GET /api/student-management/students
// @access  Private (Admin/Principal)
const getStudentsForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    // Build filter
    let filter = { role: "student" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Get enrollment counts for each student
    const studentsWithEnrollments = await Promise.all(
      students.map(async (student) => {
        const enrollmentCount = await Enrollment.countDocuments({
          student: student._id,
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

// @desc    Add new student manually
// @route   POST /api/student-management/add-student
// @access  Private (Admin/Principal)
const addStudentManually = async (req, res) => {
  try {
    const { name, email, sendCredentials = true } = req.body;

    console.log("🎓 Adding new student:", { name, email, sendCredentials });

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
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

    // Generate student ID
    const studentCount = await User.countDocuments({ role: 'student' });
    const studentId = `STU${Date.now()}${studentCount + 1}`;

    // Create student
    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      studentId, // ✅ Add student ID
      isActive: true,
      isTemporaryPassword: true, // ✅ Flag for password change
      profile: {
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" ") || "",
      },
      accountCreated: {
        method: "admin_created",
        createdBy: req.user ? req.user._id : null,
        createdAt: new Date(),
      },
    });

    console.log("✅ Student created successfully:", student._id);

    // ✅ SEND CREDENTIALS EMAIL USING EMAIL SERVICE
    let credentialsSent = false;
    if (sendCredentials) {
      try {
        await emailService.sendStudentCredentials(email, temporaryPassword, name);
        credentialsSent = true;
        console.log("📧 Credentials email sent to:", email);
      } catch (emailError) {
        console.error("Failed to send credentials email:", emailError);
        credentialsSent = false;
      }
    }

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId,
          role: student.role,
          isActive: student.isActive,
          createdAt: student.createdAt,
        },
        credentialsSent,
        temporaryPassword, // For admin reference
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

// @desc    Enroll student in multiple courses
// @route   POST /api/student-management/enroll-courses
// @access  Private (Admin/Principal)
const enrollStudentInCourses = async (req, res) => {
  try {
    const { studentId, courseIds } = req.body;

    console.log("📚 Enrolling student in courses:", { studentId, courseIds });

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

    // Verify courses exist
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more courses not found",
      });
    }

    // Check for existing enrollments
    const existingEnrollments = await Enrollment.find({
      student: studentId,
      course: { $in: courseIds },
    });

    const existingCourseIds = existingEnrollments.map((e) =>
      e.course.toString()
    );
    const newCourseIds = courseIds.filter(
      (id) => !existingCourseIds.includes(id)
    );

    console.log(
      `📊 Enrollment check - Existing: ${existingCourseIds.length}, New: ${newCourseIds.length}`
    );

    // Create new enrollments
    const enrollmentPromises = newCourseIds.map((courseId) =>
      Enrollment.create({
        student: studentId,
        course: courseId,
        status: "active",
        enrolledAt: new Date(),
        enrolledBy: req.user ? req.user._id : null,
        source: "admin_enrolled",
      })
    );

    const newEnrollments = await Promise.all(enrollmentPromises);

    // ✅ SEND ENROLLMENT NOTIFICATIONS FOR EACH NEW COURSE
    if (newEnrollments.length > 0) {
      const enrollmentPromises = newEnrollments.map(async (enrollment) => {
        try {
          const course = courses.find(c => c._id.toString() === enrollment.course.toString());
          if (course) {
            await emailService.sendEnrollmentNotification(
              student.email,
              course.title,
              student.name
            );
          }
        } catch (emailError) {
          console.error(`Failed to send enrollment email for course ${enrollment.course}:`, emailError);
        }
      });
      
      await Promise.allSettled(enrollmentPromises);
    }

    console.log(`✅ Successfully created ${newEnrollments.length} enrollments`);

    res.json({
      success: true,
      message: `Successfully enrolled student in ${newEnrollments.length} course(s)`,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
        },
        enrollmentsCreated: newEnrollments.length,
        existingEnrollments: existingEnrollments.length,
        totalEnrollments: newEnrollments.length + existingEnrollments.length,
        coursesEnrolled: courses.map((course) => ({
          _id: course._id,
          title: course.title,
          enrolled: !existingCourseIds.includes(course._id.toString()),
        })),
      },
    });
  } catch (error) {
    console.error("Enroll student error:", error);
    res.status(500).json({
      success: false,
      message: "Could not enroll student",
      error: error.message,
    });
  }
};

// @desc    Send/resend login credentials
// @route   POST /api/student-management/send-credentials/:studentId
// @access  Private (Admin/Principal)
const sendStudentCredentials = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log("📧 Sending credentials to student:", studentId);

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Generate new temporary password
    const temporaryPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Update student password
    await User.findByIdAndUpdate(studentId, {
      password: hashedPassword,
      isTemporaryPassword: true,
    });

    // ✅ SEND CREDENTIALS EMAIL USING EMAIL SERVICE
    let emailSent = false;
    try {
      await emailService.sendStudentCredentials(
        student.email,
        temporaryPassword,
        student.name
      );
      emailSent = true;
      console.log("✅ Credentials sent successfully to:", student.email);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      emailSent = false;
    }

    res.json({
      success: true,
      message: emailSent
        ? "Login credentials sent successfully via email"
        : "Password reset successfully (email sending failed)",
      data: {
        emailSent,
        temporaryPassword,
        studentEmail: student.email,
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

// @desc    Get student details with enrollments
// @route   GET /api/student-management/student/:studentId
// @access  Private (Admin/Principal)
const getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId).select("-password").lean();

    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get enrollments with course details
    const enrollments = await Enrollment.find({ student: studentId })
      .populate("course", "title category price")
      .populate("enrolledBy", "name")
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      data: {
        student: {
          ...student,
          enrollmentCount: enrollments.length,
        },
        enrollments,
      },
    });
  } catch (error) {
    console.error("Get student details error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch student details",
      error: error.message,
    });
  }
};

module.exports = {
  getStudentsForAdmin,
  addStudentManually,
  enrollStudentInCourses,
  sendStudentCredentials,
  getStudentDetails,
};
