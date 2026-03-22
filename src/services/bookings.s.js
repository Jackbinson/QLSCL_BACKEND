const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);
const { checkTimeOverlap } = require('../utils/booking.helper');
const PENALTY_RATE_PER_MINUTE = 2000;
const GRACE_PERIOD_MINUTES = 5;
const RECURRING_WEEKDAY_MAP = {
    CN: 0,
    SUN: 0,
    T2: 1,
    MON: 1,
    T3: 2,
    TUE: 2,
    T4: 3,
    WED: 3,
    T5: 4,
    THU: 4,
    T6: 5,
    FRI: 5,
    T7: 6,
    SAT: 6
};
const CANCELLATION_POLICY_RULES = [
    { min_hours: 48, refund_ratio: 1 },
    { min_hours: 24, refund_ratio: 0.5 },
    { min_hours: 12, refund_ratio: 0.25 },
    { min_hours: 0, refund_ratio: 0 }
];

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

const normalizeRecurringWeekdays = (weekdays) => {
    const rawWeekdays = Array.isArray(weekdays) ? weekdays : [weekdays];
    const normalized = rawWeekdays.map((item) => {
        if (typeof item === 'number') {
            if (item < 0 || item > 6) {
                throw new Error('Thu trong tuan khong hop le!');
            }
            return item;
        }

        const key = String(item).trim().toUpperCase();
        if (Object.prototype.hasOwnProperty.call(RECURRING_WEEKDAY_MAP, key)) {
            return RECURRING_WEEKDAY_MAP[key];
        }

        if (/^\d+$/.test(key)) {
            const numericDay = Number(key);
            if (numericDay >= 0 && numericDay <= 6) {
                return numericDay;
            }
        }

        throw new Error(`Thu trong tuan khong hop le: ${item}`);
    });

    return [...new Set(normalized)].sort((a, b) => a - b);
};

