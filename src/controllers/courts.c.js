const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const courtService = require('../services/courts.s');

// 1. Lay danh sach san
const getCourts = async (req, res) => {
    try {
        const courts = await courtService.getAllCourts(req.query);
        res.status(200).json({ success: true, data: courts });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Them san moi
const createCourt = async (req, res) => {
    try {
        const newCourt = await courtService.addCourt(req.body);
        res.status(201).json({
            success: true,
            message: 'Them san thanh cong!',
            data: newCourt
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 3. Cap nhat anh san
const updateCourtImage = async (req, res) => {
    try {
        const courtId = req.params.id;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui long chon anh!' });
        }

        const currentCourt = await courtService.getCourtById(courtId);

        if (!currentCourt) {
            return res.status(404).json({ success: false, message: 'Khong tim thay san!' });
        }

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

        const newImageUrl = `/uploads/courts/${fileName}`;

        await courtService.updateImageUrl(courtId, newImageUrl);

        if (currentCourt.image_url) {
            const oldFilePath = path.join(__dirname, '../../public', currentCourt.image_url);

            try {
                await fs.promises.unlink(oldFilePath);
                console.log('Da don dep file cu:', currentCourt.image_url);
            } catch (err) {
                console.log('Khong tim thay file cu de xoa:', err.message);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Cap nhat anh san thanh cong!',
            data: { image_url: newImageUrl }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Loi khi xu ly anh!' });
    }
};

// 4. Cap nhat phan loai san
const updateCourtType = async (req, res) => {
    try {
        const updatedCourt = await courtService.updateCourtType(req.params.id, req.body.type);

        res.status(200).json({
            success: true,
            message: 'Cap nhat loai san thanh cong!',
            data: updatedCourt
        });
    } catch (error) {
        const statusCode = error.message.toLowerCase().includes('khong tim thay') ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCourts,
    createCourt,
    updateCourtImage,
    updateCourtType
};
