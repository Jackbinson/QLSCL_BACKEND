const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const createMaintenance = async (maintenanceData) => {
    const { court_id, maintenance_date, start_time, end_time, reason } = maintenanceData;

    const court = await db('Courts').where({ id: court_id }).first();
    if (!court) {
        throw new Error('Khong tim thay san can bao tri!');
    }

    if (start_time >= end_time) {
        throw new Error('Gio ket thuc bao tri phai sau gio bat dau!');
    }

    const overlappingMaintenance = await db('CourtMaintenances')
        .where({ court_id, maintenance_date })
        .whereIn('status', ['Scheduled', 'In Progress'])
        .andWhere(function() {
            this.where('start_time', '<', end_time)
                .andWhere('end_time', '>', start_time);
        })
        .first();

    if (overlappingMaintenance) {
        throw new Error('San nay da co lich bao tri trung khung gio da chon!');
    }

    const overlappingBooking = await db('Bookings')
        .where({ court_id, booking_date: maintenance_date })
        .whereIn('status', ['Pending', 'Partially Paid', 'Fully Paid', 'Active'])
        .andWhere(function() {
            this.where('start_time', '<', end_time)
                .andWhere('end_time', '>', start_time);
        })
        .first();

    if (overlappingBooking) {
        throw new Error('Khong the tao lich bao tri vi san da co lich dat trung khung gio!');
    }

    const [newMaintenance] = await db('CourtMaintenances').insert({
        court_id,
        maintenance_date,
        start_time,
        end_time,
        reason,
        status: 'Scheduled'
    }).returning('*');

    return newMaintenance;
};

const getMaintenancesByCourt = async (courtId) => {
    return await db('CourtMaintenances')
        .where({ court_id: courtId })
        .orderBy([{ column: 'maintenance_date', order: 'desc' }, { column: 'start_time', order: 'asc' }]);
};

module.exports = {
    createMaintenance,
    getMaintenancesByCourt
};
