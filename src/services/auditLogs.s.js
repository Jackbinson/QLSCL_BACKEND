const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const getRequestIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return String(forwardedFor).split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || null;
};

const createAuditLog = async (req, { action, content, user_id }) => {
    return await db('Logs').insert({
        user_id: user_id || req.user?.user_id || null,
        action,
        content,
        ip_address: getRequestIp(req)
    });
};

const getSystemLogs = async () => {
    return await db('Logs')
        .leftJoin('Users', 'Logs.user_id', 'Users.id')
        .select(
            'Logs.*',
            'Users.username',
            'Users.email',
            'Users.role'
        )
        .orderBy('Logs.created_at', 'desc');
};

module.exports = {
    createAuditLog,
    getSystemLogs
};
