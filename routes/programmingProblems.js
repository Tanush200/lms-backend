const express = require("express");
const {
  createProblem,
  getProblems,
  getProblem,
  updateProblem,
  deleteProblem,
  getProblemStats,
} = require("../controllers/programmingProblemController");
const {
  submitCode,
  testCode,
  getProblemSubmissions,
  getProblemLeaderboard,
  getCodeTemplate,
} = require("../controllers/codeSubmissionController");

const {authorize , protect , optionalAuth} = require('../middleware/auth')

const router = express.Router();



router.post('/', protect, authorize('admin', 'principal', 'teacher'), createProblem);
router.get('/', optionalAuth, getProblems);
router.get('/:id', optionalAuth, getProblem);
router.patch('/:id', protect, updateProblem);
router.delete('/:id', protect, deleteProblem);


router.get('/:id/stats', protect, authorize('admin', 'principal', 'teacher'), getProblemStats);


router.post('/:problemId/submit', protect, authorize('student'), submitCode);
router.post('/:problemId/test', protect, authorize('student'), testCode);
router.get('/:problemId/submissions', protect, getProblemSubmissions);
router.get('/:problemId/leaderboard', optionalAuth, getProblemLeaderboard);
router.get('/:problemId/template/:language', protect, getCodeTemplate);

module.exports = router;