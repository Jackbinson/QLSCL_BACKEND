const express = require('express');
const multer = require('multer');
const courtController = require('../controllers/courts.c');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.m');
const courtPriceController = require('../controllers/courtPrices.c');
const maintenanceController = require('../controllers/courtMaintenances.c');

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

// FE-02.4: Gia theo khung gio
router.post('/:id/prices', verifyToken, authorizeRoles(['Admin']), courtPriceController.addPriceRule);
router.get('/:id/prices', courtPriceController.getPriceRules);

// FE-02.6: Lich bao tri
router.post('/:id/maintenances', verifyToken, authorizeRoles(['Admin']), maintenanceController.addMaintenance);
router.get('/:id/maintenances', maintenanceController.getMaintenances);
// FE-02.7: Tim kiem nang cao 
router.get('/search', courtController.searchAvailableCourts);
module.exports = router;
