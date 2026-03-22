const adminService = require('../services/admin.s');
const auditLogService = require('../services/auditLogs.s');
const bookingService = require('../services/bookings.s');
const logger = require('../utils/logger');

const getDashboardStats = async (req, res) => {
    console.log("--------------------------------------------------");
    console.log("🚀 [DASHBOARD] Bắt đầu lấy dữ liệu thống kê...");

    try {
        // 1. Cập nhật trạng thái sân (Cron logic)
        console.log("⚙️ [STEP 1] Đang gọi updateCompletedBookings...");
        await bookingService.updateCompletedBookings();
        console.log("✅ [STEP 1] Cập nhật trạng thái sân hoàn tất.");

        // 2. Lấy dữ liệu từ Admin Service
        console.log("📊 [STEP 2] Đang truy vấn Doanh thu và Top sân (Promise.all)...");
        const [totalRevenueData, topCourts] = await Promise.all([
            adminService.getTotalRevenue(),
            adminService.getTopCourts()
        ]);

        // LOG DỮ LIỆU THÔ ĐỂ KIỂM TRA
        console.log("📦 [RAW DATA] Doanh thu:", totalRevenueData);
        console.log("📦 [RAW DATA] Top sân:", topCourts ? topCourts.length : 0, "sân");

        // Xử lý doanh thu (Phòng trường hợp Knex trả về object hoặc null)
        const revenue = totalRevenueData?.total || totalRevenueData?.sum || totalRevenueData || 0;
        const finalRevenue = parseInt(revenue) || 0;

        console.log(`💰 [FINAL] Doanh thu chốt: ${finalRevenue} VND`);

        return res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu thống kê thành công',
            data: {
                overview: {
                    total_revenue: finalRevenue,
                    currency: 'VND'
                },
                top_courts: topCourts
            }
        });

    } catch (error) {
        // LOG LỖI CHI TIẾT
        console.error("❌ [CRITICAL ERROR] Dashboard hỏng rồi Jack ơi!");
        console.error("👉 Chi tiết lỗi:", error.message);
        console.error("📍 Vị trí lỗi (Stack):", error.stack);

        logger.error(`Lỗi api thống kê Admin: ${error.message}`);
        
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tải dữ liệu thống kê hệ thống',
            error_debug: error.message // Trả về để Postman hiện thẳng lỗi cho bạn xem
        });
    }
};

const getAccountsForAcl = async (req, res) => {
    try {
        const accounts = await adminService.getAccountsForAcl();
        return res.status(200).json({
            success: true,
            data: accounts
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getUserAcl = async (req, res) => {
    try {
        const { userId } = req.params;
        const acl = await adminService.getUserAcl(userId);
        return res.status(200).json({
            success: true,
            data: acl
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

const updateUserAcl = async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: 'permissions phai la mot mang quyen!'
            });
        }

        const result = await adminService.updateUserAcl(userId, permissions);
        await auditLogService.createAuditLog(req, {
            action: 'UPDATE_USER_ACL',
            content: `Cap nhat quyen cho user ${userId}: ${permissions.join(', ')}`
        });
        return res.status(200).json({
            success: true,
            message: 'Cap nhat bang phan quyen thanh cong!',
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getSystemLogs = async (req, res) => {
    try {
        const logs = await auditLogService.getSystemLogs();
        return res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getAccountsForAcl,
    getUserAcl,
    updateUserAcl,
    getSystemLogs
};
