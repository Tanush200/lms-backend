const express = require("express");
const {
  getSubmission,
  getUserSubmissions,
  getSubmissionStatus,
} = require("../controllers/codeSubmissionController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


router.use(protect);


router.get("/:submissionId", getSubmission);
router.get("/:submissionId/status", getSubmissionStatus);


router.get("/users/:userId/submissions", getUserSubmissions);

module.exports = router;
