const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

// 1. Chức năng Đặt sân
const createBooking = async (data) => {
    const { user_id, username, court_id, booking_date, start_time, end_time } = data;

    return await db.transaction(async (trx) => {
        try {
            const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
            if (!court) throw new Error('Sân không khả dụng hoặc đang bảo trì!');

            const price = court.price_per_hour;
            const user = await trx('Users').where({ id: user_id }).first();
            if (!user) throw new Error('Người dùng không tồn tại!');

            if (user.wallet_balance < price) {
                const thieu = price - user.wallet_balance;
                throw new Error(`Số dư ví không đủ! Vui lòng nạp thêm ít nhất ${thieu} VND để chốt sân này`);
            }

            // Trừ tiền trong ví
            await trx('Users').where({ id: user_id }).decrement('wallet_balance', price);

            const [newBooking] = await trx('Bookings').insert({
                user_id,
                court_id,
                booking_date,
                start_time,
                end_time,
                total_price: price,
                status: 'Fully Paid' 
            }).returning('*');

            return newBooking;

        } catch (error) {
            if (error.code === '23505') { // Lỗi trùng unique constraint
                throw new Error(`Rất tiếc, sân này đã được đặt vào khung giờ này rồi. ${username} vui lòng chọn khung giờ hoặc sân khác nhé!`);
            }
            throw error;
        }
    });
};

// 2. Lấy lịch sử đặt sân
const getUserBookings = async (userId) => {
    return await db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .where('Bookings.user_id', userId)
        .select('Bookings.*', 'Courts.name as court_name')
        .orderBy('booking_date', 'desc');
};

// 3. Hủy lịch đặt sân
const cancelBooking = async (bookingId, userId) => {
    return await db.transaction(async (trx) => {
        const booking = await trx('Bookings').where({ id: bookingId, user_id: userId }).first();
        if (!booking) throw new Error('Không tìm thấy lịch đặt hoặc bạn không có quyền hủy!');
        if (booking.status === 'Cancelled') throw new Error('Lịch đặt này đã được hủy trước đó rồi!');

        // Cập nhật trạng thái thành Cancelled (Hợp lệ trong DB)
        await trx('Bookings').where({ id: bookingId, user_id: userId }).update({ status: 'Cancelled' });
        
        // Hoàn tiền lại vào ví
        await trx('Users').where({ id: userId }).increment('wallet_balance', booking.total_price);

        return { message: `Đã hủy thành công! Hệ thống đã hoàn lại ${booking.total_price} VND vào ví.` };
    });
};

// 4. Kiểm tra sân trống
const checkAvailability = async (date, time) => {
    const booked = await db('Bookings')
        .where({ booking_date: date, start_time: time })
        .whereNot('status', 'Cancelled')
        .pluck('court_id');
    return await db('Courts').where({ status: 'Active' }).whereNotIn('id', booked);
};

// 5. Cập nhật trạng thái tự động 
const updateCompletedBookings = async () => {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0];

        const updatedRows = await db('Bookings')
            .where('status', 'Fully Paid') // ✅ Tìm đúng những đơn đã thanh toán
            .andWhere(function() {
                this.where('booking_date', '<', currentDate)
                    .orWhere(function() {
                        this.where('booking_date', '=', currentDate)
                            .andWhere('end_time', '<', currentTime);
                    });
            })

            .update({ status: 'Active' }); 

        return updatedRows;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createBooking,
    getUserBookings,
    cancelBooking,
    checkAvailability,
    updateCompletedBookings
};