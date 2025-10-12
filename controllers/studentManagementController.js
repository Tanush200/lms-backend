// const User = require("../models/User");
// const Course = require("../models/Course");
// const Enrollment = require("../models/Enrollment");
// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");
// const emailService = require("../services/emailService"); // ✅ Use the email service

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

//     // Generate student ID
//     const studentCount = await User.countDocuments({ role: 'student' });
//     const studentId = `STU${Date.now()}${studentCount + 1}`;

//     // Create student
//     const student = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       role: "student",
//       studentId, // ✅ Add student ID
//       isActive: true,
//       isTemporaryPassword: true, // ✅ Flag for password change
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

//     // ✅ SEND CREDENTIALS EMAIL USING EMAIL SERVICE
//     let credentialsSent = false;
//     if (sendCredentials) {
//       try {
//         await emailService.sendStudentCredentials(email, temporaryPassword, name);
//         credentialsSent = true;
//         console.log("📧 Credentials email sent to:", email);
//       } catch (emailError) {
//         console.error("Failed to send credentials email:", emailError);
//         credentialsSent = false;
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
//           studentId: student.studentId,
//           role: student.role,
//           isActive: student.isActive,
//           createdAt: student.createdAt,
//         },
//         credentialsSent,
//         temporaryPassword, // For admin reference
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
//         status: "active",
//         enrolledAt: new Date(),
//         enrolledBy: req.user ? req.user._id : null,
//         source: "admin_enrolled",
//       })
//     );

//     const newEnrollments = await Promise.all(enrollmentPromises);

//     // Increment course stats for newly created enrollments
//     if (newEnrollments.length > 0) {
//       const Course = require("../models/Course");
//       const incPromises = newEnrollments.map((e) =>
//         Course.findByIdAndUpdate(e.course, { $inc: { "stats.totalStudents": 1 } })
//       );
//       await Promise.allSettled(incPromises);
//     }

//     // ✅ SEND ENROLLMENT NOTIFICATIONS FOR EACH NEW COURSE
//     if (newEnrollments.length > 0) {
//       const enrollmentPromises = newEnrollments.map(async (enrollment) => {
//         try {
//           const course = courses.find(c => c._id.toString() === enrollment.course.toString());
//           if (course) {
//             await emailService.sendEnrollmentNotification(
//               student.email,
//               course.title,
//               student.name
//             );
//           }
//         } catch (emailError) {
//           console.error(`Failed to send enrollment email for course ${enrollment.course}:`, emailError);
//         }
//       });
      
//       await Promise.allSettled(enrollmentPromises);
//     }

//     console.log(`✅ Successfully created ${newEnrollments.length} enrollments`);

//     res.json({
//       success: true,
//       message:
//         newEnrollments.length > 0
//           ? `Successfully enrolled student in ${newEnrollments.length} course(s)`
//           : "Student was already enrolled in all selected course(s)",
//       data: {
//         student: {
//           _id: student._id,
//           name: student.name,
//           email: student.email,
//         },
//         enrollmentsCreated: newEnrollments.length,
//         alreadyEnrolled: existingCourseIds.length,
//         totalSelected: courseIds.length,
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
//       isTemporaryPassword: true,
//     });

//     // ✅ SEND CREDENTIALS EMAIL USING EMAIL SERVICE
//     let emailSent = false;
//     try {
//       await emailService.sendStudentCredentials(
//         student.email,
//         temporaryPassword,
//         student.name
//       );
//       emailSent = true;
//       console.log("✅ Credentials sent successfully to:", student.email);
//     } catch (emailError) {
//       console.error("Email sending failed:", emailError);
//       emailSent = false;
//     }

//     res.json({
//       success: true,
//       message: emailSent
//         ? "Login credentials sent successfully via email"
//         : "Password reset successfully (email sending failed)",
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

// module.exports = {
//   getStudentsForAdmin,
//   addStudentManually,
//   enrollStudentInCourses,
//   sendStudentCredentials,
//   getStudentDetails,
// };



const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const { getSchoolFilter } = require("../middleware/schoolAuth");

