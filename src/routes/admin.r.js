const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.c');
const authMiddleware = require('../middlewares/auth.m');

router.get('/dashboard', authMiddleware.verifyToken, adminController.getDashboardStats);

module.exports = router;