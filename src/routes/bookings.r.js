const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookings.c');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.m');

// Nhom API cong khai
router.get('/available', bookingController.checkAvailability);
router.get('/calendar/live', bookingController.getLiveCalendar);

// Nhom API danh cho khach hang
router.get('/mine', verifyToken, bookingController.getUserBookings);
router.post('/', verifyToken, bookingController.createBooking);
router.delete('/:booking_id/cancel', verifyToken, bookingController.cancelBooking);

// Nhom API danh cho nhan vien/Admin
router.post('/:id/checkout', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.checkoutBooking);
router.post('/:id/pay', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.payAtCounter);
router.get('/reports/shift', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.getShiftReport);
router.get('/reports/errors', verifyToken, authorizeRoles(['Admin']), bookingController.getErrorReport);

module.exports = router;
