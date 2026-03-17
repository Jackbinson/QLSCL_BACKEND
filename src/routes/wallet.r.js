const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.c');
const authMiddleware = require('../middlewares/auth.m');

// 1. Khách lấy mã QR
router.get('/qr', authMiddleware.verifyToken, walletController.generateQR);

// 2. Khách tự nạp tiền giả lập
router.post('/topup', authMiddleware.verifyToken, walletController.topUp);

router.post('/sepaywebhook', walletController.handleSePayWebhook);

module.exports = router;