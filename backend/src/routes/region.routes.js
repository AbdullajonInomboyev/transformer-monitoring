const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { authorize, inspectorReadOnly } = require('../middleware/rbac');
const { validate, createRegionSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, inspectorReadOnly);

// GET /api/regions — Barcha hududlar
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [regions, total] = await Promise.all([
      prisma.region.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { districts: true, substations: true, transformers: true, users: true } },
        },
      }),
      prisma.region.count({ where }),
    ]);

    res.json(paginatedResponse(regions, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/all — Dropdown uchun (pagination siz)
router.get('/all', async (req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    res.json(successResponse(regions));
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const region = await prisma.region.findUnique({
      where: { id: req.params.id },
      include: {
        districts: { orderBy: { name: 'asc' } },
        _count: { select: { substations: true, transformers: true, users: true } },
      },
    });
    if (!region) throw new AppError('Hudud topilmadi', 404);
    res.json(successResponse(region));
  } catch (error) {
    next(error);
  }
});

// POST /api/regions — Faqat ADMIN
router.post('/', authorize('ADMIN'), validate(createRegionSchema), async (req, res, next) => {
  try {
    const region = await prisma.region.create({ data: req.body });
    res.status(201).json(successResponse(region, 'Hudud yaratildi'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/regions/:id — Faqat ADMIN
router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const region = await prisma.region.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(region, 'Hudud yangilandi'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/regions/:id — Faqat ADMIN
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.region.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Hudud o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
