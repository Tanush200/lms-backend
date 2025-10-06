const express = require("express");
const {
  upload,
  importQuestions,
  getTemplate,
} = require("../controllers/questionImportController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


router.use(protect);


router.post(
  "/",
  authorize("teacher", "admin", "principal"),
  upload.single("file"),
  importQuestions
);


router.get("/templates/:format", getTemplate);

module.exports = router;
