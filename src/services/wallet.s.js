<<<<<<< Updated upstream
const knexConfig = require('../../knexfile'); // Lưu ý đường dẫn này tùy thuộc vào vị trí file của bạn
=======
const knexConfig = require('../../knexfile'); 
>>>>>>> Stashed changes
const db = require('knex')(knexConfig.development || knexConfig);

const topUpMock = async (userId, amount) => {
    if (amount < 0 ) {
        throw new Error("Số tiền nạp phải lớn hơn 0!");
    } 
<<<<<<< Updated upstream
    const [updatedUser] = await db('Users')
    .where({id: userId}) 
    .increment('wallet_balance', amount)
    .returning(['id','username','wallet_balance']);
=======
    
    const [updatedUser] = await db('Users') 
        .where({ id: userId }) 
        .increment('wallet_balance', amount)
        .returning(['id', 'username', 'wallet_balance']);
        
>>>>>>> Stashed changes
    if (!updatedUser) { 
        throw new Error('Người dùng không tồn tại!');
    }
    return updatedUser;
}
const processSePayWebhook = async (data) => {
    // Lấy thêm gateway và referenceCode từ data của SePay
    const { id, transferAmount, transferContent, gateway, referenceCode } = data;

    const existingTrans = await Transaction.findOne({ where: { transaction_id: id } });
    if (existingTrans) {
        console.log(` [WEBHOOK] Giao dịch ${id} đã được xử lý trước đó. Bỏ qua.`);
        return;
    }

    const userId = extractUserId(transferContent); 
<<<<<<< Updated upstream

    await Transaction.create({
        transaction_id: id,
        user_id: userId,
        amount: transferAmount,
        content: transferContent,
        status: 'success'
=======
    if (!userId) {
        console.log(`❌ [LỖI] Nội dung chuyển khoản sai cú pháp: "${transferContent}"`);
        return { success: true, message: 'Invalid transfer content syntax' }; 
    }

    // BƯỚC 3: Thực thi Database Transaction để cộng tiền và lưu lịch sử
    return await db.transaction(async (trx) => {
        await trx('transactions').insert({
            gateway_transaction_id: id,
            transfer_amount: transferAmount,      
            transfer_content: transferContent,    
            user_id: userId,                     
            gateway: gateway || 'Unknown',       
            reference_code: referenceCode || null 
        });

        // Cộng tiền vào ví 
        await trx('Users') 
            .where({ id: userId })
            .increment('wallet_balance', transferAmount);

        console.log(`✅ [SUCCESS] Đã cộng ${transferAmount} cho User ${userId}. ID: ${id}`);
        return { success: true };
>>>>>>> Stashed changes
    });

    await User.increment({ wallet_balance: transferAmount }, { where: { id: userId } });
    
    console.log(`[WEBHOOK] Đã nạp thành công ${transferAmount} cho User ${userId}`);
};
module.exports = { topUpMock, processSePayWebhook };