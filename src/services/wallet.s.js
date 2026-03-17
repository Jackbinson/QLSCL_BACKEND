const knexConfig = require('../../knexfile'); 
const db = require('knex')(knexConfig.development || knexConfig);

// 1. HÀM TÁCH ID TỪ NỘI DUNG CHUYỂN KHOẢN
const extractUserId = (content) => { 
    if (!content) return null;
    const match = content.match(/NAP\s*(\d+)/i);
    if (match && match[1]) {
        return parseInt(match[1]);
    }
    return null;
};

// 2. HÀM NẠP TIỀN GIẢ LẬP (Dùng chữ 'Users' viết hoa theo chuẩn Database)
const topUpMock = async (userId, amount) => {
    if (amount <= 0 ) {
        throw new Error("Số tiền nạp phải lớn hơn 0!");
    } 
    
    const [updatedUser] = await db('Users') 
        .where({ id: userId }) 
        .increment('wallet_balance', amount)
        .returning(['id', 'username', 'wallet_balance']);
        
    if (!updatedUser) { 
        throw new Error('Người dùng không tồn tại!');
    }
    return updatedUser;
}

// 3. HÀM XỬ LÝ WEBHOOK SEPAY THỰC TẾ
const processSePayWebhook = async (data) => {
    const { id, transferAmount, transferContent, gateway, referenceCode } = data;

    const existingTransaction = await db('transactions')
        .where({ gateway_transaction_id: id })
        .first();

    if (existingTransaction) {
        console.log(`⚠️ [IDEMPOTENCY] Giao dịch ${id} đã được xử lý. Bỏ qua.`);
        return { success: true, message: 'Already processed' };
    }

    // BƯỚC 2: Bóc tách User ID và kiểm tra lỗi cú pháp
    const userId = extractUserId(transferContent); 
    if (!userId) {
        console.log(`❌ [LỖI] Nội dung chuyển khoản sai cú pháp: "${transferContent}"`);
        return { success: true, message: 'Invalid transfer content syntax' }; 
    }

    // BƯỚC 3: Thực thi Database Transaction để cộng tiền và lưu lịch sử
    return await db.transaction(async (trx) => {
        // ĐÃ SỬA: Khớp tên cột với DB và dùng đúng biến userId
        await trx('transactions').insert({
            gateway_transaction_id: id,
            transfer_amount: transferAmount,      // Sửa lại cho khớp DB
            transfer_content: transferContent,    // Sửa lại cho khớp DB
            user_id: userId,                      // Fix lỗi ẩn: dùng userId đã bóc tách ở Bước 2
            gateway: gateway || 'Unknown',        // Lưu thêm ngân hàng
            reference_code: referenceCode || null // Lưu thêm mã tham chiếu
        });

        // Cộng tiền vào ví 
        await trx('Users') 
            .where({ id: userId })
            .increment('wallet_balance', transferAmount);

        console.log(`✅ [SUCCESS] Đã cộng ${transferAmount} cho User ${userId}. ID: ${id}`);
        return { success: true };
    });
};

module.exports = { topUpMock, processSePayWebhook };