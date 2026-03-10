const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

exports.getTotalRevenue = async () => {
    const result = await db('Bookings')
    .sum('total price as total revenue')
    .whereIn('status',['Paid','Completed']);
return result[0].total_revenue || 0;
};
exports. getTopCourts = async () => {
     const topCourts = await db('Bookings')
     .join('Courts','Bookings.court_id', '=', 'Courts_id')
     .select('Courts.name as court_name', 'Bookings.court_id')
     .sum('Bookings.total_price as court_revenue')
     .whereIn('Bookings.status',['Paid','Completed'])
     .groupBy('Courts.name', 'Bookings.court_id')
     .orderBy('total_bookings', 'desc')
     .limit(3);
    return topCourts;
};
