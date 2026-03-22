const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const ACL_PERMISSIONS = ['VIEW_REPORTS', 'EDIT_PRICES', 'CHECK_IN'];

const getTotalRevenue = async () => {
    const result = await db('Bookings')
        .whereIn('status', ['Fully Paid', 'Active'])
        .sum('total_price as total')
        .first();

    return result.total || 0;
};

const getTopCourts = async () => {
    return await db('Bookings')
        .join('Courts', 'Bookings.court_id', 'Courts.id')
        .select('Courts.name')
        .count('Bookings.id as booking_count')
        .groupBy('Courts.name')
        .orderBy('booking_count', 'desc')
        .limit(5);
};

const getAccountsForAcl = async () => {
    return await db('Users')
        .select('id', 'username', 'email', 'role', 'created_at')
        .orderBy('id', 'asc');
};

const getUserAcl = async (userId) => {
    const user = await db('Users')
        .select('id', 'username', 'email', 'role')
        .where({ id: userId })
        .first();

    if (!user) {
        throw new Error('Khong tim thay tai khoan can phan quyen!');
    }

    const permissions = await db('UserPermissions')
        .where({ user_id: userId })
        .orderBy('permission_key', 'asc');

    return {
        user,
        available_permissions: ACL_PERMISSIONS,
        assigned_permissions: permissions.map((item) => item.permission_key)
    };
};

const updateUserAcl = async (userId, permissionKeys) => {
    const uniquePermissionKeys = [...new Set(permissionKeys || [])];
    const invalidPermissions = uniquePermissionKeys.filter((key) => !ACL_PERMISSIONS.includes(key));

    if (invalidPermissions.length > 0) {
        throw new Error(`Quyen khong hop le: ${invalidPermissions.join(', ')}`);
    }

    return await db.transaction(async (trx) => {
        const user = await trx('Users')
            .select('id', 'username', 'email', 'role')
            .where({ id: userId })
            .first();

        if (!user) {
            throw new Error('Khong tim thay tai khoan can cap nhat quyen!');
        }

        await trx('UserPermissions').where({ user_id: userId }).del();

        if (uniquePermissionKeys.length > 0) {
            await trx('UserPermissions').insert(
                uniquePermissionKeys.map((permissionKey) => ({
                    user_id: userId,
                    permission_key: permissionKey
                }))
            );
        }

        return {
            user,
            assigned_permissions: uniquePermissionKeys
        };
    });
};

module.exports = {
    ACL_PERMISSIONS,
    getTotalRevenue,
    getTopCourts,
    getAccountsForAcl,
    getUserAcl,
    updateUserAcl
};
