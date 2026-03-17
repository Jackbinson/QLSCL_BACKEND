exports.up = function(knex) {
  return knex.schema.alterTable('transactions', function(table) {
    table.integer('booking_id').nullable(); 
    table.string('status').defaultTo('success');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('transactions', function(table) {
    table.dropColumn('booking_id');
    table.dropColumn('status');
  });
};