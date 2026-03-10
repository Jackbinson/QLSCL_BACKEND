const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

exports.getTotalRevenue = async () => {
    // Tính tổng tiền từ các đơn đã thanh toán (Paid hoặc Completed)
    const result = await db('Bookings')
        .whereIn('status', ['Paid', 'Completed', 'completed'])
        .sum('total_price as total')
        .first();
    return result.total || 0;
};

exports.getTopCourts = async () => {
    return await db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .select('Courts.name')
        .count('Bookings.id as booking_count')
        .groupBy('Courts.name')
        .orderBy('booking_count', 'desc')
        .limit(5);
};