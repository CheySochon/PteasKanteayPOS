const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const uploadProductImage = require('../middleware/uploadProductImage');
const adminOnly = [authMiddleware, roleMiddleware(['Admin'])];

router.post('/upload-image', adminOnly, uploadProductImage.single('image'), asyncHandler(controller.uploadImage));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));
router.post('/', adminOnly, asyncHandler(controller.create));
router.put('/:id', adminOnly, asyncHandler(controller.update));
router.delete('/:id', adminOnly, asyncHandler(controller.remove));

module.exports = router;
