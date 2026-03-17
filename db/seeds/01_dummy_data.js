const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // 1. Xóa toàn bộ dữ liệu cũ theo thứ tự (Con trước cha sau để tránh lỗi Foreign Key)
  await knex('Bookings').del();
  await knex('Courts').del();
  await knex('Locations').del();
  await knex('Users').del();

  // 2. MÃ HÓA MẬT KHẨU
  const saltRounds = 10; 
  const rawPassword = process.env.HASHED_PASSWORD || '123456'; 
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds); 

  // 3. Chèn dữ liệu Users 
  await knex('Users').insert([
    { id: 1, username: 'admin', email: 'admin@badminton.com', password: hashedPassword, role: 'Admin', wallet_balance: 0 },
    { id: 2, username: 'staff1', email: 'staff@badminton.com', password: hashedPassword, role: 'Staff', wallet_balance: 0 },
    { id: 3, username: 'khach1', email: 'khachhang1@gmail.com', password: hashedPassword, role: 'User', wallet_balance: 500000 },
    { id: 4, username: 'khach2', email: 'khachhang2@gmail.com', password: hashedPassword, role: 'User', wallet_balance: 0 }
  ]);

  // 4. Chèn dữ liệu Cơ sở (Locations)
  await knex('Locations').insert([
    { id: 1, name: 'Cơ sở Quận 1 - TT Thể Thao', address: '123 Lê Lợi, Q1, TP.HCM' },
    { id: 2, name: 'Cơ sở Quận 7 - Premium', address: '456 Nguyễn Văn Linh, Q7, TP.HCM' }
  ]);

  // 5. Chèn dữ liệu Sân cầu lông (Courts)
  await knex('Courts').insert([
    { id: 1, name: 'Sân 1 (Thường)', type: 'Double', location_id: 1, price_per_hour: 80000, status: 'Active' },
    { id: 2, name: 'Sân 2 (Thường)', type: 'Double', location_id: 1, price_per_hour: 80000, status: 'Active' },
    { id: 3, name: 'Sân 3 (VIP)', type: 'Vip', location_id: 1, price_per_hour: 120000, status: 'Active' },
    { id: 4, name: 'Sân Đơn Q7', type: 'Single', location_id: 2, price_per_hour: 60000, status: 'Maintenance' }
  ]);

  // Lệnh này bảo Postgres: "Hãy nhìn vào ID lớn nhất và đếm tiếp từ đó"
  await knex.raw(`SELECT setval(pg_get_serial_sequence('"Users"', 'id'), (SELECT MAX(id) FROM "Users"))`);
  await knex.raw(`SELECT setval(pg_get_serial_sequence('"Locations"', 'id'), (SELECT MAX(id) FROM "Locations"))`);
  await knex.raw(`SELECT setval(pg_get_serial_sequence('"Courts"', 'id'), (SELECT MAX(id) FROM "Courts"))`);
};