const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const getAllCourts = async () => {
    return await db('Courts').select('*').orderBy('id', 'asc');
};

const addCourt = async (courtData) => {
    const [newCourt] = await db('Courts').insert({
        name: courtData.name,
        price_per_hour: courtData.price_per_hour,
        status: 'Active',
        description: courtData.description
    }).returning('*');

    return newCourt;
};

const updateCourtStatus = async (id, status) => {
    return await db('Courts').where({ id }).update({ status });
};

// FE-02.7: Tim kiem nang cao
const searchAvailableCourts = async (filters) => {
    const { date, start_time, end_time, type } = filters;

    const bookedCourts = await db('Bookings')
        .select('court_id')
        .where('booking_date', date)
        .whereIn('status', ['Pending', 'Partially Paid', 'Fully Paid', 'Active'])
        .andWhere(function () {
            this.where('start_time', '<', end_time)
                .andWhere('end_time', '>', start_time);
        });

    const maintenanceCourts = await db('CourtMaintenances')
        .select('court_id')
        .where('maintenance_date', date)
        .whereIn('status', ['Scheduled', 'In Progress'])
        .andWhere(function () {
            this.where('start_time', '<', end_time)
                .andWhere('end_time', '>', start_time);
        });

    const busyCourtIds = [
        ...bookedCourts.map((booking) => booking.court_id),
        ...maintenanceCourts.map((maintenance) => maintenance.court_id)
    ];
    const uniqueBusyIds = [...new Set(busyCourtIds)];

    const query = db('Courts')
        .leftJoin('CourtImages', 'Courts.id', 'CourtImages.court_id')
        .select('Courts.*', 'CourtImages.image_url')
        .where('Courts.status', 'Active');

    if (type) {
        query.where('Courts.type', type);
    }

    if (uniqueBusyIds.length > 0) {
        query.whereNotIn('Courts.id', uniqueBusyIds);
    }

    return await query;
};

module.exports = {
    getAllCourts,
    addCourt,
    updateCourtStatus,
    searchAvailableCourts
};
