/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Chỉnh sửa bảng transactions để kết nối với Booking
  await knex.schema.alterTable('transactions', (table) => {
    // Thêm cột booking_id để biết giao dịch này trả cho đơn đặt sân nào
    // .unsigned() và .references() cực kỳ quan trọng để giữ toàn vẹn dữ liệu
    table.integer('booking_id').unsigned().references('id').inTable('Bookings').onDelete('SET NULL');
    
    // Thêm trạng thái giao dịch (mặc định là success)
    table.string('status').defaultTo('success');
  });

  await knex.schema.createTable('vouchers', (table) => {
  table.increments('id').primary();
  table.string('code').unique().notNullable();
  
  // Sửa tên cột cho khớp với lệnh Insert
  table.integer('discount_percent').notNullable(); 
  table.decimal('max_discount_amount', 12, 2).notNullable();
  
  table.timestamp('expiry_date').notNullable();
  table.boolean('is_active').defaultTo(true);
  
  table.integer('usage_limit').defaultTo(1);
  table.timestamps(true, true);
});
};

exports.down = async function(knex) {
  // Khi Rollback (hủy lệnh), phải xóa cột đã thêm và xóa bảng đã tạo
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('booking_id');
    table.dropColumn('status');
  });
  
  await knex.schema.dropTableIfExists('vouchers');
};