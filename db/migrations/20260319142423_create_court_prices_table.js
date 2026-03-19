/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('CourtPrices', (table) => {
    table.increments('id').primary();
    table.integer('court_id').unsigned().notNullable()
      .references('id').inTable('Courts').onDelete('CASCADE');
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.decimal('price', 12, 2).notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('CourtPrices');
};
