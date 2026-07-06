// ============================================
// TEKSHIRUVLAR ROUTE'LARI
// Eslatma: INSPECTOR roli tekshiruv YARATA oladi
// (bu uning asosiy vazifasi), lekin boshqa
// ma'lumotlarni o'zgartira olmaydi
// ============================================

const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { regionFilter } = require('../middleware/rbac');
const { auditLog } = require('../middleware/auditLog');
const { validate, createInspectionSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

const audit = auditLog('Inspection');

router.use(authenticate, regionFilter);

// ============================================
// GET /api/inspections
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { transformerId, result, search, dateFrom, dateTo } = req.query;

    const where = { transformer: { ...req.regionFilter } };
    if (transformerId) where.transformerId = transformerId;
    if (result) where.result = result;
    if (search) {
      where.OR = [
        { findings: { contains: search, mode: 'insensitive' } },
        { transformer: { inventoryNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (dateFrom) where.inspectionDate = { ...(where.inspectionDate || {}), gte: new Date(dateFrom) };
    if (dateTo) where.inspectionDate = { ...(where.inspectionDate || {}), lte: new Date(dateTo) };

    const [items, total] = await Promise.all([
      prisma.inspection.findMany({
        where, skip, take: limit,
        orderBy: { inspectionDate: 'desc' },
        include: {
          transformer: { select: { id: true, inventoryNumber: true, model: true, region: { select: { name: true } } } },
          inspector: { select: { id: true, fullName: true } },
        },
      }),
      prisma.inspection.count({ where }),
    ]);

    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) { next(error); }
});

// ============================================
// POST /api/inspections — INSPECTOR ham yarata oladi
// ============================================
router.post('/', validate(createInspectionSchema), audit('CREATE'), async (req, res, next) => {
  try {
    const transformer = await prisma.transformer.findUnique({
      where: { id: req.body.transformerId },
      select: { regionId: true },
    });
    if (!transformer) throw new AppError('Transformator topilmadi', 404);
    if (req.user.role !== 'ADMIN' && transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud transformatorini tekshirish mumkin emas', 403);
    }

    const item = await prisma.inspection.create({
      data: {
        transformerId: req.body.transformerId,
        inspectorId: req.user.id,
        inspectionDate: new Date(req.body.inspectionDate),
        checklist: req.body.checklist || null,
        findings: req.body.findings || null,
        result: req.body.result || 'PASS',
      },
      include: {
        transformer: { select: { id: true, inventoryNumber: true } },
        inspector: { select: { id: true, fullName: true } },
      },
    });

    res.status(201).json(successResponse(item, 'Tekshiruv qayd etildi'));
  } catch (error) { next(error); }
});

// ============================================
// PUT /api/inspections/:id — Faqat o'zi yaratgan yoki ADMIN
// ============================================
router.put('/:id', audit('UPDATE'), async (req, res, next) => {
  try {
    const existing = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!existing) throw new AppError('Tekshiruv topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.inspectorId !== req.user.id) {
      throw new AppError('Faqat o\'zingiz kiritgan tekshiruvni tahrirlashingiz mumkin', 403);
    }

    const data = {};
    if (req.body.inspectionDate) data.inspectionDate = new Date(req.body.inspectionDate);
    if (req.body.checklist !== undefined) data.checklist = req.body.checklist;
    if (req.body.findings !== undefined) data.findings = req.body.findings;
    if (req.body.result) data.result = req.body.result;

    const item = await prisma.inspection.update({
      where: { id: req.params.id },
      data,
      include: { transformer: { select: { id: true, inventoryNumber: true } } },
    });

    res.json(successResponse(item, 'Tekshiruv yangilandi'));
  } catch (error) { next(error); }
});

// ============================================
// DELETE /api/inspections/:id
// ============================================
router.delete('/:id', audit('DELETE'), async (req, res, next) => {
  try {
    const existing = await prisma.inspection.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Tekshiruv topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.inspectorId !== req.user.id) {
      throw new AppError('Faqat o\'zingiz kiritgan tekshiruvni o\'chirishingiz mumkin', 403);
    }

    await prisma.inspection.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Tekshiruv o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
