const express = require('express');
const router = express.Router();
const controller = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const staffRoles = [authMiddleware, roleMiddleware(['Admin', 'Cashier', 'Staff'])];

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));
router.post('/', asyncHandler(controller.create));
router.put('/:id/status', staffRoles, asyncHandler(controller.updateStatus));
router.delete('/:id', staffRoles, asyncHandler(controller.remove));
router.post('/:id/items', staffRoles, asyncHandler(controller.addItem));
router.post('/:id/split-bill', staffRoles, asyncHandler(controller.splitBill));
router.get('/:orderId/payments', staffRoles, asyncHandler(paymentController.listByOrder));

module.exports = router;
