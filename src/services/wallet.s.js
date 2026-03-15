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
    const { id, transferAmount, transferContent } = data;

    const existingTrans = await Transaction.findOne({ where: { transaction_id: id } });
    if (existingTrans) {
        console.log(` [WEBHOOK] Giao dịch ${id} đã được xử lý trước đó. Bỏ qua.`);
        return;
    }

    const userId = extractUserId(transferContent); 

    await Transaction.create({
        transaction_id: id,
        user_id: userId,
        amount: transferAmount,
        content: transferContent,
        status: 'success'
    });

    await User.increment({ wallet_balance: transferAmount }, { where: { id: userId } });
    
    console.log(`[WEBHOOK] Đã nạp thành công ${transferAmount} cho User ${userId}`);
};
module.exports = { topUpMock, processSePayWebhook };