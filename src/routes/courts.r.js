const express = require('express');
const router = express.Router();
const courtController = require('../controllers/courts.c');
const { verifyToken, isAdmin } = require('../middlewares/auth.m');

router.get('/',courtController.getCourts);
router.post('/', verifyToken, isAdmin, courtController.createCourt);

module.exports = router;