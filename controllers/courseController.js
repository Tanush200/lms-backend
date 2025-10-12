// const Course = require("../models/Course");
// const Enrollment = require("../models/Enrollment");
// const User = require("../models/User");
// const { deleteFile } = require("../config/cloudinary");
// const { getSchoolFilter } = require("../middleware/schoolAuth");




// const createCourse = async (req, res) => {
//   try {
//     console.log("📝 Creating course with body:", req.body);
//     console.log("📷 File received:", req.file ? "Yes" : "No");

//     const {
//       title,
//       description,
//       shortDescription,
//       subject,
//       class: courseClass,
//       category,
//       level,
//       maxStudents,
//       modules, // ✅ Accept modules
//       startDate,
//       endDate,
//       enrollmentDeadline,
//       allowSelfEnrollment,
//       requireApproval,
//     } = req.body;

//     // Validation
//     if (!title || !description || !subject || !courseClass) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide title, description, subject, and class",
//       });
//     }

//     // Role validation
//     const allowedRoles = ["admin", "principal", "teacher"];
//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({
//         success: false,
//         message: "Only teachers, principals, and admins can create courses",
//       });
//     }

//     // ✅ Build course data
//     const courseData = {
//       title,
//       description,
//       shortDescription,
//       subject,
//       class: courseClass,
//       category: category || "academic",
//       level: level || "beginner",
//       instructor: req.user._id,
//       maxStudents: parseInt(maxStudents) || 1000, // ✅ Use provided value
//       startDate: startDate ? new Date(startDate) : null,
//       endDate: endDate ? new Date(endDate) : null,
//       enrollmentDeadline: enrollmentDeadline
//         ? new Date(enrollmentDeadline)
//         : null,
//       allowSelfEnrollment:
//         allowSelfEnrollment !== undefined ? allowSelfEnrollment : true,
//       requireApproval: requireApproval !== undefined ? requireApproval : false,
//       status: "draft",
//     };

//     // ✅ Handle thumbnail upload
//     if (req.file) {
//       courseData.thumbnail = {
//         url: req.file.path,
//         public_id: req.file.filename,
//       };
//       console.log("📷 Thumbnail saved:", courseData.thumbnail);
//     }

//     // ✅ Handle modules
//     if (modules) {
//       try {
//         let parsedModules;

//         // Parse modules if they come as JSON string
//         if (typeof modules === "string") {
//           parsedModules = JSON.parse(modules);
//         } else {
//           parsedModules = modules;
//         }

//         // Ensure modules is an array
//         if (Array.isArray(parsedModules)) {
//           courseData.modules = parsedModules.map((module, index) => ({
//             title: module.title || `Module ${index + 1}`,
//             description: module.description || "",
//             order: module.order !== undefined ? module.order : index,
//             materials: [], // Initialize empty materials array
//             isRequired:
//               module.isRequired !== undefined ? module.isRequired : true,
//           }));
//           console.log("📚 Modules processed:", courseData.modules.length);
//         } else {
//           courseData.modules = [];
//         }
//       } catch (error) {
//         console.error("Error parsing modules:", error);
//         courseData.modules = [];
//       }
//     } else {
//       courseData.modules = [];
//     }

//     console.log("📝 Final course data:", courseData);

//     // Create course
//     const course = await Course.create(courseData);
//     await course.populate("instructor", "name email role");

//     res.status(201).json({
//       success: true,
//       message: "Course created successfully",
//       data: course, // ✅ Return course directly
//     });
//   } catch (error) {
//     console.error("Create course error:", error);

//     if (error.name === "ValidationError") {
//       const errors = Object.values(error.errors).map((err) => err.message);
//       return res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Could not create course",
//       error: error.message,
//     });
//   }
// };



// const getCourses = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       category,
//       level,
//       search,
//       status,
//       isPublic,
//       instructor
//     } = req.query;

//     // Build filter object
//     const filter = {};

//     // ✅ Filter by publication status
//     if (status) {
//       filter.status = status;
//     }
    
//     if (isPublic === 'true') {
//       filter.isPublic = true;
//     }

//     if (category) {
//       filter.category = category;
//     }

//     if (level) {
//       filter.level = level;
//     }

//     if (instructor) {
//       filter.instructor = instructor;
//     }

