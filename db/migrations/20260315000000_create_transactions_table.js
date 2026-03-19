/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    
    // Cột này cực kỳ quan trọng để chặn SePay gọi Webhook 2 lần gây cộng tiền trùng
    table.string('gateway_transaction_id').notNullable().unique(); 
    table.string('gateway'); // Tên ngân hàng (VD: MBBank)
    table.decimal('transfer_amount', 12, 2).notNullable(); // Số tiền nạp
    table.string('transfer_content'); // Nội dung chuyển khoản (VD: NAP 1)
    table.string('reference_code'); // Mã tham chiếu của ngân hàng
    
    // Nối với bảng Users để biết ai là người nạp (Kiểm tra lại tên bảng Users của bạn nhé, có thể là 'users' hoặc 'Users')
    table.integer('user_id').unsigned().references('id').inTable('Users').onDelete('CASCADE'); 
    
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('transactions');
};