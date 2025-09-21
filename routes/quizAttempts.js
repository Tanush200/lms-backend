const express = require("express");

const {
  startQuizAttempt,
  getQuizAttempt,
  submitAnswer,
  submitQuizAttempt,
  getStudentAttempts,
  getQuizAttempts,
  gradeQuizAttempt,
} = require("../controllers/quizAttemptController");

const {protect , authorize} = require('../middleware/auth')

const router = express.Router();

router.use(protect);


router.post('/quizzes/:quizId/attempt', authorize('student'), startQuizAttempt);
router.get('/quiz-attempts/:attemptId', getQuizAttempt);
router.patch('/quiz-attempts/:attemptId/answer', authorize('student'), submitAnswer);
router.post('/quiz-attempts/:attemptId/submit', authorize('student'), submitQuizAttempt);


router.get('/students/:studentId/quiz-attempts', getStudentAttempts);
router.get('/quizzes/:quizId/attempts', authorize('admin', 'principal', 'teacher'), getQuizAttempts);


router.patch('/quiz-attempts/:attemptId/grade', authorize('admin', 'principal', 'teacher'), gradeQuizAttempt);

module.exports = router;