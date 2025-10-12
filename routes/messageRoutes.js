const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  getStudentsWithParents,
  startConversation,
} = require('../controllers/messageController');

// All routes require authentication
router.use(protect);

// Get user's conversations
router.get('/conversations', getConversations);

// Get messages in a conversation
router.get('/conversation/:conversationId', getMessages);

// Get students with parents (for teachers)
router.get('/students/:courseId', authorize('teacher', 'admin', 'principal'), getStudentsWithParents);

// Start new conversation
router.post('/conversation', authorize('teacher', 'admin', 'principal'), startConversation);

module.exports = router;
