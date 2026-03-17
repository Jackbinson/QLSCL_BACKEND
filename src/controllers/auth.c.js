const authService = require('../services/auth.s');

const register = async (req, res) => {
  try {
    // Đưa log vào trong này mới chạy được
    console.log("Dữ liệu Register nhận được: ", req.body);

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ Tên đăng nhập, Email và Mật khẩu!' });
    }

    const newUser = await authService.registerUser({ username, email, password });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: newUser
    });
  } catch (error) {
    // Nếu vẫn lỗi "not iterable", lỗi nằm ở hàm registerUser trong auth.s.js (thiếu .returning)
    return res.status(409).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    console.log("Dữ liệu Login nhận được: ", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email và Mật khẩu!' });
    }

    const result = await authService.loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};

module.exports = { 
    register,
    login
};