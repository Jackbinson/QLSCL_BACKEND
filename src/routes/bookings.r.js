const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookings.c');

// Import cả 2 middleware từ auth.m
const { verifyToken, authorizeRoles } = require('../middlewares/auth.m');

// --- NHÓM API CÔNG KHAI ---
router.get('/available', bookingController.checkAvailability);

// --- NHÓM API DÀNH CHO KHÁCH HÀNG ---
router.get('/mine', verifyToken, bookingController.getUserBookings);
router.post('/', verifyToken, bookingController.createBooking);
router.delete('/:booking_id/cancel', verifyToken, bookingController.cancelBooking);

// --- NHÓM API DÀNH CHO NHÂN VIÊN/ADMIN ---

// 1. Check-out và Tính tiền phạt 
router.post('/:id/checkout', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.checkoutBooking);

// 2. Thanh toán tại quầy 
router.post('/:id/pay', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.payAtCounter);

// 3. Báo cáo doanh thu ca 
router.get('/reports/shift', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.getShiftReport);
// 4. Xem lỗi giao dịch 
router.get('/reports/errors', verifyToken, authorizeRoles(['Admin']), bookingController.getErrorReport);
module.exports = router;