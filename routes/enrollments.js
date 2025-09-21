const express = require("express");
const {
  getStudentEnrollments,
  updateEnrollmentStatus,
  updateProgress,
  dropFromCourse,
} = require("../controllers/enrollmentController");

const { protect } = require('../middleware/auth')

const router = express.Router();


router.use(protect);


router.get("/student/:studentId", getStudentEnrollments);
router.patch("/:enrollmentId", updateEnrollmentStatus);
router.patch("/:enrollmentId/progress", updateProgress);
router.delete("/:enrollmentId", dropFromCourse);

module.exports = router;