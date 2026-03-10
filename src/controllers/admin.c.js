const { defaults } = require('pg');
const adminService = require('../services/admin.s');
const logger = require('../utils/logger');

const getDashboardStats = async (req,res) => {
    try {
        const [totalRevenue, topCourts] = await Promise.all([
            adminService.getTotalRevenue(),
            adminService.getTopCourts()
        ]);
    return res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu thống kê thành công',
        data: {
            overview: {
                total_revenue: parseInt(totalRevenue),
                currency: 'VND'
            },
        top_courts: topCourts
        }
    });
    }
    catch (error) {
        logger.error(`Lỗi api thống kê Admin:', ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tải dữ liệu thống kê hệ thống'
        });
    }
};
module.exports = {
  getDashboardStats
};