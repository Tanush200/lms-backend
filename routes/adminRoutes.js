
const express = require("express");
const {
  getStudents,
  addStudent,
  bulkEnrollStudent,
  sendLoginCredentials,
  linkStudentsToParent
} = require("../controllers/adminController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


router.use(protect);
router.use(authorize("admin", "principal"));


router.get("/students", getStudents);
router.post("/students", addStudent);
router.post("/bulk-enroll", bulkEnrollStudent);
router.post("/send-credentials/:studentId", sendLoginCredentials);
router.post('/parents/:parentId/link-students', protect, authorize('admin'), linkStudentsToParent)

module.exports = router;
