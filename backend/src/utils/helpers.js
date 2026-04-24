// ============================================
// PAGINATION HELPER
// ============================================
const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(10000, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

// ============================================
// SUCCESS RESPONSE
// ============================================
const successResponse = (data, message = 'Muvaffaqiyatli') => ({
  success: true,
  message,
  data,
});

// ============================================
// FILTER BUILDER
// ============================================
const buildFilters = (query, allowedFields) => {
  const where = {};

  for (const [key, config] of Object.entries(allowedFields)) {
    const value = query[key];
    if (value === undefined || value === '') continue;

    switch (config.type) {
      case 'exact':
        where[config.field || key] = value;
        break;
      case 'contains':
        where[config.field || key] = { contains: value, mode: 'insensitive' };
        break;
      case 'enum':
        where[config.field || key] = value;
        break;
      case 'gte':
        where[config.field || key] = { ...(where[config.field || key] || {}), gte: parseFloat(value) };
        break;
      case 'lte':
        where[config.field || key] = { ...(where[config.field || key] || {}), lte: parseFloat(value) };
        break;
      case 'boolean':
        where[config.field || key] = value === 'true';
        break;
    }
  }

  return where;
};

module.exports = { paginate, paginatedResponse, successResponse, buildFilters };
