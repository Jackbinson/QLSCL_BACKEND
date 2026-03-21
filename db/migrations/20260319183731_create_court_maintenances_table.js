/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('CourtMaintenances', (table) => {
    table.increments('id').primary();
    table.integer('court_id').unsigned().notNullable()
      .references('id').inTable('Courts').onDelete('CASCADE');
    table.date('maintenance_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.string('reason').notNullable();
    table.decimal('cost', 12, 2).defaultTo(0);
    table.enum('status', ['Scheduled', 'In Progress', 'Completed', 'Cancelled']).defaultTo('Scheduled');
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('CourtMaintenances');
};
