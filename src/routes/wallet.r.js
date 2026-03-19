const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.c');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.m');

// --- DÀNH CHO KHÁCH HÀNG ---

// Khách lấy mã QR để quét (Cần login là được)
router.get('/qr', verifyToken, walletController.generateQR);


// --- DÀNH CHO NHÂN VIÊN / ADMIN ---

// Chỉ Admin hoặc Staff mới được dùng lệnh "nạp tiền tay" này (FE-04.5)
// Tránh việc khách hàng tự nạp tiền ảo cho chính mình
router.post(
    '/topup', 
    verifyToken, 
    authorizeRoles(['Admin', 'Staff']), 
    walletController.topUp
);


// --- CỔNG TỰ ĐỘNG (PUBLIC) ---

// SePay sẽ gọi vào đây, không cần Token vì SePay không có tài khoản trên web mình
// (Bên trong Controller handleSePayWebhook Jack nhớ check Secret Key để bảo mật nhé)
router.post('/sepaywebhook', walletController.handleSePayWebhook);

module.exports = router;