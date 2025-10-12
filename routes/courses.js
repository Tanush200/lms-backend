
// const express = require('express');
// const {
//   createCourse,
//   getCourses,
//   getCourse,
//   updateCourse,
//   deleteCourse,
//   getCoursesByInstructor,
//   getPublicCourse
// } = require("../controllers/courseController");

// const {
//   enrollInCourse,
//   getCourseEnrollments,
//   updateEnrollmentStatus,
// } = require("../controllers/enrollmentController");

// const {
//   addMaterial,
//   getMaterials,
//   updateMaterial,
//   deleteMaterial,
//   uploadMaterialFile,
// } = require("../controllers/materialController");

// const { protect, authorize, optionalAuth } = require('../middleware/auth');

// const { uploadCourseContent } = require('../config/cloudinary');

// const router = express.Router();

// // =================== PUBLIC ROUTES ===================
// router.get('/', optionalAuth, getCourses);
// router.get("/public/:courseId", getPublicCourse);


// router.get('/:id', async (req, res, next) => {
//   try {
//     const Course = require("../models/Course");
//     const course = await Course.findOne({
//       _id: req.params.id,
//       status: "published",
//       isPublic: true,
//     }).populate("instructor", "name email");

//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found or not available publicly",
//       });
//     }

//     res.json({
//       success: true,
//       data: course,
//     });
//   } catch (error) {
 
//     next();
//   }
// });


// // =================== PROTECTED ROUTES ===================
// router.use(protect);


// router.get("/teacher/:id", 
//   authorize("teacher", "admin", "principal"),
//   async (req, res) => {
//     try {
//       const Course = require("../models/Course");
//       const { id } = req.params;
//       const userId = req.user._id;

//       console.log(`🎓 Teacher accessing course ${id}`);


//       const course = await Course.findOne({
//         _id: id,
//         $or: [
//           { instructor: userId },
//           { createdBy: userId }
//         ]
//       })
//       .populate('instructor', 'name email');

//       if (!course) {
//         console.log("❌ Teacher course not found or not owned");
//         return res.status(404).json({
//           success: false,
//           message: 'Course not found or you are not the instructor of this course'
//         });
//       }

//       console.log("✅ Teacher course found:", {
//         id: course._id,
//         title: course.title,
//         status: course.status
//       });


//       const Enrollment = require('../models/Enrollment');
//       const enrollmentsCount = await Enrollment.countDocuments({ course: id });
//       const courseObj = course.toObject();
//       courseObj.stats = { ...(courseObj.stats || {}), totalStudents: enrollmentsCount };

//       res.json({
//         success: true,
//         data: courseObj
//       });
//     } catch (error) {
//       console.error('❌ Error fetching teacher course:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Server error',
//         error: error.message
//       });
//     }
//   }
// );


// router.get("/:id", getCourse); 


// const wrapSingleUpload = (fieldName) => (req, res, next) => {
//   uploadCourseContent.single(fieldName)(req, res, (err) => {
//     if (err) {
//       console.error(`❌ Upload error for field "${fieldName}":`, err);
//       return res.status(400).json({ success: false, message: 'File upload failed', error: err.message });
//     }
//     next();
//   });
// };

// router.post("/", 
//   authorize("admin", "principal", "teacher"),
//   wrapSingleUpload('thumbnail'),
//   createCourse
// );

// router.patch('/:id', 
//   authorize("admin", "principal", "teacher"),
//   wrapSingleUpload('thumbnail'), 
//   updateCourse
// );

// router.delete('/:id', 
//   authorize("admin", "principal", "teacher"),
//   deleteCourse
// );


// router.get("/instructor/:instructorId", getCoursesByInstructor);


// router.post("/:courseId/enroll", 
//   authorize("student", "admin", "principal"),
//   enrollInCourse
// );

// router.get("/:courseId/enrollments", 
//   authorize("admin", "principal", "teacher"),
//   getCourseEnrollments
// );

// router.patch("/:courseId/enrollments/:enrollmentId", 
//   authorize("admin", "principal", "teacher"),
//   updateEnrollmentStatus
// );


// router.post("/:courseId/materials/upload", 
//   authorize("admin", "principal", "teacher"),
//   wrapSingleUpload('file'),
//   uploadMaterialFile
// );

// router.post("/:courseId/materials", 
//   authorize("admin", "principal", "teacher"),
//   addMaterial
// );

// router.get("/:courseId/materials", getMaterials);

// router.patch("/:courseId/materials/:materialId", 
//   authorize("admin", "principal", "teacher"),
//   updateMaterial
// );

// router.delete("/:courseId/materials/:materialId", 
//   authorize("admin", "principal", "teacher"),
//   deleteMaterial
// );


// router.patch('/:id/thumbnail', 
//   authorize("admin", "principal", "teacher"),
//   wrapSingleUpload('thumbnail'),
//   async (req, res) => {
//     try {
//       const Course = require('../models/Course');
//       const course = await Course.findById(req.params.id);
      
