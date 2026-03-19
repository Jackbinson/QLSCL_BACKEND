const knexConfig = require('../../knexfile'); 
const db = require('knex')(knexConfig.development || knexConfig);

const checkVoucher = async (code, totalAmount) => {
    const voucher = await db('vouchers').where({ code }).first();
    if (!voucher) return { isValid: false, message: 'Mã giảm giá không tồn tại!' };
    if (!voucher.is_active) return { isValid: false, message: 'Mã giảm giá đã bị vô hiệu hóa!' };
    
    const now = new Date();
    if (new Date(voucher.expiry_date) < now) return { isValid: false, message: 'Mã giảm giá đã hết hạn!' };

    let discountAmount = (totalAmount * voucher.discount_percent) / 100;

    // CHỖ NÀY LÀ NƠI HAY SINH RA LỖI NHẤT NẾU THIẾU CHỮ "voucher."
    if (discountAmount > voucher.max_discount_amount) {
        discountAmount = voucher.max_discount_amount;
    }

    return {
        isValid: true,
        message: 'Áp dụng mã giảm giá thành công!',
        discountAmount: discountAmount,
        finalPrice: totalAmount - discountAmount,
        voucherId: voucher.id
    };
};

module.exports = { checkVoucher };