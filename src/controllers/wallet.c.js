const walletService = require('../services/wallet.s');
// Nếu bạn có file logger thì nhớ require vào nhé: const logger = require('../utils/logger');

// 1. Hàm tạo mã QR (Đã nâng cấp dùng chuẩn SePay & Tài khoản VA)
const generateQR  = async (req, res) => {
    try {
        // Cẩn thận: Đảm bảo payload JWT của bạn lưu là id hay user_id nhé
        const user_id = req.user.id || req.user.user_id; 
        const { amount } = req.query; 

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '[Lỗi QR] Số tiền tạo mã QR phải lớn hơn 0!'
            });
        }

        // Cấu hình tài khoản ảo (VA) từ SePay
        const ACCOUNT_NO = '9624780OL0'; 
        const BANK_ID = 'BIDV';
        
        // Cú pháp nạp (Ví dụ: NAP 1). Càng ngắn gọn SePay càng dễ đọc
        const addInfo = `NAP ${user_id}`; 
        
        // Dùng API tạo QR của SePay 
        const qrUrl = `https://qr.sepay.vn/img?acc=${ACCOUNT_NO}&bank=${BANK_ID}&amount=${amount}&des=${encodeURIComponent(addInfo)}`;
        
        return res.status(200).json({
            success: true, 
            message: 'Tạo mã QR thành công',
            data: {
                qr_url : qrUrl,
                instruction: `Hãy dùng app ngân hàng quét mã này. Nội dung bắt buộc: ${addInfo}`
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Hàm nạp tiền giả lập (Dành cho Admin hoặc lúc Test)
const topUp = async (req, res) => {
    try {
        const user_id = req.user.id || req.user.user_id; 
        const { amount } = req.body;     

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '[Lỗi Nạp Tiền] Vui lòng nhập số tiền hợp lệ (lớn hơn 0) vào Body JSON!'
            });
        }

        const result = await walletService.topUpMock(user_id, amount);
        
        return res.status(200).json({
            success: true,
            message: 'Nạp tiền giả lập thành công!',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. THÊM MỚI: Hàm "Lễ tân" đón thông báo chuyển khoản thực tế từ SePay
const handleSePayWebhook = async (req, res) => {
    console.log("🔔 [WEBHOOK] Nhận tín hiệu từ SePay:", req.body);

    try {
        // Giao việc bóc tách dữ liệu và cộng tiền cho Service
        await walletService.processSePayWebhook(req.body);

        // Bắt buộc trả về 200 OK để SePay biết mình đã nhận tin
        return res.status(200).json({ success: true, message: 'Webhook received successfully' });
    } catch (error) {
        console.error("❌ [WEBHOOK ERROR]:", error.message);
        // Chỉ trả 500 nếu sập DB, còn sai cú pháp vẫn phải trả 200
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

module.exports = {
    generateQR,
    topUp,
    handleSePayWebhook
};