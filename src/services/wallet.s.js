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
module.exports = { topUpMock };