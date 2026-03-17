const express = require('express');
const router = express.Router();

// Import Controller (Nhớ kiểm tra xem tên file Controller có đúng là voucher.c.js không nhé)
const voucherController = require('../controllers/voucher.c'); 

// API tạo mã test (Admin)
router.post('/create', voucherController.createTestVoucher);

// API kiểm tra mã (Khách hàng dùng khi chốt đơn)
router.post('/apply', voucherController.applyVoucher);

// Thêm dòng này để test xem Server có nhận code mới không
router.get('/test-nhan-pham', (req, res) => {
    res.send("CHÀO JACK! SERVER ĐÃ NHẬN ĐƯỢC CODE MỚI!");
});
module.exports = router;