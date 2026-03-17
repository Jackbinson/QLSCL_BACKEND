/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Kiểm tra xem bảng đã tồn tại chưa
  const exists = await knex.schema.hasTable('transactions');
  
  // 2. Nếu CHƯA CÓ thì mới tạo (Tránh lỗi relation already exists)
  if (!exists) {
    return knex.schema.createTable('transactions', function(table) {
      table.increments('id').primary();
      table.string('gateway_transaction_id', 255).notNullable();
      table.string('gateway', 255);
      table.decimal('transfer_amount', 12, 2).notNullable();
      table.string('transfer_content', 255);
      table.string('reference_code', 255);
      table.integer('user_id');
      table.timestamp('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    });
  } else {
    console.log('Bảng transactions đã tồn tại, tự động bỏ qua bước tạo mới!');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('transactions');
};