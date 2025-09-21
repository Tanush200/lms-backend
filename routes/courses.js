const express = require('express')
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

const {protect , authorize , optionalAuth} = require('../middleware/auth')
const router = express.Router();

router.get('/',optionalAuth,getCourses);
router.get('/:id',optionalAuth,getCourse);

router.use(protect)

router.post("/", authorize("admin", "principal", "teacher"),createCourse);
router.patch('/:id',updateCourse);
router.delete('/:id',deleteCourse)


router.get("/instructor/:instructorId",getCoursesByInstructor);

router.post("/:courseId/enroll", enrollInCourse);
router.get("/:courseId/enrollments", getCourseEnrollments);

router.post("/:courseId/materials/upload", uploadMaterialFile);
router.post("/:courseId/materials", addMaterial);
router.get("/:courseId/materials", getMaterials);
router.patch("/:courseId/materials/:materialId", updateMaterial);
router.delete("/:courseId/materials/:materialId", deleteMaterial);

module.exports = router;