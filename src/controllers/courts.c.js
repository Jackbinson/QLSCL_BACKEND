const courtService = require('../serivces/courts.s');
const getCourts = async (req,res) => {
    try {
        const courts = await courtService.getAllCourts();
        res.status(200).json({
            success: true,
            data: courts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const createCourt = async (req, res) => {
    try {
        const newCourt = await courtService.addCourt(req.body);
        res.status(201).json({
            success: true, message: 'Thêm sân thành cồng!', data: newCourt
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = {
    getCourts,
    createCourt
};