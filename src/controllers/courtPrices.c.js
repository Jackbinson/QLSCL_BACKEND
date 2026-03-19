const courtPriceService = require ('../services/courtPrices.s');

// Lấy danh sách giờ vàng của 1 sân 
const getPriceRules = async (req,res) => {
    try {
        const courtId = req.params.id;
        const rules = await courtPriceService.getPriceRulesByCourt(courtId);
        res.json({
            success: true,
            data: rules
        });
    } catch (error) { 
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu giờ vàng!'
        })
    };
  
    };
  const addPriceRule = async (req, res) => {
        try {
            const courtId = req.params.id;
            const {start_time, end_time, price} = req.body;
            if (!start_time || !end_time || !price) { 
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ giờ bắt đầu, kết thúc và mức giá!'
                });
            }
            const newRule = await courtPriceService.addPriceRule({
                court_id: courtId,
                start_time,
                end_time,
                price
            })
            res.status(201).json({
                success: true,
                message: 'Thiết lập giờ vàng thành công!',
                data: newRule
            });
        } catch (error) { 
            console.error(error)
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi thêm giờ vàng!'
            });

        }
    };
module.exports = {
    getPriceRules,
    addPriceRule
};