const express = require("express");
const {
  getStudentsForAdmin,
  addStudentManually,
  enrollStudentInCourses,
  sendStudentCredentials,
  getStudentDetails,
} = require("../controllers/studentManagementController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


router.use(protect);
router.use(authorize("admin", "principal"));


router.get("/students", getStudentsForAdmin);
router.post("/add-student", addStudentManually);
router.post("/enroll-courses", enrollStudentInCourses);
router.post("/send-credentials/:studentId", sendStudentCredentials);
router.get("/student/:studentId", getStudentDetails);

module.exports = router;
