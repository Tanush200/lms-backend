const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createNotice, listNotices, getNotice, updateNotice, deleteNotice, listMyNotices } = require('../controllers/noticeController');

const router = express.Router();


router.get('/', protect, listNotices);
router.get('/my', protect, listMyNotices);


router.post('/', protect, authorize('admin', 'principal'), createNotice);

router.get('/:id', protect, getNotice);
router.put('/:id', protect, authorize('admin', 'principal'), updateNotice);
router.delete('/:id', protect, authorize('admin', 'principal'), deleteNotice);

module.exports = router;


