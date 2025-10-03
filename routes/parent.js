const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/auth');

// Get children linked to a parent (allow parent or admin)
router.get('/:parentId/children', protect, authorize('parent', 'admin'), parentController.getChildren);

// Get progress of a particular student
router.get('/student/:studentId/progress', protect, authorize('parent'), parentController.getChildProgress);

// Get recent activities of a student
router.get('/student/:studentId/activities', protect, authorize('parent'), parentController.getChildActivities);

// Get upcoming events for a student
router.get('/student/:studentId/events', protect, authorize('parent'), parentController.getChildEvents);

module.exports = router;
