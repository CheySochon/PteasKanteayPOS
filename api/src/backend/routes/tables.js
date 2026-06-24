const express = require('express');
const router = express.Router();
const controller = require('../controllers/tableController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const adminOnly = [authMiddleware, roleMiddleware(['Admin'])];

router.get('/', asyncHandler(controller.list));
router.post('/', adminOnly, asyncHandler(controller.create));
router.put('/:id', adminOnly, asyncHandler(controller.update));
router.delete('/:id', adminOnly, asyncHandler(controller.remove));
router.get('/:qrToken/qr-code', asyncHandler(controller.qrCode));
router.get('/:qrToken/menu', asyncHandler(controller.qrMenu));

module.exports = router;
