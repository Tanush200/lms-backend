const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateSchoolAccess } = require('../middleware/schoolAuth');
const schoolController = require('../controllers/schoolController');

// All routes require authentication
router.use(protect);

// Super admin only routes
router.post('/', authorize('super_admin'), schoolController.createSchool);
router.delete('/:schoolId', authorize('super_admin'), schoolController.deleteSchool);
// Toggle status for a school
router.patch('/:id/toggle-status', authorize('super_admin'), schoolController.toggleSchoolStatus);

// Super admin and admin routes
router.get('/', authorize('super_admin', 'admin'), schoolController.listSchools);
router.get('/:schoolId', authorize('super_admin', 'admin'), validateSchoolAccess, schoolController.getSchool);
router.put('/:schoolId', authorize('super_admin', 'admin'), validateSchoolAccess, schoolController.updateSchool);
// School stats
router.get('/:id/stats', authorize('super_admin', 'admin'), validateSchoolAccess, schoolController.getSchoolStats);

module.exports = router;
