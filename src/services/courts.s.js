const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const getAllCourts = async () => {
    return await db('Courts').select('*').orderBy('id', 'asc');
};
const addCourt = async (courtData) => {
    const [newCourt] = await db('Courts').insert({
        name: courtData.name,
        price_per_hour: courtData.price_per_hour,
        status: 'Active',
        description: courtData.description
    }).returning('*');
    return newCourt;
};
const updateCourtStatus = async(id,status) => {
    return await db('Courts').where({id}).update({status});
};
module.exports = {
    getAllCourts,
    addCourt,
    updateCourtStatus
};