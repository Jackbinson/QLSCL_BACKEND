const bookingService = require('../services/bookings.s');
const logger = require('../utils/logger'); 

// Kiểm tra sân thực tế 
const checkoutBooking = async (req, res) => {
    try {
        const { id } = req.params; 
        const { actual_end_time } = req.body; 

        if (!actual_end_time) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp giờ trả sân thực tế!' });
        }

        const result = await bookingService.checkoutBooking(id, actual_end_time);
        return res.status(200).json({ success: true, data: result });
        
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Đặt sân
const createBooking = async (req, res) => {
  try {
    const { user_id, username } = req.user; 
    const { court_id, booking_date, start_time, end_time } = req.body;

    if (!court_id || !booking_date || !start_time || !end_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng cung cấp đầy đủ thông tin: Sân, ngày và khung giờ đặt!' 
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
      message: 'Đặt sân thành công!', 
      booking_id: result.id 
    });
  } catch (error) {
    return res.status(409).json({ 
      success: false, 
      message: error.message 
    });
  }
};
// Lấy lịch sử đặt sân
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
      message: 'Lỗi khi tải lịch sử: ' + error.message 
    });
  }
};
// Kiểm tra sân được còn dùng
const checkAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    if (!date || !time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Jack ơi, bạn cần cung cấp đủ ngày và giờ để mình tìm sân giúp nhé!' 
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
// Hủy đặt sân 
const cancelBooking = async (req, res) => {
  try {
    const { booking_id } = req.params; 
    const { user_id, username } = req.user; 
    const result = await bookingService.cancelBooking(booking_id, user_id);
    
    logger.info({
      message: 'Hành động hủy sân được thực hiện',
      action: 'DELETE_BOOKING',
      actor_id: user_id,
      actor_name: username,
      target_booking_id: booking_id,
      time: new Date().toISOString()
    });

    return res.status(200).json({ 
      success: true, 
      message: `Hủy lịch đặt sân thành công! ${result.message}`, 
      data: result
    });

  } catch (error) {
    logger.error({
        message: `Lỗi khi hủy sân: ${error.message}`,
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

// Thanh toán tại quầy
const payAtCounter = async (req,res)  => {
  try { 
    const {id} = req.params;
    const {cash_received} = req.body;
    if (!cash_received) { 
      return res.status(400).json({
        success: false, 
        message: 'Vui lòng nhập số tiền khách đưa!'
      });
    }
    const result = await bookingService.payAtCounter(id, cash_received);
    return res.status(200).json({
      success: true,
      data: result
    })
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
        message: 'Vui lòng cung cấp đầy đủ cả start_time và end_time!'
      });
    }

    const report = await bookingService.getShiftRevenue(start_time, end_time);
    
    return res.status(200).json({
      success: true,
      message: 'Xuất báo cáo doanh thu thành công!',
      data: report
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 4. Bổ sung hàm Báo cáo lỗi (FE-04.7) bị thiếu nè!
const getErrorReport = async (req, res) => {
  try {
      const errors = await bookingService.getFailedTransactions();
      return res.status(200).json({
          success: true,
          message: 'Danh sách giao dịch lỗi cần xử lý',
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
    checkoutBooking,
    payAtCounter,
    getShiftReport,
    getErrorReport
};