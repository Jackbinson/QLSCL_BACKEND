const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.c');
const authMiddleware = require('../middlewares/auth.m');

// Khách hàng gọi API này để lấy link mã QR
// Cú pháp: GET /api/wallet/qr?amount=50000
router.get('/qr', authMiddleware.verifyToken, walletController.generateQR);

// Khách hàng gọi API này để tự cộng tiền vào ví (Giả lập)
// Cú pháp: POST /api/wallet/topup (Kèm JSON Body)
router.post('/topup', authMiddleware.verifyToken, walletController.topUp);

module.exports = router;