//     // Search functionality
//     if (search) {
//       filter.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { description: { $regex: search, $options: 'i' } },
//         { subject: { $regex: search, $options: 'i' } }
//       ];
//     }

//     console.log("📋 Course filter:", filter);

//     const courses = await Course.find(filter)
//       .populate('instructor', 'name email')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Course.countDocuments(filter);

//     res.json({
//       success: true,
//       data: courses,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         total,
//         hasMore: page * limit < total
//       }
//     });
//   } catch (error) {
//     console.error('Get courses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Could not fetch courses',
//       error: error.message
//     });
//   }
// };

// const getCourse = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;
//     const userRole = req.user.role;

//     console.log(`🔍 Getting course ${id} for user ${userId} (${userRole})`);

//     let query = { _id: id };

//     // ✅ Check if user is the course owner (instructor/creator)
//     const Course = require('../models/Course');
//     const isOwner = await Course.findOne({
//       _id: id,
//       $or: [
//         { instructor: userId },
//         { createdBy: userId }
//       ]
//     });

//     console.log(`👤 User is owner: ${!!isOwner}`);

//     // ✅ Check if user is enrolled in the course (for students)
//     let isEnrolled = false;
//     if (userRole === 'student') {
//       const Enrollment = require('../models/Enrollment');
//       const enrollment = await Enrollment.findOne({
//         student: userId,
//         course: id,
//         status: { $in: ['active', 'completed'] }
//       });
//       isEnrolled = !!enrollment;
//       console.log(`🎓 Student enrollment status: ${isEnrolled}`);
//     }

//     if (!['admin', 'principal'].includes(userRole) && !isOwner && !isEnrolled) {
//       query.status = 'published';
//       query.isPublic = true;
//       console.log("🔒 Non-owner, non-enrolled access - requiring published + public");
//     } else {
//       console.log("✅ Owner, admin, or enrolled access - allowing any status");
//     }

//     const course = await Course.findOne(query)
//       .populate('instructor', 'name email')
//       // .populate('createdBy', 'name email');

//     if (!course) {
//       console.log("❌ Course not found with query:", query);
//       return res.status(404).json({
//         success: false,
//         message: `Course not found or you don't have access to view this course. Course ID: ${id}`
//       });
//     }

//     console.log("✅ Course found:", {
//       id: course._id,
//       title: course.title,
//       status: course.status,
//       isPublic: course.isPublic,
//       instructor: course.instructor?._id,
//       createdBy: course.createdBy?._id
//     });

//     res.json({
//       success: true,
//       data: course
//     });
//   } catch (error) {
//     console.error('❌ Error in getCourse:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while fetching course',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// };



// const updateCourse = async (req, res) => {
//   try {
//     let course = await Course.findById(req.params.id);

//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found",
//       });
//     }

//     // Authorization check
//     const isInstructor = course.instructor.toString() === req.user._id.toString();
//     const isAssistant = course.assistantInstructors.includes(req.user._id);
//     const isAdmin = ["admin", "principal"].includes(req.user.role);

//     if (!isInstructor && !isAssistant && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to update this course",
//       });
//     }

//     // Prepare updates
//     const allowedUpdates = [
//       "title",
//       "description",
//       "shortDescription",
//       "subject",
//       "class",
//       "category",
//       "level",
//       "maxStudents",
//       "modules", // ✅ Allow modules update
//       "startDate",
//       "endDate",
//       "enrollmentDeadline",
//       "allowSelfEnrollment",
//       "requireApproval",
//     ];

//     if (isAdmin || isInstructor) {
//       allowedUpdates.push("status", "isPublic");
//     }

//     if (isAdmin) {
//       allowedUpdates.push("instructor", "assistantInstructors");
//     }

//     const updates = {};
//     Object.keys(req.body).forEach((key) => {
//       if (allowedUpdates.includes(key)) {
//         if (key === 'modules' && req.body[key]) {
//           // Handle modules update
//           try {
//             let parsedModules;
//             if (typeof req.body[key] === 'string') {
//               parsedModules = JSON.parse(req.body[key]);
//             } else {
//               parsedModules = req.body[key];
//             }
            
