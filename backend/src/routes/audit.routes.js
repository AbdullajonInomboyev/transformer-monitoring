const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate, authorize('ADMIN'));

// GET /api/audit-logs
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { userId, action, entityType, from, to } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json(paginatedResponse(logs, total, page, limit));
  } catch (error) { next(error); }
});

module.exports = router;
