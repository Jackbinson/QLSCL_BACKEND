const express = require('express');
const cors = require('cors');
const httpLogger = require('./middlewares/httpLogger.m');
const bookingRoutes = require('./routes/bookings.r'); 
const authRoutes = require('./routes/auth.r');
const walletRoutes = require('./routes/wallet.r');
const startBookingCronJob = require('./jobs/booking.cron');
const voucherRoutes = require('./routes/voucher.r')
const adminRoutes = require('./routes/admin.r');
const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
startBookingCronJob();
// Gắn routex
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voucher', voucherRoutes);
app.use(httpLogger);
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chào mừng đến với API Quản lý Sân Cầu Lông!'
  });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Đường dẫn API không tồn tại!' });
});

module.exports = app;