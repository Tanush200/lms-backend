const express = require("express");
const {
  getSubmission,
  getUserSubmissions,
  getSubmissionStatus,
} = require("../controllers/codeSubmissionController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Submission management
router.get("/:submissionId", getSubmission);
router.get("/:submissionId/status", getSubmissionStatus);

// User submissions
router.get("/users/:userId/submissions", getUserSubmissions);

module.exports = router;
