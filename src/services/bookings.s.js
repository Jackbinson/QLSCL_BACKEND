const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const PENALTY_RATE_PER_MINUTE = 2000;
const GRACE_PERIOD_MINUTES = 5;

const checkoutBooking = async (bookingId, actualEndTimeStr) => {
    const booking = await db('Bookings').where({ id: bookingId }).first();
    if (!booking) throw new Error('Khong tim thay thong tin don dat san!');

    const parseMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const scheduledEndMinutes = parseMinutes(booking.end_time);
    const actualEndMinutes = parseMinutes(actualEndTimeStr);

    let penaltyFee = 0;
    let overdueMinutes = actualEndMinutes - scheduledEndMinutes;

    if (overdueMinutes > GRACE_PERIOD_MINUTES) {
        penaltyFee = overdueMinutes * PENALTY_RATE_PER_MINUTE;
    } else if (overdueMinutes < 0) {
        overdueMinutes = 0;
    }

    await db('Bookings').where({ id: bookingId }).update({
        actual_end_time: actualEndTimeStr,
        penalty_fee: penaltyFee
    });

    const updatedBooking = await db('Bookings').where({ id: bookingId }).first();

    return {
        isOverdue: penaltyFee > 0,
        overdueMinutes,
        penaltyFee,
        message: penaltyFee > 0
            ? `Khach ra tre ${overdueMinutes} phut. Phat ${penaltyFee.toLocaleString('vi-VN')} VND.`
            : 'Khach tra san dung gio. Khong phat sinh phi phat.',
        bookingDetails: updatedBooking
    };
};

// 1. Chuc nang Dat san
const createBooking = async (data) => {
    const { user_id, username, court_id, booking_date, start_time, end_time } = data;

    return await db.transaction(async (trx) => {
        const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
        if (!court) throw new Error('San khong kha dung hoac dang bao tri!');

        const overlapping = await trx('Bookings')
            .where({ court_id, booking_date })
            .whereIn('status', ['Pending', 'Partially Paid', 'Fully Paid', 'Active'])
            .andWhere(function () {
                this.where('start_time', '<', end_time)
                    .andWhere('end_time', '>', start_time);
            })
            .first();

        if (overlapping) {
            throw new Error(`Rat tiec, san nay da duoc dat vao khung gio nay roi. ${username || 'Ban'} vui long chon gio khac nhe!`);
        }

        const getHours = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours + (minutes / 60);
        };

        const startH = getHours(start_time);
        const endH = getHours(end_time);
        const duration = endH - startH;

        if (duration <= 0) throw new Error('Gio ket thuc phai sau gio bat dau!');

        const goldenRules = await trx('CourtPrices').where({ court_id });
        let appliedPricePerHour = court.price_per_hour;

        for (const rule of goldenRules) {
            const ruleStartH = getHours(rule.start_time);
            const ruleEndH = getHours(rule.end_time);

            if (startH >= ruleStartH && startH < ruleEndH) {
                appliedPricePerHour = rule.price;
                break;
            }
        }

        const total_price = appliedPricePerHour * duration;

        const user = await trx('Users').where({ id: user_id }).first();
        if (!user) throw new Error('Nguoi dung khong ton tai!');

        if (user.wallet_balance < total_price) {
            const thieu = total_price - user.wallet_balance;
            throw new Error(`So du vi khong du! Vui long nap them it nhat ${thieu} VND de chot san nay.`);
        }

        await trx('Users').where({ id: user_id }).decrement('wallet_balance', total_price);

        const [newBooking] = await trx('Bookings').insert({
            user_id,
            court_id,
            booking_date,
            start_time,
            end_time,
            total_price,
            status: 'Fully Paid'
        }).returning('*');

        return newBooking;
    });
};

// 2. Lay lich su dat san
const getUserBookings = async (userId) => {
    return await db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .where('Bookings.user_id', userId)
        .select('Bookings.*', 'Courts.name as court_name')
        .orderBy('booking_date', 'desc');
};

