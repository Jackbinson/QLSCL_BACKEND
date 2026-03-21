const bookingService = require('../services/bookings.s');
const logger = require('../utils/logger');

// Kiem tra san thuc te
const checkoutBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_end_time } = req.body;

    if (!actual_end_time) {
      return res.status(400).json({ success: false, message: 'Vui long cung cap gio tra san thuc te!' });
    }

    const result = await bookingService.checkoutBooking(id, actual_end_time);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Dat san
const createBooking = async (req, res) => {
  try {
    const { user_id, username } = req.user;
    const { court_id, booking_date, start_time, end_time } = req.body;

    if (!court_id || !booking_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap day du thong tin: San, ngay va khung gio dat!'
      });
    }

    const result = await bookingService.createBooking({
      user_id,
      username,
      court_id,
      booking_date,
      start_time,
      end_time
    });

    return res.status(201).json({
      success: true,
      message: 'Dat san thanh cong!',
      booking_id: result.id
    });
  } catch (error) {
    return res.status(409).json({
      success: false,
      message: error.message
    });
  }
};

// Lay lich su dat san
const getUserBookings = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const bookings = await bookingService.getUserBookings(user_id);

    return res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Loi khi tai lich su: ' + error.message
    });
  }
};

// Kiem tra san duoc con dung
const checkAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Jack oi, ban can cung cap du ngay va gio de minh tim san giup nhe!'
      });
    }

    const courts = await bookingService.checkAvailability(date, time);
    return res.status(200).json({
      success: true,
      data: courts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// FE-03.1 Live Calendar
const getLiveCalendar = async (req, res) => {
  try {
    const { start_date, court_id } = req.query;

    if (!start_date) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap start_date de he thong tai lich trong tuan!'
      });
    }

    const calendar = await bookingService.getLiveCalendar({
      start_date,
      court_id
    });

    return res.status(200).json({
      success: true,
      message: 'Lay du lieu live calendar thanh cong!',
      data: calendar
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Huy dat san
const cancelBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { user_id, username } = req.user;
    const result = await bookingService.cancelBooking(booking_id, user_id);

    logger.info({
      message: 'Hanh dong huy san duoc thuc hien',
      action: 'DELETE_BOOKING',
      actor_id: user_id,
      actor_name: username,
      target_booking_id: booking_id,
      time: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Huy lich dat san thanh cong! ${result.message}`,
      data: result
    });
  } catch (error) {
    logger.error({
      message: `Loi khi huy san: ${error.message}`,
      action: 'DELETE_BOOKING_ERROR',
      actor_id: req.user?.user_id,
      target_booking_id: req.params?.booking_id
    });

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Thanh toan tai quay
const payAtCounter = async (req, res) => {
  try {
    const { id } = req.params;
    const { cash_received } = req.body;
    if (!cash_received) {
      return res.status(400).json({
        success: false,
        message: 'Vui long nhap so tien khach dua!'
      });
    }
    const result = await bookingService.payAtCounter(id, cash_received);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getShiftReport = async (req, res) => {
  try {
    const { start_time, end_time } = req.query;
    if (!start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap day du ca start_time va end_time!'
      });
    }

    const report = await bookingService.getShiftRevenue(start_time, end_time);

    return res.status(200).json({
      success: true,
      message: 'Xuat bao cao doanh thu thanh cong!',
      data: report
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getErrorReport = async (req, res) => {
  try {
    const errors = await bookingService.getFailedTransactions();
    return res.status(200).json({
      success: true,
      message: 'Danh sach giao dich loi can xu ly',
      data: errors
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  cancelBooking,
  checkAvailability,
  getLiveCalendar,
  checkoutBooking,
  payAtCounter,
  getShiftReport,
  getErrorReport
};
