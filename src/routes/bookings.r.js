const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookings.c');
const { verifyToken, authorizeRoles, authorizePermission } = require('../middlewares/auth.m');

// Nhom API cong khai
router.get('/available', bookingController.checkAvailability);
router.get('/calendar/live', bookingController.getLiveCalendar);

// Nhom API danh cho khach hang
router.get('/mine', verifyToken, bookingController.getUserBookings);
router.get('/waitlist/mine', verifyToken, bookingController.getUserWaitlist);
router.get('/notifications/mine', verifyToken, bookingController.getUserNotifications);
router.post('/overlap-check', verifyToken, bookingController.checkOverlap);
router.post('/waitlist', verifyToken, bookingController.createWaitlistRegistration);
router.patch('/:id/reschedule', verifyToken, bookingController.rescheduleBooking);
router.post('/', verifyToken, bookingController.createBooking);
router.post('/recurring', verifyToken, bookingController.createRecurringBooking);
router.get('/:booking_id/cancel-policy', verifyToken, bookingController.previewCancellationPolicy);
router.delete('/:booking_id/cancel', verifyToken, bookingController.cancelBooking);
// Nhom API danh cho nhan vien/Admin
router.post('/check-in', verifyToken, authorizeRoles(['Admin', 'Staff']), authorizePermission('CHECK_IN'), bookingController.checkInBooking);
router.patch('/:id/extend', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.extendBooking);
router.post('/:id/checkout', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.checkoutBooking);
router.post('/:id/pay', verifyToken, authorizeRoles(['Admin', 'Staff']), bookingController.payAtCounter);
router.get('/reports/shift', verifyToken, authorizeRoles(['Admin', 'Staff']), authorizePermission('VIEW_REPORTS'), bookingController.getShiftReport);
router.get('/reports/errors', verifyToken, authorizeRoles(['Admin']), authorizePermission('VIEW_REPORTS'), bookingController.getErrorReport);

module.exports = router;