// @desc    Get all students for admin
// @route   GET /api/student-management/students
// @access  Private (Admin/Principal)
const getStudentsForAdmin = async (req, res) => {
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

    // Get enrollment counts for each student
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

// @desc    Add new student manually
// @route   POST /api/student-management/add-student
// @access  Private (Admin/Principal)
const addStudentManually = async (req, res) => {
  try {
    const { name, email, sendCredentials = true, schoolId } = req.body;

    console.log("🎓 Adding new student:", { name, email, sendCredentials });

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // Determine school
    let school;
    if (req.user.role === "super_admin") {
      school = schoolId;
      if (!school) {
        return res.status(400).json({
          success: false,
          message: "Super admin must specify school for student",
        });
      }
    } else {
      // ✅ FIX: Extract _id from populated school
      school = req.user.school?._id || req.user.school;
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
    const studentCount = await User.countDocuments({ role: "student" });
    const studentId = `STU${Date.now()}${studentCount + 1}`;

    // Create student
    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      school,
      studentId,
      isActive: true,
      isTemporaryPassword: true,
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

    // Populate school info
    await student.populate("school", "name code");

    console.log("✅ Student created successfully:", student._id);

    // Send credentials email
    let credentialsSent = false;
    if (sendCredentials) {
      try {
        await emailService.sendStudentCredentials(
          email,
          temporaryPassword,
          name
        );
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
          school: student.school,
          isActive: student.isActive,
          createdAt: student.createdAt,
        },
        credentialsSent,
        temporaryPassword,
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

    // ✅ FIX: School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const studentSchoolId = student.school.toString();

      if (studentSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot enroll student from different school",
        });
      }
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
        school: student.school,
        status: "active",
        enrolledAt: new Date(),
        enrolledBy: req.user ? req.user._id : null,
        source: "admin_enrolled",
      })
    );

    const newEnrollments = await Promise.all(enrollmentPromises);

    // Increment course stats
    if (newEnrollments.length > 0) {
      const incPromises = newEnrollments.map((e) =>
        Course.findByIdAndUpdate(e.course, {
          $inc: { "stats.totalStudents": 1 },
        })
      );
      await Promise.allSettled(incPromises);
    }

    // Send enrollment notifications
    if (newEnrollments.length > 0) {
      const enrollmentPromises = newEnrollments.map(async (enrollment) => {
        try {
          const course = courses.find(
            (c) => c._id.toString() === enrollment.course.toString()
          );
          if (course) {
            await emailService.sendEnrollmentNotification(
              student.email,
              course.title,
              student.name
            );
          }
        } catch (emailError) {
          console.error(
            `Failed to send enrollment email for course ${enrollment.course}:`,
            emailError
          );
        }
      });

      await Promise.allSettled(enrollmentPromises);
    }

    console.log(`✅ Successfully created ${newEnrollments.length} enrollments`);

    res.json({
      success: true,
      message:
        newEnrollments.length > 0
          ? `Successfully enrolled student in ${newEnrollments.length} course(s)`
          : "Student was already enrolled in all selected course(s)",
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
        },
        enrollmentsCreated: newEnrollments.length,
        alreadyEnrolled: existingCourseIds.length,
        totalSelected: courseIds.length,
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

    // ✅ FIX: School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const studentSchoolId = student.school.toString();

      if (studentSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot send credentials to student from different school",
        });
      }
    }

    // Generate new temporary password
    const temporaryPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Update student password
    await User.findByIdAndUpdate(studentId, {
      password: hashedPassword,
      isTemporaryPassword: true,
    });

    // Send credentials email
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

    const student = await User.findById(studentId)
      .select("-password")
      .populate("school", "name code")
      .lean();

    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ✅ FIX: School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const studentSchoolId = (
        student.school?._id || student.school
      ).toString();

      if (studentSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot view student from different school",
        });
      }
    }

    // Get enrollments with course details
    const enrollments = await Enrollment.find({ student: studentId })
      .populate("course", "title category price")
      .populate("enrolledBy", "name")
      .populate("school", "name code")
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

