const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { authorize, inspectorReadOnly } = require('../middleware/rbac');
const { validate, createDistrictSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, inspectorReadOnly);

// GET /api/districts
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { regionId, search } = req.query;

    const where = {};
    if (regionId) where.regionId = regionId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [districts, total] = await Promise.all([
      prisma.district.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: {
          region: { select: { id: true, name: true, code: true } },
          _count: { select: { substations: true, transformers: true } },
        },
      }),
      prisma.district.count({ where }),
    ]);

    res.json(paginatedResponse(districts, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// GET /api/districts/by-region/:regionId — Dropdown uchun
router.get('/by-region/:regionId', async (req, res, next) => {
  try {
    const districts = await prisma.district.findMany({
      where: { regionId: req.params.regionId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    res.json(successResponse(districts));
  } catch (error) {
    next(error);
  }
});

// POST /api/districts — ADMIN only
router.post('/', authorize('ADMIN'), validate(createDistrictSchema), async (req, res, next) => {
  try {
    const district = await prisma.district.create({
      data: req.body,
      include: { region: { select: { name: true } } },
    });
    res.status(201).json(successResponse(district, 'Tuman yaratildi'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/districts/:id
router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const district = await prisma.district.update({ where: { id: req.params.id }, data: req.body });
    res.json(successResponse(district, 'Tuman yangilandi'));
  } catch (error) { next(error); }
});

// DELETE /api/districts/:id
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.district.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Tuman o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
