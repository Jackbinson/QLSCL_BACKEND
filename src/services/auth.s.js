const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const knexConfig = require('../../knexfile');
const dbConfig = knexConfig.development || knexConfig;
const db = require('knex')(dbConfig);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// 1. Hàm Đăng ký (Đã sửa lỗi Not Iterable cho Postgres)
const registerUser = async (userData) => {
  const { username, email, password } = userData;

  const existingUser = await db('Users').where('email', email).orWhere('username', username).first();
  if (existingUser) {
    throw new Error('Email hoặc Tên đăng nhập đã được sử dụng!');
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // SỬA LỖI: Thêm .returning('*') để Postgres trả về mảng, tránh lỗi "not iterable"
  const [newUser] = await db('Users').insert({
    username,
    email,
    password: hashedPassword,
    role: 'User',
    wallet_balance: 0
  }).returning('*'); // <--- CỰC KỲ QUAN TRỌNG

  return newUser;
};

// 2. Hàm Đăng nhập (Đã thêm username vào Token)
const loginUser = async (email, password) => {
  const user = await db('Users').where({ email }).first();
  
  if (!user) {
    throw new Error('Email không tồn tại trong hệ thống!');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Mật khẩu không chính xác!');
  }

  // CHIẾN THUẬT: Đưa username vào payload để Middleware bóc tách được tên
  const payload = {
    user_id: user.id,
    username: user.username, // <--- Con chíp mang tên người dùng nằm ở đây
    role: user.role,
    email: user.email
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      wallet_balance: user.wallet_balance
    }
  };
};

module.exports = {
  registerUser,
  loginUser
};