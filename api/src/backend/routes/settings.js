const express = require('express');
const router = express.Router();
const controller = require('../controllers/settingController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const uploadSettingImage = require('../middleware/uploadSettingImage');
const adminOnly = [authMiddleware, roleMiddleware(['Admin'])];

router.get('/', asyncHandler(controller.list));
router.post('/upload-image', adminOnly, uploadSettingImage.single('image'), asyncHandler(controller.uploadImage));
router.put('/', adminOnly, asyncHandler(controller.update));

module.exports = router;
