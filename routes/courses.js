// routes/courses.js - UPDATED WITH THUMBNAIL UPLOAD SUPPORT
const express = require('express');
const {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getCoursesByInstructor,
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
// ✅ Import file upload middleware
const { uploadCourseContent } = require('../config/cloudinary');

const router = express.Router();

// =================== PUBLIC ROUTES ===================
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourse);

// =================== PROTECTED ROUTES ===================
router.use(protect);

// ✅ COURSE CRUD WITH FILE UPLOAD SUPPORT
// Wrap multer handlers to avoid unhandled rejections and surface errors as 4xx
const wrapSingleUpload = (fieldName) => (req, res, next) => {
  uploadCourseContent.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error(`❌ Upload error for field "${fieldName}":`, err);
      return res.status(400).json({ success: false, message: 'File upload failed', error: err.message });
    }
    next();
  });
};

router.post("/", 
  authorize("admin", "principal", "teacher"),
  wrapSingleUpload('thumbnail'), // ✅ Handle thumbnail upload safely
  createCourse
);

router.patch('/:id', 
  authorize("admin", "principal", "teacher"), // ✅ Add authorization
  wrapSingleUpload('thumbnail'), // ✅ Handle thumbnail update safely
  updateCourse
);

router.delete('/:id', 
  authorize("admin", "principal", "teacher"), // ✅ Add authorization
  deleteCourse
);

// ✅ INSTRUCTOR ROUTES
router.get("/instructor/:instructorId", getCoursesByInstructor);

// ✅ ENROLLMENT ROUTES  
router.post("/:courseId/enroll", 
  authorize("student"), // ✅ Only students can enroll
  enrollInCourse
);

router.get("/:courseId/enrollments", 
  authorize("admin", "principal", "teacher"), // ✅ Only instructors/admins can view enrollments
  getCourseEnrollments
);

router.patch("/:courseId/enrollments/:enrollmentId", 
  authorize("admin", "principal", "teacher"), // ✅ Only instructors/admins can update enrollment status
  updateEnrollmentStatus
);

// ✅ MATERIAL ROUTES WITH PROPER FILE UPLOAD
router.post("/:courseId/materials/upload", 
  authorize("admin", "principal", "teacher"), // ✅ Only instructors can upload materials
  wrapSingleUpload('file'), // ✅ Handle material file upload safely
  uploadMaterialFile
);

router.post("/:courseId/materials", 
  authorize("admin", "principal", "teacher"), // ✅ Only instructors can add materials
  addMaterial
);

router.get("/:courseId/materials", getMaterials); // ✅ All enrolled users can view materials

router.patch("/:courseId/materials/:materialId", 
  authorize("admin", "principal", "teacher"), // ✅ Only instructors can update materials
  updateMaterial
);

router.delete("/:courseId/materials/:materialId", 
  authorize("admin", "principal", "teacher"), // ✅ Only instructors can delete materials
  deleteMaterial
);

// ✅ ADDITIONAL THUMBNAIL-SPECIFIC ROUTE (Optional)
router.patch('/:id/thumbnail', 
  authorize("admin", "principal", "teacher"),
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

      // Check if user can update this course
      const isInstructor = course.instructor.toString() === req.user._id.toString();
      const isAdmin = ['admin', 'principal'].includes(req.user.role);
      
      if (!isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this course'
        });
      }

      // Update thumbnail
      if (req.file) {
        // Delete old thumbnail if exists
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

// ✅ COURSE ANALYTICS ROUTES (Optional but useful)
router.get('/:courseId/analytics', 
  authorize("admin", "principal", "teacher"),
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

      // Check authorization
      const isInstructor = course.instructor.toString() === req.user._id.toString();
      const isAdmin = ['admin', 'principal'].includes(req.user.role);
      
      if (!isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view analytics'
        });
      }

      // Get enrollment analytics
      const enrollments = await Enrollment.find({ course: req.params.courseId });
      const analytics = {
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter(e => e.status === 'active').length,
        completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
        droppedEnrollments: enrollments.filter(e => e.status === 'dropped').length,
        averageProgress: enrollments.length > 0 
          ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length 
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

module.exports = router;
