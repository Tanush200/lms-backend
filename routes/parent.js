const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/auth');


router.get('/:parentId/children', protect, authorize('parent', 'admin'), parentController.getChildren);
router.get('/student/:studentId/progress', protect, authorize('parent'), parentController.getChildProgress);
router.get('/student/:studentId/activities', protect, authorize('parent'), parentController.getChildActivities);
router.get('/student/:studentId/events', protect, authorize('parent'), parentController.getChildEvents);

module.exports = router;
