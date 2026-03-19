const cron = require('node-cron');
const bookingService = require('../services/bookings.s');
const logger = require('../utils/logger');

const startBookingCronJob = () => { 
    cron.schedule('*/15 * * * *', async () => { 
        logger.info('[CRON JOB] Bắt đầu kiểm tra và cập nhật trạng thái sân...');
        
        try { 
            const updatedCount = await bookingService.updateCompletedBookings();
            
            // ĐÃ SỬA LOGIC: Sắp xếp lại đúng thông báo cho từng trường hợp
            if (updatedCount > 0) {
                logger.info(`[CRON JOB] Đã tự động chuyển ${updatedCount} sân thành 'Completed'.`);
            } else { 
                logger.info('[CRON JOB] Không có sân nào cần cập nhật lúc này.');
            } 
            
        } catch (error) {
            // ĐÃ SỬA: In ra lỗi thực sự để dễ debug nếu Database có vấn đề
            logger.error(` [CRON JOB] Lỗi hệ thống khi cập nhật sân: ${error.message}`);
        }
    });
};

module.exports = startBookingCronJob;