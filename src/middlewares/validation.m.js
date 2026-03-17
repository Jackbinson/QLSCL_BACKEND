const Joi = require('joi');

// 1. Bộ luật cho API Đăng ký (Khớp 100% với file Service của bạn)
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(30).required().messages({
        'string.empty': 'Tên đăng nhập không được để trống!',
        'string.min': 'Tên đăng nhập phải có ít nhất 3 ký tự!',
        'any.required': 'Vui lòng cung cấp tên đăng nhập!'
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email không được để trống!',
        'string.email': 'Email không đúng định dạng (VD: abc@gmail.com)!',
        'any.required': 'Vui lòng cung cấp email!'
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Mật khẩu không được để trống!',
        'string.min': 'Mật khẩu phải có ít nhất 6 ký tự!',
        'any.required': 'Vui lòng cung cấp mật khẩu!'
    })
});

// 2. Bộ luật cho API Đăng nhập
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email không được để trống!',
        'string.email': 'Email không đúng định dạng!',
        'any.required': 'Vui lòng nhập email!'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Mật khẩu không được để trống!',
        'any.required': 'Vui lòng nhập mật khẩu!'
    })
});

const validate = (schema) => {
    return (req, res, next) => { 
        const { error } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            return res.status(400).json({ 
                success: false, 
                message: errorMessage 
            });
        }
        
        next();
    };
};

module.exports = { 
    validate, 
    registerSchema, 
    loginSchema 
};