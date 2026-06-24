const express = require('express');
const router = express.Router();
const controller = require('../controllers/customerController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const staffRoles = [authMiddleware, roleMiddleware(['Admin', 'Cashier', 'Staff'])];

router.get('/', staffRoles, asyncHandler(controller.list));
router.get('/:id', staffRoles, asyncHandler(controller.get));
router.post('/', staffRoles, asyncHandler(controller.create));
router.put('/:id', staffRoles, asyncHandler(controller.update));
router.get('/:id/orders', staffRoles, asyncHandler(controller.orders));

module.exports = router;
