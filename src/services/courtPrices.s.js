const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const addPriceRule = async (priceData) => {
    const [newRule] = await db('CourtPrices').insert({
        court_id: priceData.court_id,
        start_time: priceData.start_time,
        end_time: priceData.end_time,
        price: priceData.price
    }).returning('*');
    return newRule;
}

// Lấy danh sách giờ vàng của một sân cụ thể 
const getPriceRulesByCourt = async (courtId) => {
    return await db('CourtPrices')
        .where({ court_id: courtId })
        .orderBy('start_time', 'asc');
};
// Xóa một khung giờ vàng 
const deletePriceRule = async (ruleId) => {
    return await db('CourtPrices').where({id: ruleId}).del();
};
module.exports = {
    addPriceRule,
    getPriceRulesByCourt,
    deletePriceRule
};