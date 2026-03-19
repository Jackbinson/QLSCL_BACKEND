const knexConfig = require('../../knexfile');
const db = require('knex')(knexConfig.development || knexConfig);

const ALLOWED_COURT_TYPES = ['Single', 'Double', 'Vip'];

const normalizeCourtType = (type) => {
    if (!type || typeof type !== 'string') {
        throw new Error('Vui long chon loai san hop le!');
    }

    const normalizedType = type.trim().toLowerCase();
    const mappedType = ALLOWED_COURT_TYPES.find((item) => item.toLowerCase() === normalizedType);

    if (!mappedType) {
        throw new Error('Loai san khong hop le. He thong chi ho tro: Single, Double, Vip.');
    }

    return mappedType;
};

// 1. Lay danh sach san
const getAllCourts = async (filters = {}) => {
    const query = db('Courts').select('*').orderBy('id', 'desc');

    if (filters.type) {
        query.where('type', normalizeCourtType(filters.type));
    }

    if (filters.status) {
        query.where('status', filters.status);
    }

    return await query;
};

// 2. Them san moi
const addCourt = async (courtData) => {
    if (!courtData.name || courtData.name.trim() === '') {
        throw new Error('Vui long nhap ten san!');
    }

    if (!courtData.price_per_hour || Number(courtData.price_per_hour) <= 0) {
        throw new Error('Gia thue san phai hop le va lon hon 0!');
    }

    const courtType = normalizeCourtType(courtData.type);

    const existingCourt = await db('Courts').where('name', courtData.name).first();
    if (existingCourt) {
        throw new Error('Ten san nay da ton tai, vui long chon ten khac!');
    }

    const [newCourt] = await db('Courts').insert({
        name: courtData.name.trim(),
        type: courtType,
        price_per_hour: courtData.price_per_hour,
        status: 'Active',
        description: courtData.description || ''
    }).returning('*');

    return newCourt;
};

// 3. Lay san theo ID
const getCourtById = async (id) => {
    return await db('Courts')
        .leftJoin('CourtImages', 'Courts.id', 'CourtImages.court_id')
        .select('Courts.*', 'CourtImages.image_url')
        .where('Courts.id', id)
        .first();
};

// 4. Cap nhat trang thai
const updateCourtStatus = async (id, status) => {
    return await db('Courts').where({ id }).update({ status });
};

// 5. Cap nhat anh
const updateImageUrl = async (courtId, imageUrl) => {
    const existingImage = await db('CourtImages').where({ court_id: courtId }).first();

    if (existingImage) {
        return await db('CourtImages')
            .where({ court_id: courtId })
            .update({ image_url: imageUrl, updated_at: db.fn.now() });
    }

    return await db('CourtImages').insert({
        court_id: courtId,
        image_url: imageUrl
    });
};

// 6. Cap nhat loai san
const updateCourtType = async (courtId, type) => {
    const normalizedType = normalizeCourtType(type);
    const existingCourt = await db('Courts').where({ id: courtId }).first();

    if (!existingCourt) {
        throw new Error('Khong tim thay san can cap nhat!');
    }

    await db('Courts').where({ id: courtId }).update({ type: normalizedType });

    return await db('Courts').where({ id: courtId }).first();
};

module.exports = {
    getAllCourts,
    addCourt,
    getCourtById,
    updateCourtStatus,
    updateImageUrl,
    updateCourtType
};
