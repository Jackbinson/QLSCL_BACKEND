const knexConfig = require('../../knexfile'); // Lưu ý đường dẫn này tùy thuộc vào vị trí file của bạn
const db = require('knex')(knexConfig.development || knexConfig);

const topUpMock = async (userId, amount) => {
    if (amount < 0 ) {
        throw new Error("Số tiền nạp phải lớn hơn 0!");
    } 
    const [updatedUser] = await db('Users')
    .where({id: userId}) 
    .increment('wallet_balance', amount)
    .returning(['id','username','wallet_balance']);
    if (!updatedUser) { 
        throw new Error('Người dùng không tồn tại!');
    }
    return updatedUser;
}
const processSePayWebhook = async (data) => {
    const { id, transferAmount, transferContent, referenceCode } = data;
    const existingTransaction = await db('transactions')
        .where({ gateway_transaction_id: id })
        .first();

    if (existingTransaction) {
        console.log(`[IDEMPOTENCY] Giao dịch ${id} đã được xử lý. Bỏ qua cộng tiền.`);
        return { success: true, message: 'Already processed' };
    }
    const userId = extractUserId(transferContent); 
    return await db.transaction(async (trx) => {
        await trx('transactions').insert({
            gateway_transaction_id: id,
            amount: transferAmount,
            user_id: userId,
            content: transferContent
        });

        await trx('users')
            .where({ id: userId })
            .increment('wallet_balance', transferAmount);

        console.log(`[SUCCESS] Đã cộng ${transferAmount} cho User ${userId}. ID: ${id}`);
        return { success: true };
    });
};


module.exports = { topUpMock, processSePayWebhook };