/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Thêm 'async' giúp hàm luôn trả về Promise
  // và dùng 'await' để đợi lệnh tạo bảng hoàn tất
  await knex.schema.createTable('CourtImages', (table) => {
    table.increments('id').primary();
    
    // Nối với bảng Courts của Jack
    table.integer('court_id').unsigned().notNullable()
         .references('id').inTable('Courts').onDelete('CASCADE');
         
    table.string('image_url').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  // Đừng quên hàm down cũng phải dùng async/await cho đồng bộ
  await knex.schema.dropTableIfExists('CourtImages');
};