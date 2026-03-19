/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('transactions', function(table) {
    // Thêm cột booking_id (nullable vì nếu khách nạp tiền vào ví thì không cần gắn với đơn đặt sân nào)
    table.integer('booking_id').nullable(); 
    
    // Thêm cột status (mặc định là 'success' để những giao dịch cũ không bị lỗi)
    table.string('status').defaultTo('success'); 
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('transactions', function(table) {
    // Xóa 2 cột này nếu chạy lệnh rollback
    table.dropColumn('booking_id');
    table.dropColumn('status');
  });
};