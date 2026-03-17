/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.string('gateway_transaction_id').notNullable().unique(); 
    table.string('gateway'); 
    table.decimal('transfer_amount', 12, 2).notNullable(); 
    table.string('transfer_content'); 
    table.string('reference_code'); 
    
    table.integer('user_id').unsigned().references('id').inTable('Users').onDelete('CASCADE'); 
    
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('transactions');
};