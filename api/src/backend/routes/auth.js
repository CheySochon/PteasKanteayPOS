const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', asyncHandler(controller.register));
router.post('/login', asyncHandler(controller.login));
router.get('/me', authMiddleware, asyncHandler(controller.me));
router.post('/logout', authMiddleware, asyncHandler(controller.logout));

module.exports = router;
