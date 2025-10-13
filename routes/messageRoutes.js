const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  getStudentsWithParents,
  startConversation,
} = require('../controllers/messageController');
const upload = require('../middleware/upload');
const { uploadFileMessage } = require('../controllers/fileController');

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

// Wrap upload to catch Multer errors (prevents app crash on invalid formats)
const wrapMessageUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error(`❌ Message upload error for field "${fieldName}":`, err);
      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message,
      });
    }
    next();
  });
};

router.post("/upload", wrapMessageUpload("file"), uploadFileMessage);

module.exports = router;