//             if (Array.isArray(parsedModules)) {
//               updates[key] = parsedModules.map((module, index) => ({
//                 title: module.title || `Module ${index + 1}`,
//                 description: module.description || '',
//                 order: module.order !== undefined ? module.order : index,
//                 materials: module.materials || [],
//                 isRequired: module.isRequired !== undefined ? module.isRequired : true
//               }));
//             }
//           } catch (error) {
//             console.error('Error parsing modules in update:', error);
//           }
//         } else {
//           updates[key] = req.body[key];
//         }
//       }
//     });

//     // ✅ Handle thumbnail update
//     if (req.file) {
//       // Delete old thumbnail if exists
//       if (course.thumbnail && course.thumbnail.public_id) {
//         try {
//           await deleteFile(course.thumbnail.public_id);
//         } catch (error) {
//           console.error('Error deleting old thumbnail:', error);
//         }
//       }
      
//       // Set new thumbnail
//       updates.thumbnail = {
//         url: req.file.path,
//         public_id: req.file.filename
//       };
//     }

//     // Update course
//     course = await Course.findByIdAndUpdate(
//       req.params.id,
//       { ...updates, updatedAt: new Date() },
//       { new: true, runValidators: true }
//     )
//       .populate("instructor", "name email")
//       .populate("assistantInstructors", "name email");

//     res.json({
//       success: true,
//       message: "Course updated successfully",
//       data: course,
//     });
//   } catch (error) {
//     console.error("Update course error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not update course",
//       error: error.message,
//     });
//   }
// };

// const deleteCourse = async (req, res) => {
//   try {
//     const course = await Course.findById(req.params.id);

//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found",
//       });
//     }


//     const isInstructor =
//       course.instructor.toString() === req.user._id.toString();
//     const isAdmin = ["admin", "principal"].includes(req.user.role);

//     if (!isInstructor && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to delete this course",
//       });
//     }

//     const enrollmentCount = await Enrollment.countDocuments({
//       course: course._id,
//       status: { $in: ["active", "completed"] },
//     });

//     if (enrollmentCount > 0 && !isAdmin) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Cannot delete course with active enrollments. Please contact administrator.",
//       });
//     }


//     for (const material of course.materials) {
//       if (material.public_id) {
//         try {
//           await deleteFile(material.public_id);
//         } catch (error) {
//           console.error("Error deleting file:", error);
//         }
//       }
//     }


//     if (course.thumbnail && course.thumbnail.public_id) {
//       try {
//         await deleteFile(course.thumbnail.public_id);
//       } catch (error) {
//         console.error("Error deleting thumbnail:", error);
//       }
//     }


//     await Course.findByIdAndDelete(req.params.id);

//     res.json({
//       success: true,
//       message: "Course deleted successfully",
//     });
//   } catch (error) {
//     console.error("Delete course error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not delete course",
//       error: error.message,
//     });
//   }
// };

// // @desc    Get courses by instructor
// // @route   GET /api/courses/instructor/:instructorId
// // @access  Private
// const getCoursesByInstructor = async (req, res) => {
//   try {
//     const { instructorId } = req.params;

//     const instructor = await User.findById(instructorId);
//     if (!instructor) {
//       return res.status(404).json({
//         success: false,
//         message: "Instructor not found",
//       });
//     }