// 3. Huy lich dat san
const cancelBooking = async (bookingId, userId) => {
    return await db.transaction(async (trx) => {
        const booking = await trx('Bookings').where({ id: bookingId, user_id: userId }).first();

        if (!booking) throw new Error('Khong tim thay don dat san hoac ban khong co quyen huy!');
        if (booking.status === 'Cancelled') throw new Error('Don nay da duoc huy tu truoc roi!');

        const dateObj = new Date(booking.booking_date);
        const dateString = dateObj.toISOString().split('T')[0];
        const bookingDateTime = new Date(`${dateString}T${booking.start_time}`);
        const now = new Date();

        const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilBooking < 0) {
            throw new Error('San da den gio hoac da qua gio choi, khong the huy!');
        }

        let refundRatio = 0;
        if (hoursUntilBooking >= 72) {
            refundRatio = 0.75;
        } else if (hoursUntilBooking >= 24) {
            refundRatio = 0.5;
        } else {
            refundRatio = 0.25;
        }

        const paidAmount = Number(booking.total_price || 0);
        const refundAmount = paidAmount * refundRatio;

        await trx('Bookings').where({ id: bookingId }).update({
            status: 'Cancelled',
            updated_at: new Date()
        });

        if (refundAmount > 0) {
            const user = await trx('Users').where({ id: userId }).first();
            const currentBalance = Number(user.wallet_balance || 0);

            await trx('Users').where({ id: userId }).update({
                wallet_balance: currentBalance + refundAmount
            });

            await trx('transactions').insert({
                user_id: userId,
                transfer_amount: refundAmount,
                status: 'success',
                gateway_transaction_id: `REFUND_${bookingId}_${Date.now()}`
            });
        }

        return {
            message: `Da hoan ${refundRatio * 100}% (${refundAmount.toLocaleString('vi-VN')} VND) vao vi.`,
            refundAmount,
            refundRatio: `${refundRatio * 100}%`
        };
    });
};

// 4. Kiem tra san trong
const checkAvailability = async (date, time) => {
    const booked = await db('Bookings')
        .where({ booking_date: date, start_time: time })
        .whereNot('status', 'Cancelled')
        .pluck('court_id');
    return await db('Courts').where({ status: 'Active' }).whereNotIn('id', booked);
};

// 5. Cap nhat trang thai tu dong
const updateCompletedBookings = async () => {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0];

        const updatedRows = await db('Bookings')
            .where('status', 'Fully Paid')
            .andWhere(function () {
                this.where('booking_date', '<', currentDate)
                    .orWhere(function () {
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

// 6. Thanh toan tai quay
const payAtCounter = async (bookingId, cashReceived) => {
    const booking = await db('Bookings').where({ id: bookingId }).first();

    if (!booking) throw new Error('Hien tai chung toi khong tim thay thong tin don dat san!');
    if (booking.status === 'Fully Paid') throw new Error('Don nay da duoc thanh toan tu truoc!');

    const basePrice = Number(booking.total_price || 0);
    const penaltyFee = Number(booking.penalty_fee || 0);
    const totalAmountToPay = basePrice + penaltyFee;

    if (Number(cashReceived) < totalAmountToPay) {
        throw new Error(`Khach dua thieu tien! Can thanh toan: ${totalAmountToPay.toLocaleString('vi-VN')} VND`);
    }

    await db.transaction(async (trx) => {
        await trx('Bookings').where({ id: bookingId }).update({
            status: 'Fully Paid',
            updated_at: new Date()
        });
        await trx('transactions').insert({
            user_id: booking.user_id,
            transfer_amount: totalAmountToPay,
            status: 'success',
            gateway_transaction_id: `CASH_${bookingId}_${Date.now()}`
        });
    });

    const changeAmount = Number(cashReceived) - totalAmountToPay;
    const finalBooking = await db('Bookings').where({ id: bookingId }).first();

    return {
        message: 'Thanh toan thanh cong! Da chot don.',
        totalAmountToPay,
        cashReceived: Number(cashReceived),
        changeAmount,
        bookingDetails: finalBooking
    };
};

// Bao cao doanh thu
const getShiftRevenue = async (startTime, endTime) => {
    const transactions = await db('transactions')
        .where('status', 'success')
        .whereBetween('created_at', [startTime, endTime]);
    let totalCash = 0;
    let totalTransfer = 0;
    let totalRefund = 0;
    transactions.forEach((tx) => {
        const amount = Number(tx.transfer_amount || 0);
        const gatewayId = tx.gateway_transaction_id || '';
        if (gatewayId.startsWith('CASH_')) {
            totalCash += amount;
        } else if (gatewayId.startsWith('REFUND_')) {
            totalRefund += amount;
        } else {
            totalTransfer += amount;
        }
    });
    const netRevenue = totalCash + totalTransfer - totalRefund;
    return {
        shift_duration: `${startTime} den ${endTime}`,
        total_transactions: transactions.length,
        summary: {
            cash_received: totalCash,
            online_transfer: totalTransfer,
            refunded_amount: totalRefund,
            net_revenue: netRevenue
        },
        details: transactions
    };
};

const getFailedTransactions = async () => {
    return await db('transactions')
        .where('status', 'failed')
        .orderBy('created_at', 'desc');
};

module.exports = {
    createBooking,
    getUserBookings,
    cancelBooking,
    checkAvailability,
    updateCompletedBookings,
    checkoutBooking,
    payAtCounter,
    getShiftRevenue,
    getFailedTransactions
};
