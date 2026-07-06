// ============================================
// STALBA VA LINIYA ROUTE'LARI
// GET/POST/PUT/DELETE /api/power-poles
// GET/POST/PUT/DELETE /api/power-lines
// ============================================

const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly } = require('../middleware/rbac');
const { auditLog } = require('../middleware/auditLog');
const { successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate);

// ============================================
// STALBALAR
// ============================================

// GET /api/power-poles — Barcha stalbalar (xarita uchun)
router.get('/poles', async (req, res, next) => {
  try {
    // BUG FIX: hudud filtri — hodim faqat o'z hududi (va eski, hududsiz) stalbalarini ko'radi
    const where = req.user.role === 'ADMIN' || !req.user.regionId
      ? {}
      : { OR: [{ regionId: req.user.regionId }, { regionId: null }] };
    const poles = await prisma.powerPole.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    res.json(successResponse(poles));
  } catch (error) {
    next(error);
  }
});

// POST /api/power-poles — Yangi stalba
router.post('/poles', inspectorReadOnly, async (req, res, next) => {
  try {
    const { latitude, longitude, label, notes } = req.body;
    if (!latitude || !longitude) throw new AppError('Koordinata kiritilmadi', 400);

    const pole = await prisma.powerPole.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        label: label || null,
        notes: notes || null,
        regionId: req.user.regionId || null,
      },
    });
    res.status(201).json(successResponse(pole, 'Stalba qo\'shildi'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/power-poles/:id — Stalba yangilash
router.put('/poles/:id', inspectorReadOnly, async (req, res, next) => {
  try {
    const existing = await prisma.powerPole.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Stalba topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.regionId && existing.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud stalbasini o\'zgartirish mumkin emas', 403);
    }
    const { latitude, longitude, label, notes } = req.body;
    const pole = await prisma.powerPole.update({
      where: { id: req.params.id },
      data: {
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
        ...(label !== undefined && { label }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(successResponse(pole, 'Stalba yangilandi'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/power-poles/:id — Stalba o'chirish
router.delete('/poles/:id', inspectorReadOnly, async (req, res, next) => {
  try {
    const existingPole = await prisma.powerPole.findUnique({ where: { id: req.params.id } });
    if (!existingPole) throw new AppError('Stalba topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existingPole.regionId && existingPole.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud stalbasini o\'chirish mumkin emas', 403);
    }
    // Avval shu stalbaga bog'liq liniyalarni o'chiramiz
    await prisma.powerLine.deleteMany({
      where: { OR: [{ fromPoleId: req.params.id }, { toPoleId: req.params.id }] },
    });
    await prisma.powerPole.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Stalba o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// LINIYALAR
// ============================================

// GET /api/power-lines — Barcha liniyalar
router.get('/lines', async (req, res, next) => {
  try {
    // BUG FIX: hudud filtri — liniyalar biror uchi foydalanuvchi hududida bo'lsa ko'rinadi
    const where = req.user.role === 'ADMIN' || !req.user.regionId
      ? {}
      : {
          OR: [
            { fromTransformer: { regionId: req.user.regionId } },
            { toTransformer: { regionId: req.user.regionId } },
            { fromPole: { OR: [{ regionId: req.user.regionId }, { regionId: null }] } },
            { toPole: { OR: [{ regionId: req.user.regionId }, { regionId: null }] } },
          ],
        };
    const lines = await prisma.powerLine.findMany({
      where,
      include: {
        fromPole: true,
        toPole: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(successResponse(lines));
  } catch (error) {
    next(error);
  }
});

// POST /api/power-lines — Yangi liniya (transformator ↔ stalba ↔ stalba)
router.post('/lines', inspectorReadOnly, async (req, res, next) => {
  try {
    const { fromTransformerId, toTransformerId, fromPoleId, toPoleId, lineType, label } = req.body;

    // Kamida bir boshlanish va bir tugatish nuqtasi bo'lishi kerak
    if (!fromTransformerId && !fromPoleId) throw new AppError('Boshlanish nuqtasi kiritilmadi', 400);
    if (!toTransformerId && !toPoleId) throw new AppError('Tugatish nuqtasi kiritilmadi', 400);

    const line = await prisma.powerLine.create({
      data: {
        fromTransformerId: fromTransformerId || null,
        toTransformerId: toTransformerId || null,
        fromPoleId: fromPoleId || null,
        toPoleId: toPoleId || null,
        lineType: lineType || 'MAIN', // MAIN (asosiy, ko'k) | BRANCH (tarmoq, to'q sariq)
        label: label || null,
      },
      include: { fromPole: true, toPole: true },
    });
    res.status(201).json(successResponse(line, 'Liniya qo\'shildi'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/power-lines/:id — Liniya o'chirish
router.delete('/lines/:id', inspectorReadOnly, async (req, res, next) => {
  try {
    await prisma.powerLine.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Liniya o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;