//     const courses = await Course.find({
//       $or: [
//         { instructor: instructorId },
//         { assistantInstructors: instructorId },
//       ],
//     })
//       .populate("instructor", "name email")
//       .select("-materials")
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       data: {
//         instructor: {
//           id: instructor._id,
//           name: instructor.name,
//           email: instructor.email,
//         },
//         coursesCount: courses.length,
//         courses,
//       },
//     });
//   } catch (error) {
//     console.error("Get instructor courses error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not get instructor courses",
//       error: error.message,
//     });
//   }
// };

// const getPublicCourse = async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     console.log("🔍 getPublicCourse called with courseId:", courseId);

//     // ✅ Find only published courses for public access
//     const course = await Course.findOne({
//       _id: courseId,
//       status: "published",
//       isPublic: true,
//     })
//       .populate("instructor", "name email")
//       .populate("modules.materials", "title type duration")
//       .select("-materials -privateNotes -grading -settings.joinCode"); // Exclude sensitive data

//     console.log("🔍 Course found:", !!course);
//     if (course) {
//       console.log("📚 Course details:", {
//         id: course._id,
//         title: course.title,
//         status: course.status,
//         isPublic: course.isPublic
//       });
//     }

//     if (!course) {
//       console.log("❌ Course not found or not public");
//       return res.status(404).json({
//         success: false,
//         message: "Course not found or not available publicly",
//       });
//     }

//     // ✅ Add basic stats (safe for public)
//     const enrollmentCount = await Enrollment.countDocuments({
//       course: courseId,
//       status: "active",
//     });

//     // ✅ Handle missing Rating model gracefully
//     let avgRating = [{ average: 0, count: 0 }];
//     try {
//       const Rating = require("../models/Rating");
//       avgRating = await Rating.aggregate([
//         { $match: { course: courseId } },
//         {
//           $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
//         },
//       ]);
//     } catch (ratingError) {
//       console.warn("Rating model not found, using default values:", ratingError.message);
//     }

//     const courseData = {
//       ...course.toObject(),
//       stats: {
//         totalStudents: enrollmentCount,
//         rating: avgRating[0] || { average: 0, count: 0 },
//       },
//     };

//     res.json({
//       success: true,
//       data: courseData,
//     });
//   } catch (error) {
//     console.error("Get public course error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not fetch course",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   createCourse,
//   getCourses,
//   getCourse,
//   updateCourse,
//   deleteCourse,
//   getCoursesByInstructor,
//   getPublicCourse
// };




const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const { deleteFile } = require("../config/cloudinary");
const { getSchoolFilter } = require("../middleware/schoolAuth");

const createCourse = async (req, res) => {
  try {
    console.log("📝 Creating course with body:", req.body);
    console.log("📷 File received:", req.file ? "Yes" : "No");

    const {
      title,
      description,
      shortDescription,
      subject,
      class: courseClass,
      category,
      level,
      maxStudents,
      modules,
      startDate,
      endDate,
      enrollmentDeadline,
      allowSelfEnrollment,
      requireApproval,
    } = req.body;

    // Validation
    if (!title || !description || !subject || !courseClass) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, subject, and class",
      });
    }

    // Role validation
    const allowedRoles = ["super_admin", "admin", "principal", "teacher"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only teachers, principals, and admins can create courses",
      });
    }

    // Determine school
    let school;
    if (req.user.role === "super_admin") {
      // Super admin must specify which school the course is for
      school = req.body.school;
      if (!school) {
        return res.status(400).json({
          success: false,
          message: "Super admin must specify school for course",
        });
      }
    } else {
      // School admin/teacher creates course for their own school
      school = req.user.school;
    }

    // Build course data
    const courseData = {
      title,
      description,
      shortDescription,
      subject,
      class: courseClass,
      category: category || "academic",
      level: level || "beginner",
      instructor: req.user._id,
      school, // Add school reference
      maxStudents: parseInt(maxStudents) || 1000,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      enrollmentDeadline: enrollmentDeadline
        ? new Date(enrollmentDeadline)
        : null,
      allowSelfEnrollment:
        allowSelfEnrollment !== undefined ? allowSelfEnrollment : true,
      requireApproval: requireApproval !== undefined ? requireApproval : false,
      status: "draft",
    };

    // Handle thumbnail upload
    if (req.file) {
      courseData.thumbnail = {
        url: req.file.path,
        public_id: req.file.filename,
      };
      console.log("📷 Thumbnail saved:", courseData.thumbnail);
    }

    // Handle modules
    if (modules) {
      try {
        let parsedModules;
        if (typeof modules === "string") {
          parsedModules = JSON.parse(modules);
        } else {
          parsedModules = modules;
        }

        if (Array.isArray(parsedModules)) {
          courseData.modules = parsedModules.map((module, index) => ({
            title: module.title || `Module ${index + 1}`,
            description: module.description || "",
            order: module.order !== undefined ? module.order : index,
            materials: [],
            isRequired:
              module.isRequired !== undefined ? module.isRequired : true,
          }));
          console.log("📚 Modules processed:", courseData.modules.length);
        } else {
          courseData.modules = [];
        }
      } catch (error) {
        console.error("Error parsing modules:", error);
        courseData.modules = [];
      }
    } else {
      courseData.modules = [];
    }

    console.log("📝 Final course data:", courseData);

    // Create course
    const course = await Course.create(courseData);
    await course.populate("instructor", "name email role");
    await course.populate("school", "name code");

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.error("Create course error:", error);

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
      message: "Could not create course",
      error: error.message,
    });
  }
};

