const courtService = require('../services/courts.s');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Cập nhật ảnh sân
exports.updateCourtImage = async (req, res) => {
    try {
        const courtId = req.params.id;
        if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn ảnh!' });
        const uploadDir = path.join(__dirname, '../../public/uploads/courts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `court-${courtId}-${Date.now()}.webp`;
        const filePath = path.join(uploadDir, fileName);
        await sharp(req.file.buffer)
            .resize(800, 600, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(filePath);

        const imageUrl = `/uploads/courts/${fileName}`;
        await db('courts').where('id', courtId).update({ image_url: imageUrl });

        res.json({
            success: true,
            message: 'Tải ảnh thực tế và tối ưu thành công!',
            data: { image_url: imageUrl }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi xử lý ảnh!' });
    }
};

// Lấy danh sách sân
exports.getCourts = async (req, res) => {
    try {
        const courts = await courtService.getAllCourts();
        res.status(200).json({ success: true, data: courts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Thêm sân mới
exports.createCourt = async (req, res) => {
    try {
        const newCourt = await courtService.addCourt(req.body);
        res.status(201).json({
            success: true,
            message: 'Thêm sân thành công!',
            data: newCourt
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};