//       if (!course) {
//         return res.status(404).json({
//           success: false,
//           message: 'Course not found'
//         });
//       }


//       const isInstructor = course.instructor.toString() === req.user._id.toString();
//       const isAdmin = ['admin', 'principal'].includes(req.user.role);
      
//       if (!isInstructor && !isAdmin) {
//         return res.status(403).json({
//           success: false,
//           message: 'Not authorized to update this course'
//         });
//       }


//       if (req.file) {

//         if (course.thumbnail && course.thumbnail.public_id) {
//           const { deleteFile } = require('../config/cloudinary');
//           try {
//             await deleteFile(course.thumbnail.public_id);
//           } catch (error) {
//             console.error('Error deleting old thumbnail:', error);
//           }
//         }

//         course.thumbnail = {
//           url: req.file.path,
//           public_id: req.file.filename
//         };
//         await course.save();
//       }

//       res.json({
//         success: true,
//         message: 'Thumbnail updated successfully',
//         data: course
//       });
//     } catch (error) {
//       console.error('Thumbnail update error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Could not update thumbnail',
//         error: error.message
//       });
//     }
//   }
// );


// router.get('/:courseId/analytics', 
//   authorize("admin", "principal", "teacher"),
//   async (req, res) => {
//     try {
//       const Course = require('../models/Course');
//       const Enrollment = require('../models/Enrollment');
      
//       const course = await Course.findById(req.params.courseId);
//       if (!course) {
//         return res.status(404).json({
//           success: false,
//           message: 'Course not found'
//         });
//       }

   
//       const isInstructor = course.instructor.toString() === req.user._id.toString();
//       const isAdmin = ['admin', 'principal'].includes(req.user.role);
      
//       if (!isInstructor && !isAdmin) {
//         return res.status(403).json({
//           success: false,
//           message: 'Not authorized to view analytics'
//         });
//       }


//       const enrollments = await Enrollment.find({ course: req.params.courseId });
//       const analytics = {
//         totalEnrollments: enrollments.length,
//         activeEnrollments: enrollments.filter(e => e.status === 'active').length,
//         completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
//         droppedEnrollments: enrollments.filter(e => e.status === 'dropped').length,
//         averageProgress: enrollments.length > 0 
//           ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length 
//           : 0
//       };

//       res.json({
//         success: true,
//         data: analytics
//       });
//     } catch (error) {
//       console.error('Analytics error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Could not get course analytics',
//         error: error.message
//       });
//     }
//   }
// );

// module.exports = router;




const express = require('express');
const {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getCoursesByInstructor,
  getPublicCourse
} = require("../controllers/courseController");

const {
  enrollInCourse,
  getCourseEnrollments,
  updateEnrollmentStatus,
} = require("../controllers/enrollmentController");

const {
  addMaterial,
  getMaterials,
  updateMaterial,
  deleteMaterial,
  uploadMaterialFile,
} = require("../controllers/materialController");

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { uploadCourseContent } = require('../config/cloudinary');

const router = express.Router();

// ✅ HELPER FUNCTION - MUST BE DEFINED BEFORE USE
const wrapSingleUpload = (fieldName) => (req, res, next) => {
  uploadCourseContent.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error(`❌ Upload error for field "${fieldName}":`, err);
      return res.status(400).json({ 
        success: false, 
        message: 'File upload failed', 
        error: err.message 
      });
    }
    next();
  });
};

// =================== PUBLIC ROUTES ===================
router.get('/', optionalAuth, getCourses);
router.get("/public/:courseId", getPublicCourse);

// =================== PROTECTED ROUTES ===================
router.use(protect);

// Teacher-specific course access (must be before /:id)
router.get("/teacher/:id", 
  authorize("teacher", "admin", "principal", "super_admin"),
  async (req, res) => {
    try {
      const Course = require("../models/Course");
      const { id } = req.params;
      const userId = req.user._id;

      console.log(`🎓 Teacher accessing course ${id}`);

      const query = { _id: id };
      
      if (req.user.role !== 'super_admin') {
        const userSchoolId = (req.user.school?._id || req.user.school).toString();
        query.school = userSchoolId;
      }

      const course = await Course.findOne({
        ...query,
        $or: [
          { instructor: userId },
          { createdBy: userId }
        ]
      })
      .populate('instructor', 'name email')
      .populate('school', 'name code');

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or you are not the instructor of this course'
        });
      }

      const Enrollment = require('../models/Enrollment');
      const enrollmentsCount = await Enrollment.countDocuments({ course: id });
      const courseObj = course.toObject();
      courseObj.stats = { ...(courseObj.stats || {}), totalStudents: enrollmentsCount };

      res.json({
        success: true,
        data: courseObj
      });
    } catch (error) {
      console.error('❌ Error fetching teacher course:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// Instructor courses
router.get("/instructor/:instructorId", 
  authorize("teacher", "admin", "principal", "super_admin"),
  getCoursesByInstructor
);

// Course analytics
router.get('/:courseId/analytics', 
  authorize("admin", "principal", "teacher", "super_admin"),
  async (req, res) => {
    try {
      const Course = require('../models/Course');
      const Enrollment = require('../models/Enrollment');
      
      const course = await Course.findById(req.params.courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (req.user.role !== 'super_admin') {
        const userSchoolId = (req.user.school?._id || req.user.school).toString();
        const courseSchoolId = course.school.toString();
        
        if (courseSchoolId !== userSchoolId) {
          return res.status(403).json({
            success: false,
            message: 'Cannot view analytics for course from different school'
          });
        }
      }

      const isInstructor = course.instructor.toString() === req.user._id.toString();
      const isAdmin = ['super_admin', 'admin', 'principal'].includes(req.user.role);
      
      if (!isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view analytics'
        });
      }

      const enrollments = await Enrollment.find({ course: req.params.courseId });
      const analytics = {
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter(e => e.status === 'active').length,
        completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
        droppedEnrollments: enrollments.filter(e => e.status === 'dropped').length,
        averageProgress: enrollments.length > 0 
          ? enrollments.reduce((sum, e) => sum + (e.progress?.overallProgress || 0), 0) / enrollments.length 
          : 0
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Could not get course analytics',
        error: error.message
      });
    }
  }
);

