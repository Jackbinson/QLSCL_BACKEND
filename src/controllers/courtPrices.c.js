const courtPriceService = require('../services/courtPrices.s');

const getPriceRules = async (req, res) => {
    try {
        const courtId = req.params.id;
        const rules = await courtPriceService.getPriceRulesByCourt(courtId);

        res.status(200).json({
            success: true,
            data: rules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Loi server khi lay du lieu gio vang!'
        });
    }
};

const addPriceRule = async (req, res) => {
    try {
        const courtId = req.params.id;
        const { start_time, end_time, price } = req.body;

        if (!start_time || !end_time || !price) {
            return res.status(400).json({
                success: false,
                message: 'Vui long nhap day du gio bat dau, ket thuc va muc gia!'
            });
        }

        const newRule = await courtPriceService.addPriceRule({
            court_id: courtId,
            start_time,
            end_time,
            price
        });

        res.status(201).json({
            success: true,
            message: 'Thiet lap gio vang thanh cong!',
            data: newRule
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Loi server khi them gio vang!'
        });
    }
};

module.exports = {
    getPriceRules,
    addPriceRule
};
