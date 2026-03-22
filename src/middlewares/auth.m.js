// File: src/middlewares/auth.m.js
const jwt = require('jsonwebtoken');
const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

// Nhớ dùng chung cái Chìa khóa bí mật ở file .env nhé
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Truy cập bị từ chối! Bạn chưa đăng nhập (Không tìm thấy Token).' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = decoded; 
    
    next(); 
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: "Bạn không có quyền truy cập tính năng này!" 
            });
        }
        next(); 
    };
};

const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Ban can dang nhap de tiep tuc!' });
    }

    if (req.user.role === 'Admin') {
      return next();
    }

    try {
      const permission = await db('UserPermissions')
        .where({
          user_id: req.user.user_id,
          permission_key: requiredPermission
        })
        .first();

      if (!permission) {
        return res.status(403).json({
          success: false,
          message: 'Ban khong co quyen thuc hien thao tac nay!'
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Loi khi kiem tra quyen truy cap!'
      });
    }
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
  authorizePermission
};
