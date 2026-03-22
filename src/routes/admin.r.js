const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.c');
const authMiddleware = require('../middlewares/auth.m');

router.get('/dashboard', authMiddleware.verifyToken, authMiddleware.authorizeRoles(['Admin']), adminController.getDashboardStats);
router.get('/users', authMiddleware.verifyToken, authMiddleware.authorizeRoles(['Admin']), adminController.getAccountsForAcl);
router.get('/users/:userId/permissions', authMiddleware.verifyToken, authMiddleware.authorizeRoles(['Admin']), adminController.getUserAcl);
router.patch('/users/:userId/permissions', authMiddleware.verifyToken, authMiddleware.authorizeRoles(['Admin']), adminController.updateUserAcl);
router.get('/logs', authMiddleware.verifyToken, authMiddleware.authorizeRoles(['Admin']), adminController.getSystemLogs);

module.exports = router;
