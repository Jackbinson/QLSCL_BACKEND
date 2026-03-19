const express = require('express');
const multer = require('multer');
const courtController = require('../controllers/courts.c');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.m');
const courtPriceController = require('../controllers/courtPrices.c');
const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// FE-02.7 & FE-02.8: Lay danh sach san cho Khach/Admin
router.get('/', courtController.getCourts);

// FE-02.1: Admin them san moi
router.post('/', verifyToken, authorizeRoles(['Admin']), courtController.createCourt);

// FE-02.2: Admin cap nhat anh thuc te cho san
router.patch('/:id/image', verifyToken, authorizeRoles(['Admin']), upload.single('image'), courtController.updateCourtImage);

// FE-02.3: Admin phan loai san
router.patch('/:id/type', verifyToken, authorizeRoles(['Admin']), courtController.updateCourtType);
// FE-02.4: Api thiết lập giờ vàng (Yêu cầu Token và quyền Admin)
router.post('/:id/prices', verifyToken, authorizeRoles(['Admin']), courtPriceController.addPriceRule);
// API xem danh sách giờ vàng của sân (PUBLIC)
router.get('/:id/prices', courtPriceController.getPriceRules);
module.exports = router;
