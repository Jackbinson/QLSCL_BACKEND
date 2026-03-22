exports.up = async function (knex) {
  await knex.schema.createTable('UserPermissions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('Users').onDelete('CASCADE');
    table.string('permission_key').notNullable();
    table.timestamps(true, true);

    table.unique(['user_id', 'permission_key']);
    table.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('UserPermissions');
};
