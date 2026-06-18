const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken, authorize, validateOrigin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply CSRF protection to all routes
router.use(validateOrigin);

router.post('/login', authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyToken, authController.getCurrentUser);
router.post('/register', authController.registerUser);

module.exports = router;
