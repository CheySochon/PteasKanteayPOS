const express = require('express');
const router = express.Router();
const controller = require('../controllers/shiftController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const staffRoles = [authMiddleware, roleMiddleware(['Admin', 'Cashier', 'Staff'])];

router.get('/', staffRoles, asyncHandler(controller.list));
router.post('/start', staffRoles, asyncHandler(controller.start));
router.put('/:id/end', staffRoles, asyncHandler(controller.end));

module.exports = router;
