exports.up = async function (knex) {
  await knex.schema.createTable('Logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().nullable()
      .references('id').inTable('Users').onDelete('SET NULL');
    table.string('action').notNullable();
    table.text('content').notNullable();
    table.string('ip_address').nullable();
    table.timestamps(true, true);

    table.index(['user_id']);
    table.index(['action']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('Logs');
};
