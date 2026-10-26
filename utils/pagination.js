// Pagination helpers. Every list endpoint returns at most `limit` items per
// page so phones on expensive data never download hundreds of records.
//
// Usage in a controller:
//   const { page, limit, skip } = getPagination(req.query);
//   const items = await Model.find(filter).skip(skip).limit(limit);
//   const total = await Model.countDocuments(filter);
//   res.json({ success: true, data: { items, pagination: paginationMeta(total, page, limit) } });

function getPagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function paginationMeta(total, page, limit) {
  const pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
}

module.exports = { getPagination, paginationMeta };
