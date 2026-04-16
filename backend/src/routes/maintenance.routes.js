const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter } = require('../middleware/rbac');
const { validate, createMaintenanceSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, inspectorReadOnly, regionFilter);

// GET /api/maintenance
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { status, transformerId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (transformerId) where.transformerId = transformerId;
    if (req.regionFilter.regionId) {
      where.transformer = { regionId: req.regionFilter.regionId };
    }

    const [records, total] = await Promise.all([
      prisma.maintenance.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transformer: { select: { id: true, inventoryNumber: true, model: true } },
          performedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.maintenance.count({ where }),
    ]);

    res.json(paginatedResponse(records, total, page, limit));
  } catch (error) { next(error); }
});

// POST /api/maintenance
router.post('/', validate(createMaintenanceSchema), async (req, res, next) => {
  try {
    const record = await prisma.maintenance.create({
      data: {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : null,
        performedById: req.user.id,
      },
    });
    res.status(201).json(successResponse(record, 'Texnik xizmat yozuvi yaratildi'));
  } catch (error) { next(error); }
});

// PUT /api/maintenance/:id
router.put('/:id', async (req, res, next) => {
  try {
    const record = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
        completedDate: req.body.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
    res.json(successResponse(record, 'Texnik xizmat yangilandi'));
  } catch (error) { next(error); }
});

// DELETE /api/maintenance/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.maintenance.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Yozuv o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
