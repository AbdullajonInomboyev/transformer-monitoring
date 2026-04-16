const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter } = require('../middleware/rbac');
const { validate, createTransformerSchema, updateTransformerSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse, buildFilters } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, inspectorReadOnly, regionFilter);

// ============================================
// GET /api/transformers — Ro'yxat (filtrlar bilan)
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search, regionId, districtId, substationId, status, minKva, maxKva } = req.query;

    const where = { ...req.regionFilter };

    if (search) {
      where.OR = [
        { inventoryNumber: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (regionId && req.user.role === 'ADMIN') where.regionId = regionId;
    if (districtId) where.districtId = districtId;
    if (substationId) where.substationId = substationId;
    if (status) where.status = status;
    if (minKva) where.capacityKva = { ...(where.capacityKva || {}), gte: parseInt(minKva) };
    if (maxKva) where.capacityKva = { ...(where.capacityKva || {}), lte: parseInt(maxKva) };

    const [transformers, total] = await Promise.all([
      prisma.transformer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          region: { select: { id: true, name: true, code: true } },
          district: { select: { id: true, name: true } },
          substation: { select: { id: true, name: true, code: true } },
          _count: { select: { alerts: true, maintenance: true } },
        },
      }),
      prisma.transformer.count({ where }),
    ]);

    res.json(paginatedResponse(transformers, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/transformers/map — Xarita uchun
// ============================================
router.get('/map', async (req, res, next) => {
  try {
    const where = { ...req.regionFilter };
    const { regionId, status } = req.query;
    
    if (regionId && req.user.role === 'ADMIN') where.regionId = regionId;
    if (status) where.status = status;

    const transformers = await prisma.transformer.findMany({
      where,
      select: {
        id: true,
        inventoryNumber: true,
        model: true,
        latitude: true,
        longitude: true,
        capacityKva: true,
        status: true,
        isOnline: true,
        healthScore: true,
        riskLevel: true,
        address: true,
        region: { select: { name: true } },
        substation: { select: { name: true } },
      },
    });

    res.json(successResponse(transformers));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/transformers/:id — Batafsil
// ============================================
router.get('/:id', async (req, res, next) => {
  try {
    const transformer = await prisma.transformer.findUnique({
      where: { id: req.params.id },
      include: {
        region: true,
        district: true,
        substation: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 5 },
        maintenance: { orderBy: { createdAt: 'desc' }, take: 5 },
        inspections: { orderBy: { createdAt: 'desc' }, take: 5 },
        incidents: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: {
          select: { alerts: true, maintenance: true, inspections: true, incidents: true, workOrders: true },
        },
      },
    });

    if (!transformer) throw new AppError('Transformator topilmadi', 404);

    // Hodim o'z hududinimi tekshirish
    if (req.user.role !== 'ADMIN' && transformer.regionId !== req.user.regionId) {
      throw new AppError('Bu transformatorni ko\'rish huquqi yo\'q', 403);
    }

    res.json(successResponse(transformer));
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/transformers — Yangi yaratish
// ============================================
router.post('/', validate(createTransformerSchema), async (req, res, next) => {
  try {
    // Hodim faqat o'z hududiga qo'sha oladi
    if (req.user.role === 'EMPLOYEE' && req.body.regionId !== req.user.regionId) {
      throw new AppError('Faqat o\'z hududingizga transformator qo\'shishingiz mumkin', 403);
    }

    const transformer = await prisma.transformer.create({
      data: {
        ...req.body,
        installationDate: req.body.installationDate ? new Date(req.body.installationDate) : null,
        createdById: req.user.id,
      },
      include: {
        region: { select: { name: true } },
        substation: { select: { name: true } },
      },
    });

    res.status(201).json(successResponse(transformer, 'Transformator yaratildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/transformers/:id — Tahrirlash
// ============================================
router.put('/:id', validate(updateTransformerSchema), async (req, res, next) => {
  try {
    const existing = await prisma.transformer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Transformator topilmadi', 404);

    if (req.user.role === 'EMPLOYEE' && existing.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud transformatorini tahrirlash mumkin emas', 403);
    }

    const transformer = await prisma.transformer.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        installationDate: req.body.installationDate ? new Date(req.body.installationDate) : undefined,
      },
      include: {
        region: { select: { name: true } },
        substation: { select: { name: true } },
      },
    });

    res.json(successResponse(transformer, 'Transformator yangilandi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/transformers/:id
// ============================================
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.transformer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Transformator topilmadi', 404);

    if (req.user.role === 'EMPLOYEE' && existing.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud transformatorini o\'chirish mumkin emas', 403);
    }

    await prisma.transformer.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Transformator o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
