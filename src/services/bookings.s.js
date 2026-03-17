const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);
const PENALTY_RATE_PER_MINUTE = 2000;
const GRACE_PERIOD_MINUTES = 5;
const checkoutBooking = async (bookingId, actualEndTimeStr) => {
    const booking = await db('Bookings').where({id: bookingId}).first();
    if (!booking) throw new Error('Không tìm thấy thông tin đơn đặt sân!');

    const parseMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const scheduledEndMinutes = parseMinutes(booking.end_time);
    const actualEndMinutes = parseMinutes(actualEndTimeStr); // Đã sửa chữ i thường
    
    let penaltyFee = 0;
    let overdueMinutes = actualEndMinutes - scheduledEndMinutes;

    // Đã sửa chữ PERIOD
    if (overdueMinutes > GRACE_PERIOD_MINUTES) {
        penaltyFee = overdueMinutes * PENALTY_RATE_PER_MINUTE;
    } else if (overdueMinutes < 0) {
        overdueMinutes = 0;
    } 

    await db('Bookings').where({id: bookingId}).update({
        actual_end_time: actualEndTimeStr,
        penalty_fee: penaltyFee // Đã sửa lại đúng tên cột trong Database
    });

    const updatedBooking = await db('Bookings').where({id : bookingId}).first();
    
    return {
        isOverdue: penaltyFee > 0,
        overdueMinutes: overdueMinutes,
        penaltyFee: penaltyFee,
        message: penaltyFee > 0 
        ? `Khách ra trễ ${overdueMinutes} phút. Phạt ${penaltyFee.toLocaleString('vi-VN')} VNĐ.`
        : `Khách trả sân đúng giờ. Không phát sinh phí phạt.`, // Đã sửa lỗi chính tả
        bookingDetails: updatedBooking
    };
};
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
// Thanh toán tại quầy
const payAtCounter = async(bookingId, cashReceived) => { 
    const booking = await db('Bookings').where({
        id: bookingId
    }).first();
    if (!booking) { 
        throw new Error('Hiện tại chúng tôi không tìm thấy thông tin dơn đặt sân!');
    }
    if (booking.status === 'Fully Paid') {
        throw new Error('Đơn này đã được thanh toán từ trước!')
    }
    const basePrice = Number(booking.total_price || 0);
    const penaltyFee = Number(booking.penalty_fee || 0);
    const totalAmountToPay = basePrice + penaltyFee;
    if (Number(cashReceived) < totalAmountToPay) { 
        throw new Error(`Ví khách hiện giờ đang thiếu tiền! Cần thanh toán": ${totalAmountToPay}`)
    }
    await db.transaction(async (trx) => {
        await trx('Bookings').where({
            id: bookingId
        }).update({
            status: 'Fully Paid',
            updated_at: new Date()
        });
    })
    await trx('transaction').insert({
        user_id: booking.user_id,
        booking_id: bookingId,
        transfer_amount: totalAmountToPay,
        status: 'success',
    });
    const changeAmount = Number(cashReceived) - totalAmountToPay;
    const finalBooking = await db('Bookings').where({
        id: bookingId
    }).first()
    return {
        message: 'Thanh toán thành công! Đã chốt đơn.',
        totalAmountToPay: totalAmountToPay,
        cashReceived: Number(cashReceived),
        changeAmount: changeAmount,
        bookingDetails: finalBooking
    };
};
module.exports = {
    createBooking,
    getUserBookings,
    cancelBooking,
    checkAvailability,
    updateCompletedBookings,
    checkoutBooking,
    payAtCounter
};