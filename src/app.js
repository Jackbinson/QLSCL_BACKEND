const express = require('express');
const cors = require('cors');
const path = require('path');
const httpLogger = require('./middlewares/httpLogger.m');
const bookingRoutes = require('./routes/bookings.r'); 
const authRoutes = require('./routes/auth.r');
const walletRoutes = require('./routes/wallet.r');
const voucherRoutes = require('./routes/voucher.r');
const adminRoutes = require('./routes/admin.r');
const courtRoutes = require('./routes/courts.r'); 
const startBookingCronJob = require('./jobs/booking.cron');

const app = express();

// --- MIDDLEWARES ---
app.use(cors()); 
app.use(httpLogger); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- STATIC FILES ---
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- CRON JOBS ---
startBookingCronJob();

// --- ROUTES ---
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voucher', voucherRoutes);
app.use('/api/courts', courtRoutes); 

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chào mừng đến với API Quản lý Sân Cầu Lông!'
  });
});

// --- ERROR HANDLING ---
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Đường dẫn API không tồn tại!' });
});

// (Tùy chọn) Nên có thêm 1 middleware xử lý lỗi tổng quát ở cuối
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Lỗi server nội bộ!' });
});

module.exports = app;