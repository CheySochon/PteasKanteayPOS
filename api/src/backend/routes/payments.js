const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const cashierRoles = [authMiddleware, roleMiddleware(['Admin', 'Cashier'])];

router.get('/', cashierRoles, asyncHandler(controller.list));
router.post('/', cashierRoles, asyncHandler(controller.create));

module.exports = router;
