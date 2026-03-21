const express = require('express');
const courtController = require('../controllers/courts.c');
const courtPriceController = require('../controllers/courtPrices.c');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.m');

const router = express.Router();

router.get('/', courtController.getCourts);
router.get('/search', courtController.searchAvailableCourts);
router.post('/', verifyToken, authorizeRoles(['Admin']), courtController.createCourt);

// FE-02.4: thiet lap gio vang cho tung san
router.post('/:id/prices', verifyToken, authorizeRoles(['Admin']), courtPriceController.addPriceRule);
router.get('/:id/prices', courtPriceController.getPriceRules);

module.exports = router;
