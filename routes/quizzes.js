const express = require("express");
const {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizStats,
} = require("../controllers/quizController");

const { protect , authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin", "principal", "teacher"), createQuiz);
router.get("/", getQuizzes);
router.get("/:id", getQuiz);
router.patch("/:id", updateQuiz);
router.delete("/:id", deleteQuiz);
router.get("/:id/stats", getQuizStats);

module.exports = router;