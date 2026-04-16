const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter } = require('../middleware/rbac');
const { validate, createAlertSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, inspectorReadOnly, regionFilter);

// GET /api/alerts
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { status, priority, transformerId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (transformerId) where.transformerId = transformerId;

    // Hudud filtri — transformator orqali
    if (req.regionFilter.regionId) {
      where.transformer = { regionId: req.regionFilter.regionId };
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transformer: {
            select: { id: true, inventoryNumber: true, model: true, capacityKva: true,
              region: { select: { name: true } }, substation: { select: { name: true } } },
          },
          resolvedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    res.json(paginatedResponse(alerts, total, page, limit));
  } catch (error) { next(error); }
});

// POST /api/alerts
router.post('/', validate(createAlertSchema), async (req, res, next) => {
  try {
    const alert = await prisma.alert.create({
      data: req.body,
      include: { transformer: { select: { inventoryNumber: true } } },
    });
    res.status(201).json(successResponse(alert, 'Ogohlantirish yaratildi'));
  } catch (error) { next(error); }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: req.user.id,
      },
    });
    res.json(successResponse(alert, 'Ogohlantirish hal qilindi'));
  } catch (error) { next(error); }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.alert.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Ogohlantirish o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
