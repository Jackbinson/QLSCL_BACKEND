exports.up = async function(knex) {
  const hasBookingId = await knex.schema.hasColumn('transactions', 'booking_id');
  const hasStatus = await knex.schema.hasColumn('transactions', 'status');
  const hasErrorDetails = await knex.schema.hasColumn('transactions', 'error_details');

  return knex.schema.alterTable('transactions', function(table) {
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
  return knex.schema.alterTable('transactions', function(table) {
  });
};