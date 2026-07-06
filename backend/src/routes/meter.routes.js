// ============================================
// HISOBLAGICHLAR ROUTE'LARI
// Har bir transformatorga biriktirilgan xonadon
// hisoblagichlari: CRUD, filtrlar, ko'rsatkichlar
// ============================================

const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter, canWriteDistrict } = require('../middleware/rbac');
const { auditLog } = require('../middleware/auditLog');
const { validate, createMeterSchema, updateMeterSchema, createMeterReadingSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

const audit = auditLog('Meter');

router.use(authenticate, inspectorReadOnly, regionFilter);

// Transformator orqali hudud tekshiruvi (yozish amallari uchun)
const checkTransformerAccess = async (req, transformerId) => {
  const transformer = await prisma.transformer.findUnique({
    where: { id: transformerId },
    select: { id: true, regionId: true, districtId: true },
  });
  if (!transformer) throw new AppError('Transformator topilmadi', 404);
  if (req.user.role !== 'ADMIN') {
    if (transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud transformatoriga hisoblagich biriktirish mumkin emas', 403);
    }
    if (!canWriteDistrict(req.user, transformer.districtId)) {
      throw new AppError('Bu tuman sizga biriktirilmagan', 403);
    }
  }
  return transformer;
};

// ============================================
// GET /api/meters — Ro'yxat (barcha ustunlar bo'yicha filtrlar)
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const {
      search, transformerId, regionId, districtId, status, meterType,
      minReading, maxReading, installedFrom, installedTo, hasPhoto, sortBy, sortDir,
    } = req.query;

    // Hudud filtri transformator orqali qo'llanadi
    const transformerWhere = { ...req.regionFilter };
    if (regionId && req.user.role === 'ADMIN') transformerWhere.regionId = regionId;
    if (districtId) transformerWhere.districtId = districtId;

    const where = {
      transformer: transformerWhere,
    };

    if (search) {
      where.OR = [
        { meterNumber: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { sealNumber: { contains: search, mode: 'insensitive' } },
        { meterModel: { contains: search, mode: 'insensitive' } },
        { transformer: { inventoryNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (transformerId) where.transformerId = transformerId;
    if (status) where.status = status;
    if (meterType) where.meterType = meterType;
    if (minReading) where.lastReading = { ...(where.lastReading || {}), gte: parseFloat(minReading) };
    if (maxReading) where.lastReading = { ...(where.lastReading || {}), lte: parseFloat(maxReading) };
    if (installedFrom) where.installationDate = { ...(where.installationDate || {}), gte: new Date(installedFrom) };
    if (installedTo) where.installationDate = { ...(where.installationDate || {}), lte: new Date(installedTo) };
    if (hasPhoto === 'true') where.photoUrl = { not: null };
    if (hasPhoto === 'false') where.photoUrl = null;

    // Sortlash (faqat ruxsat etilgan ustunlar)
    const sortableFields = ['meterNumber', 'ownerName', 'status', 'meterType', 'lastReading', 'lastReadingDate', 'installationDate', 'createdAt'];
    const orderBy = sortableFields.includes(sortBy)
      ? { [sortBy]: sortDir === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' };

    const [meters, total] = await Promise.all([
      prisma.meter.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          transformer: {
            select: {
              id: true, inventoryNumber: true, model: true,
              region: { select: { id: true, name: true } },
              district: { select: { id: true, name: true } },
            },
          },
          _count: { select: { readings: true } },
        },
      }),
      prisma.meter.count({ where }),
    ]);

    res.json(paginatedResponse(meters, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/meters/stats — Statistika (dashboard uchun)
// ============================================
router.get('/stats', async (req, res, next) => {
  try {
    const where = { transformer: { ...req.regionFilter } };

    const [total, statusCounts, typeCounts] = await Promise.all([
      prisma.meter.count({ where }),
      prisma.meter.groupBy({ by: ['status'], where, _count: { status: true } }),
      prisma.meter.groupBy({ by: ['meterType'], where, _count: { meterType: true } }),
    ]);

    const byStatus = {};
    statusCounts.forEach(s => { byStatus[s.status] = s._count.status; });
    const byType = {};
    typeCounts.forEach(t => { byType[t.meterType] = t._count.meterType; });

    res.json(successResponse({ total, byStatus, byType }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/meters/by-transformer/:transformerId
// Transformator batafsil sahifasi uchun
// ============================================
router.get('/by-transformer/:transformerId', async (req, res, next) => {
  try {
    const transformer = await prisma.transformer.findUnique({
      where: { id: req.params.transformerId },
      select: { id: true, regionId: true },
    });
    if (!transformer) throw new AppError('Transformator topilmadi', 404);
    if (req.user.role !== 'ADMIN' && transformer.regionId !== req.user.regionId) {
      throw new AppError('Ruxsat yo\'q', 403);
    }

    const meters = await prisma.meter.findMany({
      where: { transformerId: req.params.transformerId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { readings: true } } },
    });

    res.json(successResponse(meters));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/meters/:id — Batafsil
// ============================================
router.get('/:id', async (req, res, next) => {
  try {
    const meter = await prisma.meter.findUnique({
      where: { id: req.params.id },
      include: {
        transformer: {
          select: {
            id: true, inventoryNumber: true, model: true, latitude: true, longitude: true,
            regionId: true,
            region: { select: { id: true, name: true } },
            district: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 24,
          include: { recordedBy: { select: { id: true, fullName: true } } },
        },
        _count: { select: { readings: true } },
      },
    });

    if (!meter) throw new AppError('Hisoblagich topilmadi', 404);
    if (req.user.role !== 'ADMIN' && meter.transformer.regionId !== req.user.regionId) {
      throw new AppError('Bu hisoblagichni ko\'rish huquqi yo\'q', 403);
    }

    res.json(successResponse(meter));
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/meters — Yangi hisoblagich
// ============================================
router.post('/', validate(createMeterSchema), audit('CREATE'), async (req, res, next) => {
  try {
    await checkTransformerAccess(req, req.body.transformerId);

    const meter = await prisma.meter.create({
      data: {
        ...req.body,
        installationDate: req.body.installationDate ? new Date(req.body.installationDate) : null,
        lastReadingDate: req.body.lastReadingDate ? new Date(req.body.lastReadingDate) : null,
        createdById: req.user.id,
      },
      include: { transformer: { select: { id: true, inventoryNumber: true } } },
    });

    res.status(201).json(successResponse(meter, 'Hisoblagich yaratildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/meters/:id — Tahrirlash
// ============================================
router.put('/:id', validate(updateMeterSchema), audit('UPDATE'), async (req, res, next) => {
  try {
    const existing = await prisma.meter.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true, districtId: true } } },
    });
    if (!existing) throw new AppError('Hisoblagich topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud hisoblagichini tahrirlash mumkin emas', 403);
    }
    // Boshqa transformatorga o'tkazilsa, uni ham tekshiramiz
    if (req.body.transformerId && req.body.transformerId !== existing.transformerId) {
      await checkTransformerAccess(req, req.body.transformerId);
    }

    const meter = await prisma.meter.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        installationDate: req.body.installationDate ? new Date(req.body.installationDate) : undefined,
        lastReadingDate: req.body.lastReadingDate ? new Date(req.body.lastReadingDate) : undefined,
      },
      include: { transformer: { select: { id: true, inventoryNumber: true } } },
    });

    res.json(successResponse(meter, 'Hisoblagich yangilandi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/meters/:id
// ============================================
router.delete('/:id', audit('DELETE'), async (req, res, next) => {
  try {
    const existing = await prisma.meter.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!existing) throw new AppError('Hisoblagich topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud hisoblagichini o\'chirish mumkin emas', 403);
    }

    await prisma.meter.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Hisoblagich o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/meters/:id/readings — Ko'rsatkichlar tarixi
// ============================================
router.get('/:id/readings', async (req, res, next) => {
  try {
    const meter = await prisma.meter.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!meter) throw new AppError('Hisoblagich topilmadi', 404);
    if (req.user.role !== 'ADMIN' && meter.transformer.regionId !== req.user.regionId) {
      throw new AppError('Ruxsat yo\'q', 403);
    }

    const readings = await prisma.meterReading.findMany({
      where: { meterId: req.params.id },
      orderBy: { readingDate: 'desc' },
      include: { recordedBy: { select: { id: true, fullName: true } } },
    });

    res.json(successResponse(readings));
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/meters/:id/readings — Yangi ko'rsatkich kiritish
// Hisoblagichning lastReading maydonini ham yangilaydi
// ============================================
router.post('/:id/readings', validate(createMeterReadingSchema), auditLog('MeterReading')('CREATE'), async (req, res, next) => {
  try {
    const meter = await prisma.meter.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true, districtId: true } } },
    });
    if (!meter) throw new AppError('Hisoblagich topilmadi', 404);
    if (req.user.role !== 'ADMIN' && meter.transformer.regionId !== req.user.regionId) {
      throw new AppError('Ruxsat yo\'q', 403);
    }

    const readingDate = new Date(req.body.readingDate);

    // Oldingi ko'rsatkich (iste'molni hisoblash uchun)
    const prev = await prisma.meterReading.findFirst({
      where: { meterId: meter.id, readingDate: { lt: readingDate } },
      orderBy: { readingDate: 'desc' },
    });
    const consumption = prev ? Math.max(0, req.body.reading - prev.reading) : null;

    const [reading] = await prisma.$transaction([
      prisma.meterReading.create({
        data: {
          meterId: meter.id,
          reading: req.body.reading,
          readingDate,
          consumption,
          notes: req.body.notes || null,
          recordedById: req.user.id,
        },
      }),
      // Eng so'nggi ko'rsatkich bo'lsa, meter'ni yangilaymiz
      ...(!meter.lastReadingDate || readingDate >= meter.lastReadingDate
        ? [prisma.meter.update({
            where: { id: meter.id },
            data: { lastReading: req.body.reading, lastReadingDate: readingDate },
          })]
        : []),
    ]);

    res.status(201).json(successResponse(reading, 'Ko\'rsatkich kiritildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/meters/:id/readings/:readingId
// ============================================
router.delete('/:id/readings/:readingId', auditLog('MeterReading')('DELETE'), async (req, res, next) => {
  try {
    const meter = await prisma.meter.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!meter) throw new AppError('Hisoblagich topilmadi', 404);
    if (req.user.role !== 'ADMIN' && meter.transformer.regionId !== req.user.regionId) {
      throw new AppError('Ruxsat yo\'q', 403);
    }

    await prisma.meterReading.delete({ where: { id: req.params.readingId } });

    // lastReading ni qayta hisoblash
    const latest = await prisma.meterReading.findFirst({
      where: { meterId: meter.id },
      orderBy: { readingDate: 'desc' },
    });
    await prisma.meter.update({
      where: { id: meter.id },
      data: {
        lastReading: latest ? latest.reading : null,
        lastReadingDate: latest ? latest.readingDate : null,
      },
    });

    res.json(successResponse(null, 'Ko\'rsatkich o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
