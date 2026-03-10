const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.c');

// Nhập Trạm gác và các Bộ luật vào
const { validate, registerSchema, loginSchema } = require('../middlewares/validation.m');

// Chèn hàm validate(...) vào giữa đường dẫn và Controller
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;