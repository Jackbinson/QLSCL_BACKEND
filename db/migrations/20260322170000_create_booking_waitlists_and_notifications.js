exports.up = async function (knex) {
  await knex.schema.createTable('BookingWaitlists', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('Users').onDelete('CASCADE');
    table.integer('court_id').unsigned().notNullable()
      .references('id').inTable('Courts').onDelete('CASCADE');
    table.date('booking_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.enum('status', ['Waiting', 'Notified', 'Expired', 'Cancelled']).defaultTo('Waiting');
    table.timestamp('notified_at').nullable();
    table.timestamps(true, true);

    table.index(['court_id', 'booking_date']);
    table.index(['user_id', 'status']);
  });

  await knex.schema.createTable('Notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('Users').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.json('meta').nullable();
    table.timestamps(true, true);

    table.index(['user_id', 'is_read']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('Notifications');
  await knex.schema.dropTableIfExists('BookingWaitlists');
};
