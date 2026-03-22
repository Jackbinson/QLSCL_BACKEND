const checkTimeOverlap = async (trx, court_id, date, start_time, end_time) => {
    const overlappingBooking = await trx('Bookings')
        .where({ court_id, booking_date: date })
        .whereIn('status', ['Pending', 'Partially Paid', 'Fully Paid', 'Active'])
        .andWhere(function() {
            this.where('start_time', '<', end_time)
                .andWhere('end_time', '>', start_time);
        })
        .first();

    if (overlappingBooking) {
        return {
            isOverlap: true,
            conflict_type: 'booking',
            message: 'Khung gio nay da co khach dat. Vui long chon gio khac!',
            booking: overlappingBooking
        };
    }

    const overlappingMaintenance = await trx('CourtMaintenances')
        .where({ court_id, maintenance_date: date })
        .whereIn('status', ['Scheduled', 'In Progress'])
        .andWhere(function() {
            this.where('start_time', '<', end_time)
                .andWhere('end_time', '>', start_time);
        })
        .first();

    if (overlappingMaintenance) {
        return {
            isOverlap: true,
            conflict_type: 'maintenance',
            message: `San dang co lich bao tri (${overlappingMaintenance.reason}). Vui long chon gio khac!`,
            maintenance: overlappingMaintenance
        };
    }

    return { isOverlap: false };
};

module.exports = {
    checkTimeOverlap
};
