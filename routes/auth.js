const express = require('express');

const { register , login , getMe , logout , changePassword, requestPasswordReset, resetPassword } =  require('../controllers/authController');

const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/register' , register);
router.post('/login',login);
// Public password reset endpoints
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

router.use(protect);

router.get('/me',getMe);
router.post('/logout',logout);
router.patch('/change-password',changePassword);

module.exports = router