exports.up = async function(knex) {
  // 1. Kiểm tra xem các cột đã tồn tại chưa
  const hasBookingId = await knex.schema.hasColumn('transactions', 'booking_id');
  const hasStatus = await knex.schema.hasColumn('transactions', 'status');
  const hasErrorDetails = await knex.schema.hasColumn('transactions', 'error_details');

  return knex.schema.alterTable('transactions', function(table) {
    // Chỉ thêm booking_id nếu chưa có
    if (!hasBookingId) {
      table.integer('booking_id').unsigned().nullable();
      table.foreign('booking_id').references('id').inTable('bookings').onDelete('SET NULL');
    }
    if (!hasStatus) {
      table.string('status').defaultTo('success');
    }
    if (!hasErrorDetails) {
      table.text('error_details').nullable();
    }
  });
};

exports.down = function(knex) {
  // Để an toàn, hàm down mình để trống hoặc chỉ xóa cột đơn giản
  // tránh đụng vào foreign key gây lỗi rollback
  return knex.schema.alterTable('transactions', function(table) {
     // table.dropColumn(['booking_id', 'status', 'error_details']); 
  });
};