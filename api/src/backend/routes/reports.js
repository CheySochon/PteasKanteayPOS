const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const reportRoles = [authMiddleware, roleMiddleware(['Admin', 'Cashier'])];

router.get('/daily-sales', reportRoles, asyncHandler(controller.dailySales));
router.get('/monthly-sales', reportRoles, asyncHandler(controller.monthlySales));
router.get('/top-products', reportRoles, asyncHandler(controller.topProducts));
router.get('/export-csv', reportRoles, asyncHandler(controller.exportCsv));

module.exports = router;
