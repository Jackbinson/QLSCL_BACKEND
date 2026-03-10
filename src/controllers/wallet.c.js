const walletService = require('../services/wallet.s');

// 1. Hàm tạo mã QR (Dùng GET, nhận data từ URL)
const generateQR  = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { amount } = req.query; // Lấy từ ?amount=...

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '[Lỗi QR] Số tiền tạo mã QR phải lớn hơn 0!'
            });
        }

        const BANK_BIN = '970418';
        const ACCOUNT_NO = '886197726';
        const ACCOUNT_NAME = 'DUONG XUAN HUNG';
        
        const addInfo = `NAPTIEN ${user_id}`;
        
        const qrUrl = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
        
        return res.status(200).json({
            success: true, 
            message: 'Tạo mã QR thành công',
            data: {
                qr_url : qrUrl,
                instruction: 'Hãy dùng app ngân hàng để quét mã này và thanh toán'
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 2. Hàm nạp tiền vào Database (Dùng POST, nhận data từ Body JSON)
const topUp = async (req, res) => {
    try {
        const user_id = req.user.user_id; 
        const { amount } = req.body;     

        // Chặn lỗi nếu amount bị trống hoặc số âm
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '[Lỗi Nạp Tiền] Vui lòng nhập số tiền hợp lệ (lớn hơn 0) vào Body JSON!'
            });
        }

        // Đẩy xuống Service xử lý cộng tiền
        const result = await walletService.topUpMock(user_id, amount);
        
        return res.status(200).json({
            success: true,
            message: 'Nạp tiền giả lập thành công!',
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    generateQR,
    topUp
};