const generateRecurringDates = (startDateStr, endDateStr, weekdays) => {
    const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
    const endDate = new Date(`${endDateStr}T00:00:00.000Z`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Ngay bat dau hoac ngay ket thuc khong hop le!');
    }

    if (startDate > endDate) {
        throw new Error('end_date phai lon hon hoac bang start_date!');
    }

    const recurringDates = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
        if (weekdays.includes(cursor.getUTCDay())) {
            recurringDates.push(formatDateOnly(cursor));
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (recurringDates.length === 0) {
        throw new Error('Khong co ngay nao phu hop voi bo thu da chon!');
    }

    return recurringDates;
};

const getHourlyPriceByStartTime = (basePrice, goldenRules, startTime) => {
    const startHour = parseTimeToHours(startTime);
    let appliedPricePerHour = basePrice;

    for (const rule of goldenRules) {
        const ruleStartH = parseTimeToHours(rule.start_time);
        const ruleEndH = parseTimeToHours(rule.end_time);

        if (startHour >= ruleStartH && startHour < ruleEndH) {
            appliedPricePerHour = Number(rule.price);
            break;
        }
    }

    return appliedPricePerHour;
};

const formatTimeFromHours = (timeHours) => {
    const hours = Math.floor(timeHours);
    const minutes = Math.round((timeHours - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

const calculatePriceForTimeRange = (basePrice, goldenRules, startTime, endTime) => {
    const startHour = parseTimeToHours(startTime);
    const endHour = parseTimeToHours(endTime);

    if (endHour <= startHour) {
        throw new Error('Gio ket thuc phai sau gio bat dau!');
    }

    const boundaries = new Set([startHour, endHour]);
    for (const rule of goldenRules) {
        const ruleStartHour = parseTimeToHours(rule.start_time);
        const ruleEndHour = parseTimeToHours(rule.end_time);

        if (ruleStartHour > startHour && ruleStartHour < endHour) {
            boundaries.add(ruleStartHour);
        }

        if (ruleEndHour > startHour && ruleEndHour < endHour) {
            boundaries.add(ruleEndHour);
        }
    }

    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
    let totalPrice = 0;

    for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
        const segmentStart = sortedBoundaries[index];
        const segmentEnd = sortedBoundaries[index + 1];
        const segmentDuration = segmentEnd - segmentStart;
        const appliedPricePerHour = getHourlyPriceByStartTime(
            basePrice,
            goldenRules,
            formatTimeFromHours(segmentStart)
        );

        totalPrice += appliedPricePerHour * segmentDuration;
    }

    return Number(totalPrice.toFixed(2));
};

const validateBookingWindow = ({ court_id, booking_date, start_time, end_time }) => {
    if (!court_id || !booking_date || !start_time || !end_time) {
        throw new Error('Vui long cung cap day du san, ngay dat va khung gio!');
    }

    const startHour = parseTimeToHours(start_time);
    const endHour = parseTimeToHours(end_time);

    if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
        throw new Error('Khung gio dat khong hop le!');
    }

    if (endHour <= startHour) {
        throw new Error('Gio ket thuc phai sau gio bat dau!');
    }
};

const buildConflictDetails = ({ booking_date, start_time, end_time, overlapCheck }) => {
    if (!overlapCheck?.isOverlap) {
        return null;
    }

    return {
        booking_date,
        start_time,
        end_time,
        conflict_type: overlapCheck.conflict_type,
        message: overlapCheck.message
    };
};

const getBookingStartDateTime = (booking) => {
    const bookingDate = new Date(booking.booking_date);
    const bookingDateString = bookingDate.toISOString().split('T')[0];
    return new Date(`${bookingDateString}T${booking.start_time}`);
};

const getCancellationPolicy = (hoursUntilBooking) => {
    for (const rule of CANCELLATION_POLICY_RULES) {
        if (hoursUntilBooking >= rule.min_hours) {
            return rule;
        }
    }

    return CANCELLATION_POLICY_RULES[CANCELLATION_POLICY_RULES.length - 1];
};

const getCancellationRefundInfo = (booking) => {
    const bookingStartDateTime = getBookingStartDateTime(booking);
    const now = new Date();
    const hoursUntilBooking = (bookingStartDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < 0) {
        throw new Error('San da den gio hoac da qua gio choi, khong the huy!');
    }

    const matchedPolicy = getCancellationPolicy(hoursUntilBooking);
    const paidAmount = Number(booking.total_price || 0);
    const refundAmount = Number((paidAmount * matchedPolicy.refund_ratio).toFixed(2));

    return {
        hoursUntilBooking: Number(hoursUntilBooking.toFixed(2)),
        refundRatioValue: matchedPolicy.refund_ratio,
        refundRatioLabel: `${matchedPolicy.refund_ratio * 100}%`,
        refundAmount,
        bookingStartTime: bookingStartDateTime.toISOString(),
        policyMatched: {
            min_hours: matchedPolicy.min_hours,
            refund_ratio: matchedPolicy.refund_ratio
        }
    };
};

const getBookingHistoryStatus = (booking) => {
    if (booking.status === 'Cancelled') {
        return {
            code: 'cancelled',
            label: 'Da huy'
        };
    }

    const bookingStartDateTime = getBookingStartDateTime(booking);
    const now = new Date();

    if (bookingStartDateTime > now) {
        return {
            code: 'upcoming',
            label: 'Sap toi'
        };
    }

    return {
        code: 'completed',
        label: 'Da choi'
    };
};

const createWaitlistNotification = async (trx, waitlistItem, booking) => {
    const title = 'Khung gio dang cho da trong';
    const message = `San ${booking.court_id} ngay ${booking.booking_date} tu ${booking.start_time} den ${booking.end_time} vua co cho trong do co nguoi huy lich.`;

    await trx('Notifications').insert({
        user_id: waitlistItem.user_id,
        type: 'WAITLIST_AVAILABLE',
        title,
        message,
        meta: JSON.stringify({
            waitlist_id: waitlistItem.id,
            court_id: booking.court_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time
        })
    });
};

const notifyWaitlistUsers = async (trx, booking) => {
    const waitlistItems = await trx('BookingWaitlists')
        .where({
            court_id: booking.court_id,
            booking_date: booking.booking_date,
            status: 'Waiting'
        })
        .andWhere(function() {
            this.where('start_time', '<', booking.end_time)
                .andWhere('end_time', '>', booking.start_time);
        })
        .orderBy('created_at', 'asc');

    for (const waitlistItem of waitlistItems) {
        await createWaitlistNotification(trx, waitlistItem, booking);
    }

    if (waitlistItems.length > 0) {
        await trx('BookingWaitlists')
            .whereIn('id', waitlistItems.map((item) => item.id))
            .update({
                status: 'Notified',
                notified_at: trx.fn.now(),
                updated_at: trx.fn.now()
            });
    }

    return waitlistItems.length;
};

const checkBookingOverlap = async (data) => {
    const { court_id, booking_date, start_time, end_time, start_date, end_date, weekdays } = data;

    return await db.transaction(async (trx) => {
        const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
        if (!court) {
            throw new Error('San khong kha dung hoac dang bao tri!');
        }

        if (booking_date) {
            validateBookingWindow({ court_id, booking_date, start_time, end_time });
            const overlapCheck = await checkTimeOverlap(trx, court_id, booking_date, start_time, end_time);

            return {
                can_book: !overlapCheck.isOverlap,
                court_id,
                booking_date,
                start_time,
                end_time,
                conflicts: overlapCheck.isOverlap
                    ? [buildConflictDetails({ booking_date, start_time, end_time, overlapCheck })]
                    : []
            };
        }

        const normalizedWeekdays = normalizeRecurringWeekdays(weekdays);
        const recurringDates = generateRecurringDates(start_date, end_date, normalizedWeekdays);
        const conflicts = [];

        validateBookingWindow({
            court_id,
            booking_date: recurringDates[0],
            start_time,
            end_time
        });

        for (const currentDate of recurringDates) {
            const overlapCheck = await checkTimeOverlap(trx, court_id, currentDate, start_time, end_time);
            if (overlapCheck.isOverlap) {
                conflicts.push(buildConflictDetails({
                    booking_date: currentDate,
                    start_time,
                    end_time,
                    overlapCheck
                }));
            }
        }

        return {
            can_book: conflicts.length === 0,
            court_id,
            start_date,
            end_date,
            weekdays: normalizedWeekdays,
            start_time,
            end_time,
            checked_dates: recurringDates,
            conflicts
        };
    });
};

// 1. Chuc nang Dat san
const createBooking = async (data) => {
    const { user_id, username, court_id, booking_date, start_time, end_time } = data;

    return await db.transaction(async (trx) => {
        const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
        if (!court) throw new Error('San khong kha dung hoac dang bao tri!');
        validateBookingWindow({ court_id, booking_date, start_time, end_time });
        const overlapCheck = await checkTimeOverlap(trx, court_id, booking_date, start_time, end_time);
        if (overlapCheck.isOverlap) throw new Error(overlapCheck.message);

        const getHours = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours + (minutes / 60);
        };

        const startH = getHours(start_time);
        const endH = getHours(end_time);
        const duration = endH - startH;

        if (duration <= 0) throw new Error('Gio ket thuc phai sau gio bat dau!');

        const goldenRules = await trx('CourtPrices').where({ court_id });
        const total_price = calculatePriceForTimeRange(court.price_per_hour, goldenRules, start_time, end_time);

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

// FE-03.3 Dat dinh ky
const createRecurringBooking = async (data) => {
    const { user_id, username, court_id, start_date, end_date, weekdays, start_time, end_time } = data;
    const normalizedWeekdays = normalizeRecurringWeekdays(weekdays);
    const recurringDates = generateRecurringDates(start_date, end_date, normalizedWeekdays);
    validateBookingWindow({ court_id, booking_date: recurringDates[0], start_time, end_time });
    const duration = parseTimeToHours(end_time) - parseTimeToHours(start_time);

    return await db.transaction(async (trx) => {
        const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
        if (!court) throw new Error('San khong kha dung hoac dang bao tri!');

        const goldenRules = await trx('CourtPrices').where({ court_id });
        const conflicts = [];
        const bookingPayloads = [];

        for (const bookingDate of recurringDates) {
            const overlapCheck = await checkTimeOverlap(trx, court_id, bookingDate, start_time, end_time);
            if (overlapCheck.isOverlap) {
                conflicts.push(buildConflictDetails({
                    booking_date: bookingDate,
                    start_time,
                    end_time,
                    overlapCheck
                }));
                continue;
            }

            const totalPrice = calculatePriceForTimeRange(court.price_per_hour, goldenRules, start_time, end_time);

            bookingPayloads.push({
                user_id,
                court_id,
                booking_date: bookingDate,
                start_time,
                end_time,
                total_price: totalPrice,
                status: 'Fully Paid'
            });
        }

        if (conflicts.length > 0) {
            const error = new Error('Khong the dat lich dinh ky vi co ngay bi trung lich hoac dang bao tri!');
            error.conflicts = conflicts;
            throw error;
        }

        const totalAmount = bookingPayloads.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
        const user = await trx('Users').where({ id: user_id }).first();

        if (!user) {
            throw new Error('Nguoi dung khong ton tai!');
        }

        if (Number(user.wallet_balance) < totalAmount) {
            const missingAmount = totalAmount - Number(user.wallet_balance);
            throw new Error(`So du vi khong du de dat lich dinh ky. Vui long nap them ${missingAmount} VND.`);
        }

        await trx('Users').where({ id: user_id }).decrement('wallet_balance', totalAmount);
        const createdBookings = await trx('Bookings').insert(bookingPayloads).returning('*');

        return {
            court_id,
            total_bookings: createdBookings.length,
            total_amount: Number(totalAmount.toFixed(2)),
            booking_dates: createdBookings.map((item) => item.booking_date),
            bookings: createdBookings
        };
    });
};

// 2. Lay lich su dat san
const getUserBookings = async (userId) => {
    const bookings = await db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .where('Bookings.user_id', userId)
        .select('Bookings.*', 'Courts.name as court_name')
        .orderBy('booking_date', 'desc');

    return bookings.map((booking) => {
        const historyStatus = getBookingHistoryStatus(booking);

        return {
            ...booking,
            display_status: historyStatus.code,
            display_status_label: historyStatus.label
        };
    });
};

const createWaitlistRegistration = async ({ user_id, court_id, booking_date, start_time, end_time }) => {
    validateBookingWindow({ court_id, booking_date, start_time, end_time });

    return await db.transaction(async (trx) => {
        const court = await trx('Courts').where({ id: court_id, status: 'Active' }).first();
        if (!court) {
            throw new Error('San khong kha dung hoac dang bao tri!');
        }

        const overlapCheck = await checkTimeOverlap(trx, court_id, booking_date, start_time, end_time);
        if (!overlapCheck.isOverlap) {
            throw new Error('Khung gio nay van con trong. Ban co the dat san truc tiep, khong can vao danh sach cho!');
        }

        const existingWaitlist = await trx('BookingWaitlists')
            .where({
                user_id,
                court_id,
                booking_date
            })
            .whereIn('status', ['Waiting', 'Notified'])
            .andWhere(function() {
                this.where('start_time', '<', end_time)
                    .andWhere('end_time', '>', start_time);
            })
            .first();

        if (existingWaitlist) {
            throw new Error('Ban da co mot dang ky cho cho khung gio nay roi!');
        }

        const [waitlistItem] = await trx('BookingWaitlists').insert({
            user_id,
            court_id,
            booking_date,
            start_time,
            end_time,
            status: 'Waiting'
        }).returning('*');

        return waitlistItem;
    });
};

const getUserWaitlist = async (userId) => {
    return await db('BookingWaitlists')
        .join('Courts', 'BookingWaitlists.court_id', 'Courts.id')
        .where('BookingWaitlists.user_id', userId)
        .select(
            'BookingWaitlists.*',
            'Courts.name as court_name',
            'Courts.type as court_type'
        )
        .orderBy([{ column: 'BookingWaitlists.booking_date', order: 'desc' }, { column: 'BookingWaitlists.start_time', order: 'desc' }]);
};

const getUserNotifications = async (userId) => {
    return await db('Notifications')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');
};

const rescheduleBooking = async (bookingId, userId, data) => {
    const { booking_date, start_time, end_time, court_id } = data;

    return await db.transaction(async (trx) => {
        const booking = await trx('Bookings').where({ id: bookingId, user_id: userId }).first();

        if (!booking) {
            throw new Error('Khong tim thay don dat san hoac ban khong co quyen doi lich!');
        }

        if (booking.status === 'Cancelled') {
            throw new Error('Don nay da bi huy, khong the doi lich!');
        }

        if (booking.status === 'Active') {
            throw new Error('Suat dat dang choi, khong the doi lich!');
        }

        const currentStartDateTime = getBookingStartDateTime(booking);
        if (currentStartDateTime <= new Date()) {
            throw new Error('Suat dat da den gio hoac qua gio, khong the doi lich!');
        }

        const targetCourtId = court_id || booking.court_id;
        const targetBookingDate = booking_date || booking.booking_date;
        const targetStartTime = start_time || booking.start_time;
        const targetEndTime = end_time || booking.end_time;

        validateBookingWindow({
            court_id: targetCourtId,
            booking_date: targetBookingDate,
            start_time: targetStartTime,
            end_time: targetEndTime
        });

        const sameSlot = Number(targetCourtId) === Number(booking.court_id)
            && targetBookingDate === booking.booking_date
            && targetStartTime === booking.start_time
            && targetEndTime === booking.end_time;

        if (sameSlot) {
            throw new Error('Khung gio moi giong voi lich hien tai, khong can doi lich!');
        }

        const court = await trx('Courts').where({ id: targetCourtId, status: 'Active' }).first();
        if (!court) {
            throw new Error('San moi khong kha dung hoac dang bao tri!');
        }

        const overlapCheck = await checkTimeOverlap(
            trx,
            targetCourtId,
            targetBookingDate,
            targetStartTime,
            targetEndTime
        );

        if (overlapCheck.isOverlap) {
            throw new Error(overlapCheck.message);
        }

        const goldenRules = await trx('CourtPrices').where({ court_id: targetCourtId });
        const recalculatedPrice = calculatePriceForTimeRange(
            court.price_per_hour,
            goldenRules,
            targetStartTime,
            targetEndTime
        );

        const currentPaidAmount = Number(booking.total_price || 0);
        const additionalCharge = Number(Math.max(recalculatedPrice - currentPaidAmount, 0).toFixed(2));

        if (additionalCharge > 0) {
            const user = await trx('Users').where({ id: userId }).first();

            if (!user) {
                throw new Error('Nguoi dung khong ton tai!');
            }

            if (Number(user.wallet_balance) < additionalCharge) {
                throw new Error(`Vi khong du tien doi lich! Can thu them ${additionalCharge} VND.`);
            }

            await trx('Users').where({ id: userId }).decrement('wallet_balance', additionalCharge);
            await trx('transactions').insert({
                user_id: userId,
                transfer_amount: additionalCharge,
                status: 'success',
                gateway_transaction_id: `RESCHEDULE_${bookingId}_${Date.now()}`,
                booking_id: bookingId
            });
        }

        const [updatedBooking] = await trx('Bookings')
            .where({ id: bookingId })
            .update({
                court_id: targetCourtId,
                booking_date: targetBookingDate,
                start_time: targetStartTime,
                end_time: targetEndTime,
                total_price: additionalCharge > 0 ? recalculatedPrice : currentPaidAmount,
                updated_at: trx.fn.now()
            })
            .returning('*');

        const releasedSlot = {
            court_id: booking.court_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time
        };

        const notifiedWaitlistCount = await notifyWaitlistUsers(trx, releasedSlot);

        return {
            booking_id: updatedBooking.id,
            old_schedule: releasedSlot,
            new_schedule: {
                court_id: updatedBooking.court_id,
                booking_date: updatedBooking.booking_date,
                start_time: updatedBooking.start_time,
                end_time: updatedBooking.end_time
            },
            old_total_price: currentPaidAmount,
            recalculated_price: recalculatedPrice,
            additional_charge: additionalCharge,
            notifiedWaitlistCount,
            message: additionalCharge > 0
                ? `Doi lich thanh cong! Da thu them ${additionalCharge} VND do khung gio moi co gia cao hon.`
                : 'Doi lich thanh cong!'
        };
    });
};

// 3. Huy lich dat san
const previewCancellationPolicy = async (bookingId, userId) => {
    const booking = await db('Bookings').where({ id: bookingId, user_id: userId }).first();

    if (!booking) throw new Error('Khong tim thay don dat san hoac ban khong co quyen huy!');
    if (booking.status === 'Cancelled') throw new Error('Don nay da duoc huy tu truoc roi!');

    const refundInfo = getCancellationRefundInfo(booking);

    return {
        booking_id: booking.id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_price: Number(booking.total_price || 0),
        ...refundInfo
    };
};

const cancelBooking = async (bookingId, userId) => {
    return await db.transaction(async (trx) => {
        const booking = await trx('Bookings').where({ id: bookingId, user_id: userId }).first();

        if (!booking) throw new Error('Khong tim thay don dat san hoac ban khong co quyen huy!');
        if (booking.status === 'Cancelled') throw new Error('Don nay da duoc huy tu truoc roi!');
        const refundInfo = getCancellationRefundInfo(booking);
        const refundAmount = refundInfo.refundAmount;

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

        const notifiedWaitlistCount = await notifyWaitlistUsers(trx, booking);

        return {
            message: `Da hoan ${refundInfo.refundRatioLabel} (${refundAmount.toLocaleString('vi-VN')} VND) vao vi.`,
            refundAmount,
            refundRatio: refundInfo.refundRatioLabel,
            hoursUntilBooking: refundInfo.hoursUntilBooking,
            policyMatched: refundInfo.policyMatched,
            notifiedWaitlistCount
        };
    });
};

// 4. Kiem tra san trong
const checkAvailability = async (date, time) => {
    const booked = await db('Bookings')
        .where({ booking_date: date, start_time: time })
        .whereNot('status', 'Cancelled')
        .pluck('court_id');

    const maintenanceCourtIds = await db('CourtMaintenances')
        .where({ maintenance_date: date })
        .whereIn('status', ['Scheduled', 'In Progress'])
        .andWhere(function() {
            this.where('start_time', '<=', time)
                .andWhere('end_time', '>', time);
        })
        .pluck('court_id');

    return await db('Courts')
        .where({ status: 'Active' })
        .whereNotIn('id', booked)
        .whereNotIn('id', maintenanceCourtIds);
};

// 5. Cap nhat trang thai tu dong
const updateCompletedBookings = async () => {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0];

        const updatedRows = await db('Bookings')
            .where('status', 'Fully Paid')
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
        message: 'Thanh toán đã thành công! Đã Chốt đơn.',
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

const formatDateOnly = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseTimeToHours = (timeStr) => {
    const [hours, minutes = 0, seconds = 0] = timeStr.split(':').map(Number);
    return hours + (minutes / 60) + (seconds / 3600);
};

const resolveBookingIdFromQr = ({ booking_id, qr_code }) => {
    if (booking_id) {
        return Number(booking_id);
    }

    if (!qr_code || typeof qr_code !== 'string') {
        throw new Error('QR code khong hop le!');
    }

    const matchedId = qr_code.match(/\d+/);
    if (!matchedId) {
        throw new Error('Khong the doc Booking ID tu QR code!');
    }

    return Number(matchedId[0]);
};

// FE-03.1 Live Calendar
const getLiveCalendar = async ({ start_date, court_id }) => {
    const startDate = new Date(`${start_date}T00:00:00.000Z`);

    if (Number.isNaN(startDate.getTime())) {
        throw new Error('start_date khong hop le. Vui long dung dinh dang YYYY-MM-DD!');
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const current = new Date(startDate);
        current.setUTCDate(startDate.getUTCDate() + i);
        weekDates.push(formatDateOnly(current));
    }

    let courtsQuery = db('Courts')
        .select('id', 'name', 'type', 'status', 'price_per_hour')
        .orderBy('id', 'asc');

    if (court_id) {
        courtsQuery = courtsQuery.where({ id: court_id });
    }

    const courts = await courtsQuery;
    if (courts.length === 0) {
        throw new Error('Không tìm thấy sân phù hợp để hiển thị live calendar!');
    }

    let bookingsQuery = db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .select(
            'Bookings.id',
            'Bookings.court_id',
            'Bookings.booking_date',
            'Bookings.start_time',
            'Bookings.end_time',
            'Bookings.status',
            'Bookings.total_price',
            'Courts.name as court_name',
            'Courts.type as court_type'
        )
        .whereBetween('Bookings.booking_date', [formatDateOnly(startDate), formatDateOnly(endDate)])
        .whereIn('Bookings.status', ['Pending', 'Partially Paid', 'Fully Paid', 'Active'])
        .orderBy([{ column: 'Bookings.booking_date', order: 'asc' }, { column: 'Bookings.start_time', order: 'asc' }]);

    if (court_id) {
        bookingsQuery = bookingsQuery.where('Bookings.court_id', court_id);
    }

    const bookings = await bookingsQuery;

    const calendarByCourt = courts.map((court) => {
        const days = weekDates.map((date) => {
            const dayBookings = bookings
                .filter((booking) => Number(booking.court_id) === Number(court.id) && booking.booking_date === date)
                .map((booking) => {
                    const bookedHours = parseTimeToHours(booking.end_time) - parseTimeToHours(booking.start_time);

                    return {
                        booking_id: booking.id,
                        start_time: booking.start_time,
                        end_time: booking.end_time,
                        status: booking.status,
                        total_price: Number(booking.total_price || 0),
                        booked_hours: Number(bookedHours.toFixed(2))
                    };
                });

            const bookedHours = dayBookings.reduce((sum, item) => sum + item.booked_hours, 0);

            return {
                date,
                booking_count: dayBookings.length,
                booked_hours: Number(bookedHours.toFixed(2)),
                coverage_percent: Number(((bookedHours / 24) * 100).toFixed(2)),
                bookings: dayBookings
            };
        });

        const weeklyBookedHours = days.reduce((sum, day) => sum + day.booked_hours, 0);
        const weeklyBookingCount = days.reduce((sum, day) => sum + day.booking_count, 0);

        return {
            court_id: court.id,
            court_name: court.name,
            court_type: court.type,
            court_status: court.status,
            week_summary: {
                booking_count: weeklyBookingCount,
                booked_hours: Number(weeklyBookedHours.toFixed(2)),
                coverage_percent: Number(((weeklyBookedHours / (24 * 7)) * 100).toFixed(2))
            },
            days
        };
    });

    return {
        start_date: formatDateOnly(startDate),
        end_date: formatDateOnly(endDate),
        total_courts: courts.length,
        total_bookings: bookings.length,
        calendar: calendarByCourt
    };
};
// Hàm thanh toán 
const checkInBooking = async ({ booking_id, qr_code }) => {
    const bookingId = resolveBookingIdFromQr({ booking_id, qr_code });

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
        throw new Error('Booking ID khong hop le!');
    }

    const booking = await db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .select(
            'Bookings.*',
            'Courts.name as court_name',
            'Courts.type as court_type'
        )
        .where('Bookings.id', bookingId)
        .first();

    if (!booking) {
        throw new Error('Không tìm thấy thông tin đặt sân để check-in!');
    }

    if (booking.status === 'Cancelled') {
        throw new Error('Booking này đã bị hủy, không thể check-in!');
    }

    if (booking.status === 'Active') {
        throw new Error('Booking này đã được check in!');
    }

    if (!['Pending', 'Partially Paid', 'Fully Paid'].includes(booking.status)) {
        throw new Error(`Khong the check-in voi trang thai hien tai: ${booking.status}`);
    }

    const [updatedBooking] = await db('Bookings')
        .where({ id: bookingId })
        .update({
            status: 'Active',
            updated_at: db.fn.now()
        })
        .returning('*');

    return {
        booking_id: updatedBooking.id,
        court_id: updatedBooking.court_id,
        court_name: booking.court_name,
        court_type: booking.court_type,
        booking_date: updatedBooking.booking_date,
        start_time: updatedBooking.start_time,
        end_time: updatedBooking.end_time,
        booking_status: updatedBooking.status,
        court_state: 'In-use'
    };
};
const extendBooking = async (bookingId, new_end_time) => {
    return await db.transaction(async (trx) => {
        const booking = await trx('Bookings').where({ id: bookingId }).first();

        if (!booking) {
            throw new Error('Khong tim thay suat dat nay!');
        }

        if (!['Fully Paid', 'Partially Paid', 'Active'].includes(booking.status)) {
            throw new Error('Chi co the gia han cho suat dat da thanh toan hoac dang choi!');
        }

        validateBookingWindow({
            court_id: booking.court_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: new_end_time
        });

        if (parseTimeToHours(new_end_time) <= parseTimeToHours(booking.end_time)) {
            throw new Error('Gio gia han phai lon hon gio ket thuc hien tai!');
        }

        const overlapCheck = await checkTimeOverlap(
            trx,
            booking.court_id,
            booking.booking_date,
            booking.end_time,
            new_end_time
        );

        if (overlapCheck.isOverlap) {
            throw new Error(overlapCheck.message);
        }

        const court = await trx('Courts').where({ id: booking.court_id }).first();
        const goldenRules = await trx('CourtPrices').where({ court_id: booking.court_id });
        const extraCost = calculatePriceForTimeRange(
            court.price_per_hour,
            goldenRules,
            booking.end_time,
            new_end_time
        );
        const user = await trx('Users').where({ id: booking.user_id }).first();

        if (!user) {
            throw new Error('Nguoi dung khong ton tai!');
        }

        if (Number(user.wallet_balance) < extraCost) {
            throw new Error(`Vi khong du tien gia han! Can thu them ${extraCost} VND.`);
        }

        await trx('Users').where({ id: booking.user_id }).decrement('wallet_balance', extraCost);

        const [updatedBooking] = await trx('Bookings')
            .where({ id: bookingId })
            .update({
                end_time: new_end_time,
                total_price: Number(booking.total_price || 0) + extraCost,
                updated_at: trx.fn.now()
            })
            .returning('*');

        const [supplementalInvoice] = await trx('transactions')
            .insert({
                user_id: booking.user_id,
                transfer_amount: extraCost,
                status: 'success',
                gateway_transaction_id: `EXTEND_${bookingId}_${Date.now()}`
            })
            .returning('*');

        return {
            updatedBooking,
            extraCost,
            supplementalInvoice: {
                invoice_code: supplementalInvoice.gateway_transaction_id,
                amount: Number(extraCost),
                booking_id: booking.id,
                previous_end_time: booking.end_time,
                new_end_time
            },
            message: `Gia han thanh cong! Da tao hoa don bo sung ${extraCost} VND.`
        };
    });
};
module.exports = {
    createBooking,
    createRecurringBooking,
    checkBookingOverlap,
    createWaitlistRegistration,
    getUserBookings,
    getUserWaitlist,
    getUserNotifications,
    rescheduleBooking,
    previewCancellationPolicy,
    cancelBooking,
    checkAvailability,
    updateCompletedBookings,
    checkoutBooking,
    payAtCounter,
    getShiftRevenue,
    getFailedTransactions,
    getLiveCalendar,
    checkInBooking,
    extendBooking
};
