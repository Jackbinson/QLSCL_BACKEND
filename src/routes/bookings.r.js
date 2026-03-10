const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookings.c');
const authMiddleware = require('../middlewares/auth.m');

router.get('/available', bookingController.checkAvailability);
router.get('/mine', authMiddleware.verifyToken, bookingController.getUserBookings);
router.post('/', authMiddleware.verifyToken, bookingController.bookCourt);
router.put('/cancel/:booking_id', authMiddleware.verifyToken, bookingController.cancelBooking);
router.delete('/:booking_id', authMiddleware.verifyToken, bookingController.cancelBooking);
module.exports = router;