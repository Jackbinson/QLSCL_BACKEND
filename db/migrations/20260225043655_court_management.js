/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Bảng Users
  await knex.schema.createTable('Users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('username').notNullable().unique();
    table.string('password').notNullable();
    table.enum('role', ['User', 'Admin', 'Staff']).defaultTo('User');
    table.decimal('wallet_balance', 12, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // 2. Bảng Locations
  await knex.schema.createTable('Locations', (table) => { 
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('address').notNullable();
  });

  // 3. Bảng Courts (Đổi thành số nhiều)
  await knex.schema.createTable('Courts', (table) => { 
    table.increments('id').primary();
    table.string('name').notNullable();
    table.enum('type', ['Double', 'Vip', 'Single']).defaultTo('Double');
    table.integer('location_id').unsigned().references('id').inTable('Locations').onDelete('CASCADE'); 
    table.decimal('price_per_hour', 12, 2).notNullable();
    table.enum('status', ['Active', 'Maintenance']).defaultTo('Active');
  });

  // 4. Bảng Bookings (Đổi thành số nhiều)
  await knex.schema.createTable('Bookings', (table) => { 
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('Users');
    table.integer('court_id').unsigned().references('id').inTable('Courts'); 
    table.date('booking_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    // Bổ sung các trạng thái thực tế của luồng sân
    table.enum('status',['Pending', 'Partially Paid', 'Fully Paid', 'Active', 'Cancelled']).defaultTo('Pending');
    table.decimal('total_price', 12, 2).notNullable();
    table.timestamps(true, true);
    
    // Đã bỏ end_time để chặn trùng lịch tại một thời điểm bắt đầu cụ thể
    table.unique(['court_id', 'booking_date', 'start_time']);
  });
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.string('gateway_transaction_id').unique().notNullable(); // Mã ID từ SePay
    table.decimal('amount', 15, 2).notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('content');
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  // Thứ tự xóa từ bảng con (chứa khóa ngoại) đến bảng cha
  await knex.schema.dropTableIfExists('Bookings');
  await knex.schema.dropTableIfExists('Courts');
  await knex.schema.dropTableIfExists('Locations');
  await knex.schema.dropTableIfExists('Users');
  await knex.schema.dropTableIfExists('transactions');
};