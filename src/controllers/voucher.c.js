const knexConfig = require('../../knexfile'); 
const db = require('knex')(knexConfig.development || knexConfig);
const voucherService = require('../services/voucher.s');

const applyVoucher = async (req, res) => {
    try {
        const { code, totalAmount } = req.body;
        if (!code || !totalAmount) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });

        const result = await voucherService.checkVoucher(code, totalAmount);
        if (!result.isValid) return res.status(400).json({ success: false, message: result.message });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createTestVoucher = async (req, res) => {
    try {
        const { code, discount_percent, max_discount_amount, expiry_date } = req.body;

        await db('Vouchers').insert({
            code, discount_percent, max_discount_amount, expiry_date, is_active: true
        });

        return res.status(201).json({ success: true, message: `Đã tạo mã ${code} thành công!` });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { applyVoucher, createTestVoucher };