const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter } = require('../middleware/rbac');
const { validate, createSubstationSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, inspectorReadOnly, regionFilter);

// GET /api/substations
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { regionId, search } = req.query;

    const where = { ...req.regionFilter };
    if (regionId && req.user.role === 'ADMIN') where.regionId = regionId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [substations, total] = await Promise.all([
      prisma.substation.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: {
          region: { select: { id: true, name: true } },
          district: { select: { id: true, name: true } },
          _count: { select: { transformers: true } },
        },
      }),
      prisma.substation.count({ where }),
    ]);

    res.json(paginatedResponse(substations, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// GET /api/substations/by-region/:regionId
router.get('/by-region/:regionId', async (req, res, next) => {
  try {
    const substations = await prisma.substation.findMany({
      where: { regionId: req.params.regionId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    res.json(successResponse(substations));
  } catch (error) { next(error); }
});

// GET /api/substations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const substation = await prisma.substation.findUnique({
      where: { id: req.params.id },
      include: {
        region: true, district: true,
        transformers: { select: { id: true, inventoryNumber: true, status: true, capacityKva: true } },
      },
    });
    if (!substation) throw new AppError('Podstansiya topilmadi', 404);
    res.json(successResponse(substation));
  } catch (error) { next(error); }
});

// POST /api/substations
router.post('/', validate(createSubstationSchema), async (req, res, next) => {
  try {
    if (req.user.role === 'EMPLOYEE' && req.body.regionId !== req.user.regionId) {
      throw new AppError('Faqat o\'z hududingizga podstansiya qo\'shishingiz mumkin', 403);
    }
    const substation = await prisma.substation.create({
      data: {
        ...req.body,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
        commissionedDate: req.body.commissionedDate ? new Date(req.body.commissionedDate) : null,
      },
    });
    res.status(201).json(successResponse(substation, 'Podstansiya yaratildi'));
  } catch (error) { next(error); }
});

// PUT /api/substations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.substation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Podstansiya topilmadi', 404);
    if (req.user.role === 'EMPLOYEE' && existing.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud podstansiyasini tahrirlash mumkin emas', 403);
    }
    const data = { ...req.body };
    if (data.latitude !== undefined) data.latitude = data.latitude ? parseFloat(data.latitude) : null;
    if (data.longitude !== undefined) data.longitude = data.longitude ? parseFloat(data.longitude) : null;
    if (data.commissionedDate) data.commissionedDate = new Date(data.commissionedDate);

    const substation = await prisma.substation.update({ where: { id: req.params.id }, data });
    res.json(successResponse(substation, 'Podstansiya yangilandi'));
  } catch (error) { next(error); }
});

// DELETE /api/substations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.substation.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Podstansiya o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;