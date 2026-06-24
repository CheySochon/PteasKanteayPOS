const express = require('express');
const router = express.Router();
const controller = require('../controllers/backupController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const superAdminOnly = [authMiddleware, roleMiddleware(['Super Admin'])];

router.get('/', superAdminOnly, asyncHandler(controller.list));
router.get('/download', superAdminOnly, asyncHandler(controller.download));
router.get('/latest', superAdminOnly, asyncHandler(controller.latest));
router.post('/preview', superAdminOnly, asyncHandler(controller.preview));
router.post('/restore', superAdminOnly, asyncHandler(controller.restore));

module.exports = router;