// Material routes
router.post("/:courseId/materials/upload", 
  authorize("admin", "principal", "teacher", "super_admin"),
  wrapSingleUpload('file'),
  uploadMaterialFile
);

router.post("/:courseId/materials", 
  authorize("admin", "principal", "teacher", "super_admin"),
  addMaterial
);

router.get("/:courseId/materials", getMaterials);

router.patch("/:courseId/materials/:materialId", 
  authorize("admin", "principal", "teacher", "super_admin"),
  updateMaterial
);

router.delete("/:courseId/materials/:materialId", 
  authorize("admin", "principal", "teacher", "super_admin"),
  deleteMaterial
);

// Enrollment routes
router.post("/:courseId/enroll", 
  authorize("student", "admin", "principal", "super_admin"),
  enrollInCourse
);

router.get("/:courseId/enrollments", 
  authorize("admin", "principal", "teacher", "super_admin"),
  getCourseEnrollments
);

router.patch("/:courseId/enrollments/:enrollmentId", 
  authorize("admin", "principal", "teacher", "student", "super_admin"),
  updateEnrollmentStatus
);

// Thumbnail update
router.patch('/:id/thumbnail', 
  authorize("admin", "principal", "teacher", "super_admin"),
  wrapSingleUpload('thumbnail'),
  async (req, res) => {
    try {
      const Course = require('../models/Course');
      const course = await Course.findById(req.params.id);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (req.user.role !== 'super_admin') {
        const userSchoolId = (req.user.school?._id || req.user.school).toString();
        const courseSchoolId = course.school.toString();
        
        if (courseSchoolId !== userSchoolId) {
          return res.status(403).json({
            success: false,
            message: 'Cannot update thumbnail for course from different school'
          });
        }
      }

      const isInstructor = course.instructor.toString() === req.user._id.toString();
      const isAdmin = ['super_admin', 'admin', 'principal'].includes(req.user.role);
      
      if (!isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this course'
        });
      }

      if (req.file) {
        if (course.thumbnail && course.thumbnail.public_id) {
          const { deleteFile } = require('../config/cloudinary');
          try {
            await deleteFile(course.thumbnail.public_id);
          } catch (error) {
            console.error('Error deleting old thumbnail:', error);
          }
        }

        course.thumbnail = {
          url: req.file.path,
          public_id: req.file.filename
        };
        await course.save();
      }

      res.json({
        success: true,
        message: 'Thumbnail updated successfully',
        data: course
      });
    } catch (error) {
      console.error('Thumbnail update error:', error);
      res.status(500).json({
        success: false,
        message: 'Could not update thumbnail',
        error: error.message
      });
    }
  }
);

// Generic /:id routes (MUST BE AT THE END)
router.get('/:id', async (req, res, next) => {
  try {
    await getCourse(req, res);
  } catch (error) {
    try {
      const Course = require("../models/Course");
      const course = await Course.findOne({
        _id: req.params.id,
        status: "published",
        isPublic: true,
      })
        .populate("instructor", "name email")
        .populate("school", "name code");

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found or not available publicly",
        });
      }

      res.json({
        success: true,
        data: course,
      });
    } catch (publicError) {
      res.status(500).json({
        success: false,
        message: "Error fetching course",
        error: publicError.message
      });
    }
  }
});

// Create course
router.post("/", 
  authorize("admin", "principal", "teacher", "super_admin"),
  wrapSingleUpload('thumbnail'),
  createCourse
);

// Update course
router.patch('/:id', 
  authorize("admin", "principal", "teacher", "super_admin"),
  wrapSingleUpload('thumbnail'), 
  updateCourse
);

// Delete course
router.delete('/:id', 
  authorize("admin", "principal", "teacher", "super_admin"),
  deleteCourse
);

module.exports = router;

