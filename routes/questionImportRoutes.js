// backend/routes/questionImportRoutes.js
const express = require("express");
const {
  upload,
  importQuestions,
  getTemplate,
} = require("../controllers/questionImportController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Protect all routes
router.use(protect);

// Import questions
router.post(
  "/",
  authorize("teacher", "admin", "principal"),
  upload.single("file"),
  importQuestions
);

// Get templates
router.get("/templates/:format", getTemplate);

module.exports = router;