const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      level,
      search,
      status,
      isPublic,
      instructor,
    } = req.query;

    // Apply school filter
    const schoolFilter = getSchoolFilter(req);
    const filter = { ...schoolFilter };

    if (status) {
      filter.status = status;
    }

    if (isPublic === "true") {
      filter.isPublic = true;
    }

    if (category) {
      filter.category = category;
    }

    if (level) {
      filter.level = level;
    }

    if (instructor) {
      filter.instructor = instructor;
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    console.log("📋 Course filter:", filter);

    const courses = await Course.find(filter)
      .populate("instructor", "name email")
      .populate("school", "name code")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(filter);

    res.json({
      success: true,
      data: courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch courses",
      error: error.message,
    });
  }
};

const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log(`🔍 Getting course ${id} for user ${userId} (${userRole})`);

    // Apply school filter
    const schoolFilter = getSchoolFilter(req);
    let query = { _id: id, ...schoolFilter };

    // Check if user is the course owner
    const isOwner = await Course.findOne({
      _id: id,
      $or: [{ instructor: userId }, { createdBy: userId }],
    });

    console.log(`👤 User is owner: ${!!isOwner}`);

    // Check if user is enrolled
    let isEnrolled = false;
    if (userRole === "student") {
      const enrollment = await Enrollment.findOne({
        student: userId,
        course: id,
        status: { $in: ["active", "completed"] },
      });
      isEnrolled = !!enrollment;
      console.log(`🎓 Student enrollment status: ${isEnrolled}`);
    }

    // Permission logic
    if (
      !["super_admin", "admin", "principal"].includes(userRole) &&
      !isOwner &&
      !isEnrolled
    ) {
      query.status = "published";
      query.isPublic = true;
      console.log(
        "🔒 Non-owner, non-enrolled access - requiring published + public"
      );
    } else {
      console.log("✅ Owner, admin, or enrolled access - allowing any status");
    }

    const course = await Course.findOne(query)
      .populate("instructor", "name email")
      .populate("school", "name code logo");

    if (!course) {
      console.log("❌ Course not found with query:", query);
      return res.status(404).json({
        success: false,
        message: `Course not found or you don't have access to view this course. Course ID: ${id}`,
      });
    }

    console.log("✅ Course found:", {
      id: course._id,
      title: course.title,
      status: course.status,
      isPublic: course.isPublic,
      school: course.school?.name,
    });

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("❌ Error in getCourse:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching course",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

const updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Authorization check
    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAssistant = course.assistantInstructors.includes(req.user._id);
    const isAdmin = ["super_admin", "admin", "principal"].includes(
      req.user.role
    );

    // School access check
    // if (
    //   req.user.role !== "super_admin" &&
    //   course.school.toString() !== req.user.school.toString()
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Cannot update course from different school",
    //   });
    // }


      if (req.user.role !== "super_admin") {
        const userSchoolId = req.user.school?._id || req.user.school;
        const courseSchoolId = course.school;

        if (courseSchoolId.toString() !== userSchoolId.toString()) {
          return res.status(403).json({
            success: false,
            message: "Cannot update course from different school",
          });
        }
      }

    if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this course",
      });
    }

    // Prepare updates
    const allowedUpdates = [
      "title",
      "description",
      "shortDescription",
      "subject",
      "class",
      "category",
      "level",
      "maxStudents",
      "modules",
      "startDate",
      "endDate",
      "enrollmentDeadline",
      "allowSelfEnrollment",
      "requireApproval",
    ];

    if (isAdmin || isInstructor) {
      allowedUpdates.push("status", "isPublic");
    }

    if (isAdmin) {
      allowedUpdates.push("instructor", "assistantInstructors");
    }

    // Super admin can change school
    if (req.user.role === "super_admin") {
      allowedUpdates.push("school");
    }

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === "modules" && req.body[key]) {
          try {
            let parsedModules;
            if (typeof req.body[key] === "string") {
              parsedModules = JSON.parse(req.body[key]);
            } else {
              parsedModules = req.body[key];
            }

            if (Array.isArray(parsedModules)) {
              updates[key] = parsedModules.map((module, index) => ({
                title: module.title || `Module ${index + 1}`,
                description: module.description || "",
                order: module.order !== undefined ? module.order : index,
                materials: module.materials || [],
                isRequired:
                  module.isRequired !== undefined ? module.isRequired : true,
              }));
            }
          } catch (error) {
            console.error("Error parsing modules in update:", error);
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    // Handle thumbnail update
    if (req.file) {
      if (course.thumbnail && course.thumbnail.public_id) {
        try {
          await deleteFile(course.thumbnail.public_id);
        } catch (error) {
          console.error("Error deleting old thumbnail:", error);
        }
      }

      updates.thumbnail = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    // Update course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("instructor", "name email")
      .populate("assistantInstructors", "name email")
      .populate("school", "name code");

    res.json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update course",
      error: error.message,
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAdmin = ["super_admin", "admin", "principal"].includes(
      req.user.role
    );

    // School access check
    // if (
    //   req.user.role !== "super_admin" &&
    //   course.school.toString() !== req.user.school.toString()
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Cannot delete course from different school",
    //   });
    // }


      if (req.user.role !== "super_admin") {
        const userSchoolId = req.user.school?._id || req.user.school;
        const courseSchoolId = course.school;

        if (courseSchoolId.toString() !== userSchoolId.toString()) {
          return res.status(403).json({
            success: false,
            message: "Cannot delete course from different school",
          });
        }
      }

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this course",
      });
    }

    const enrollmentCount = await Enrollment.countDocuments({
      course: course._id,
      status: { $in: ["active", "completed"] },
    });

    if (enrollmentCount > 0 && !isAdmin) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete course with active enrollments. Please contact administrator.",
      });
    }

    // Delete materials
    for (const material of course.materials) {
      if (material.public_id) {
        try {
          await deleteFile(material.public_id);
        } catch (error) {
          console.error("Error deleting file:", error);
        }
      }
    }

    // Delete thumbnail
    if (course.thumbnail && course.thumbnail.public_id) {
      try {
        await deleteFile(course.thumbnail.public_id);
      } catch (error) {
        console.error("Error deleting thumbnail:", error);
      }
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete course",
      error: error.message,
    });
  }
};

const getCoursesByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    const instructor = await User.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found",
      });
    }

    // Apply school filter
    const schoolFilter = getSchoolFilter(req);

    const courses = await Course.find({
      ...schoolFilter,
      $or: [
        { instructor: instructorId },
        { assistantInstructors: instructorId },
      ],
    })
      .populate("instructor", "name email")
      .populate("school", "name code")
      .select("-materials")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        instructor: {
          id: instructor._id,
          name: instructor.name,
          email: instructor.email,
        },
        coursesCount: courses.length,
        courses,
      },
    });
  } catch (error) {
    console.error("Get instructor courses error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get instructor courses",
      error: error.message,
    });
  }
};

const getPublicCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log("🔍 getPublicCourse called with courseId:", courseId);

    // Find only published courses for public access
    const course = await Course.findOne({
      _id: courseId,
      status: "published",
      isPublic: true,
    })
      .populate("instructor", "name email")
      .populate("school", "name code logo")
      .select("-materials -privateNotes -grading -settings.joinCode");

    console.log("🔍 Course found:", !!course);

    if (!course) {
      console.log("❌ Course not found or not public");
      return res.status(404).json({
        success: false,
        message: "Course not found or not available publicly",
      });
    }

    // Add basic stats
    const enrollmentCount = await Enrollment.countDocuments({
      course: courseId,
      status: "active",
    });

    let avgRating = [{ average: 0, count: 0 }];
    try {
      const Rating = require("../models/Rating");
      avgRating = await Rating.aggregate([
        { $match: { course: courseId } },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);
    } catch (ratingError) {
      console.warn("Rating model not found, using default values");
    }

    const courseData = {
      ...course.toObject(),
      stats: {
        totalStudents: enrollmentCount,
        rating: avgRating[0] || { average: 0, count: 0 },
      },
    };

    res.json({
      success: true,
      data: courseData,
    });
  } catch (error) {
    console.error("Get public course error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch course",
      error: error.message,
    });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getCoursesByInstructor,
  getPublicCourse,
};
