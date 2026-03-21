const maintenanceService = require('../services/courtMaintenances.s');

const addMaintenance = async (req, res) => {
    try {
        const court_id = req.params.id;
        const { maintenance_date, start_time, end_time, reason } = req.body;

        if (!maintenance_date || !start_time || !end_time || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Vui long nhap du ngay, gio va ly do bao tri!'
            });
        }

        const newMaintenance = await maintenanceService.createMaintenance({
            court_id,
            maintenance_date,
            start_time,
            end_time,
            reason
        });

        res.status(201).json({
            success: true,
            message: 'Da khoa san de bao tri thanh cong!',
            data: newMaintenance
        });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.toLowerCase().includes('khong tim thay') ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

const getMaintenances = async (req, res) => {
    try {
        const maintenances = await maintenanceService.getMaintenancesByCourt(req.params.id);
        res.status(200).json({
            success: true,
            data: maintenances
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Loi server khi lay lich bao tri!' });
    }
};

module.exports = {
    addMaintenance,
    getMaintenances
};
