const express = require("express");
const {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionStats,
  bulkCreateQuestions,
} = require("../controllers/questionController");

const { protect , authorize } = require('../middleware/auth');
const { uploadCourseContent } = require('../config/cloudinary')

const router = express.Router();

router.use(protect);


router.post('/', authorize('admin', 'principal', 'teacher'), uploadCourseContent.single('image'), createQuestion);
router.post('/bulk', authorize('admin', 'principal', 'teacher'), bulkCreateQuestions);
router.get('/', authorize('admin', 'principal', 'teacher'), getQuestions);
router.get('/:id', getQuestion);
router.patch('/:id', uploadCourseContent.single('image'), updateQuestion);
router.delete('/:id', deleteQuestion);


router.get('/:id/stats', getQuestionStats);

module.exports = router;
