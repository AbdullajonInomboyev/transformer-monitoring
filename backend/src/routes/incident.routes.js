// ============================================
// HODISALAR ROUTE'LARI
// ============================================

const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter } = require('../middleware/rbac');
const { auditLog } = require('../middleware/auditLog');
const { validate, createIncidentSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

const audit = auditLog('Incident');

router.use(authenticate, inspectorReadOnly, regionFilter);

// ============================================
// GET /api/incidents
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { transformerId, severity, search, dateFrom, dateTo } = req.query;

    const where = { transformer: { ...req.regionFilter } };
    if (transformerId) where.transformerId = transformerId;
    if (severity) where.severity = severity;
    if (search) {
      where.OR = [
        { incidentType: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { transformer: { inventoryNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (dateFrom) where.occurredAt = { ...(where.occurredAt || {}), gte: new Date(dateFrom) };
    if (dateTo) where.occurredAt = { ...(where.occurredAt || {}), lte: new Date(dateTo) };

    const [items, total] = await Promise.all([
      prisma.incident.findMany({
        where, skip, take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          transformer: { select: { id: true, inventoryNumber: true, model: true, region: { select: { name: true } } } },
          reportedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) { next(error); }
});

// ============================================
// POST /api/incidents
// ============================================
router.post('/', validate(createIncidentSchema), audit('CREATE'), async (req, res, next) => {
  try {
    const transformer = await prisma.transformer.findUnique({
      where: { id: req.body.transformerId },
      select: { regionId: true },
    });
    if (!transformer) throw new AppError('Transformator topilmadi', 404);
    if (req.user.role !== 'ADMIN' && transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud transformatoriga hodisa kiritish mumkin emas', 403);
    }

    const item = await prisma.incident.create({
      data: {
        transformerId: req.body.transformerId,
        incidentType: req.body.incidentType,
        description: req.body.description || null,
        occurredAt: new Date(req.body.occurredAt),
        severity: req.body.severity || 'LOW',
        reportedById: req.user.id,
      },
      include: { transformer: { select: { id: true, inventoryNumber: true } } },
    });

    res.status(201).json(successResponse(item, 'Hodisa qayd etildi'));
  } catch (error) { next(error); }
});

// ============================================
// PUT /api/incidents/:id
// ============================================
router.put('/:id', audit('UPDATE'), async (req, res, next) => {
  try {
    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!existing) throw new AppError('Hodisa topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud hodisasini tahrirlash mumkin emas', 403);
    }

    const data = {};
    if (req.body.incidentType) data.incidentType = req.body.incidentType;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.occurredAt) data.occurredAt = new Date(req.body.occurredAt);
    if (req.body.severity) data.severity = req.body.severity;

    const item = await prisma.incident.update({
      where: { id: req.params.id },
      data,
      include: { transformer: { select: { id: true, inventoryNumber: true } } },
    });

    res.json(successResponse(item, 'Hodisa yangilandi'));
  } catch (error) { next(error); }
});

// ============================================
// DELETE /api/incidents/:id
// ============================================
router.delete('/:id', audit('DELETE'), async (req, res, next) => {
  try {
    const existing = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!existing) throw new AppError('Hodisa topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud hodisasini o\'chirish mumkin emas', 403);
    }

    await prisma.incident.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Hodisa o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
