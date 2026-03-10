const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

exports.createBooking = async (data) => {
  // Lấy username được truyền từ Controller xuống (nguồn từ Bearer Token)
  const { user_id, username, court_id, booking_date, start_time, end_time } = data;
  
  return await db.transaction(async (trx) => {
    try {
      // 1. Kiểm tra sân có sẵn sàng không
      const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
      if (!court) throw new Error('Sân không khả dụng hoặc đang bảo trì!');

      const price = court.price_per_hour;
      const user = await trx('Users').where({ id: user_id}).first();
      if (!user) {
        throw new Error('Người dùng không tồn tại!');
      }
      if (user.wallet_balance < price) { 
        const thieu = price - user.wallet_balance;
        throw new Error('Số dư ví không đủ! Vui lòng nạp thêm ít nhất ${thieu} VND để chốt sân này')
      }
      await trx('Users').where({ id: user_id}).decrement('wallet-balance', price);
      const [newBooking] = await trx('Bookings').insert({
        user_id, 
        court_id, 
        booking_date, 
        start_time, 
        end_time,
        total_price: court.price_per_hour,
        status: 'Paid'
      }).returning('*');

      return newBooking;

    } catch (error) {
      // 3. Xử lý lỗi trùng lịch (Mã lỗi 23505 của PostgreSQL)
      if (error.code === '23505') {
        // Sử dụng biến ${username} thay vì ghi cứng tên để linh hoạt theo từng Token
        throw new Error(`Rất tiếc, sân này đã được đặt vào khung giờ này rồi. ${username} vui lòng chọn khung giờ hoặc sân khác nhé!`);
      }
      
      throw error;
    }
  });
};

// Lấy danh sách lịch sử đặt sân của người dùng
exports.getUserBookings = async (userId) => {
  return await db('Bookings')
    .join('Courts', 'Bookings.court_id', 'Courts.id')
    .where('Bookings.user_id', userId)
    .select('Bookings.*', 'Courts.name as court_name')
    .orderBy('booking_date', 'desc');
};
// Hủy lịch đặt sân
exports.cancelBooking = async (bookingId, userId) => {
  // Mở Transaction và ôm TRỌN BỘ logic vào bên trong
  return await db.transaction(async (trx) => {
    
    // 1. TÌM KIẾM (Sử dụng đúng biến bookingId và userId, bắt buộc dùng trx)
    const booking = await trx('Bookings')
      .where({ id: bookingId, user_id: userId })
      .first();

    // 2. KIỂM TRA ĐIỀU KIỆN
    if (!booking) {
      throw new Error('Không tìm thấy lịch đặt hoặc bạn không có quyền hủy!');
    }
    
    if (booking.status === 'Cancelled') {
      throw new Error('Lịch đặt này đã được hủy trước đó rồi!');
    }

    // 3. ĐỔI TRẠNG THÁI SÂN (Bắt buộc dùng trx)
    await trx('Bookings')
      .where({ id: bookingId, user_id: userId })
      .update({ status: 'Cancelled' });

    await trx('Users')
      .where({ id: userId })
      .increment('wallet_balance', booking.total_price);

    // 5. TRẢ VỀ KẾT QUẢ
    return { 
      message: `Đã hủy thành công! Hệ thống đã hoàn lại ${booking.total_price} VND vào ví.` 
    };
    
  });
};

exports.checkAvailability = async (date, time) => {
  const booked = await db('Bookings')
    .where({ booking_date: date, start_time: time })
    .whereNot('status', 'Cancelled')
    .pluck('court_id');

  return await db('Courts').where({ status: 'Active' }).whereNotIn('id', booked);
};

exports.updateCompleteBookings = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    const updatedRows = await db('Bookings')
      .where('status', 'Paid')
      .andWhere(function() {
        this.where('booking_date','<',currentDate)
        .orWhere(function(){
          this.where('booking_date','=', currentDate)
          .andWhere('end_time','<', currentTime);
        });
      })
      .update({status: 'completed'})
    return updatedRows;
    } catch (error) {
      throw error;
    }
  };