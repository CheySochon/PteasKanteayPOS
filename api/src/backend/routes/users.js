var express = require('express');
var router = express.Router();
const controller = require('../controllers/userController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const adminOnly = [authMiddleware, roleMiddleware(['Admin'])];

router.get('/', adminOnly, asyncHandler(controller.list));
router.get('/roles', adminOnly, asyncHandler(controller.roles));
router.post('/', adminOnly, asyncHandler(controller.create));
router.put('/:id', adminOnly, asyncHandler(controller.update));
router.delete('/:id', adminOnly, asyncHandler(controller.remove));

module.exports = router;
