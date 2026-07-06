// ============================================
// ISH BUYURTMALARI ROUTE'LARI
// ============================================

const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { inspectorReadOnly, regionFilter } = require('../middleware/rbac');
const { auditLog } = require('../middleware/auditLog');
const { validate, createWorkOrderSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

const audit = auditLog('WorkOrder');

router.use(authenticate, inspectorReadOnly, regionFilter);

// ============================================
// GET /api/work-orders
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { transformerId, status, priority, assignedToId, search } = req.query;

    const where = { transformer: { ...req.regionFilter } };
    if (transformerId) where.transformerId = transformerId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { transformer: { inventoryNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where, skip, take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          transformer: { select: { id: true, inventoryNumber: true, model: true, region: { select: { name: true } } } },
          assignedTo: { select: { id: true, fullName: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) { next(error); }
});

// ============================================
// POST /api/work-orders
// ============================================
router.post('/', validate(createWorkOrderSchema), audit('CREATE'), async (req, res, next) => {
  try {
    const transformer = await prisma.transformer.findUnique({
      where: { id: req.body.transformerId },
      select: { regionId: true },
    });
    if (!transformer) throw new AppError('Transformator topilmadi', 404);
    if (req.user.role !== 'ADMIN' && transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud transformatoriga buyurtma yaratish mumkin emas', 403);
    }

    const item = await prisma.workOrder.create({
      data: {
        transformerId: req.body.transformerId,
        title: req.body.title,
        description: req.body.description || null,
        assignedToId: req.body.assignedToId || null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        status: req.body.status || 'OPEN',
        priority: req.body.priority || 'MEDIUM',
      },
      include: {
        transformer: { select: { id: true, inventoryNumber: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    res.status(201).json(successResponse(item, 'Ish buyurtmasi yaratildi'));
  } catch (error) { next(error); }
});

// ============================================
// PUT /api/work-orders/:id
// ============================================
router.put('/:id', audit('UPDATE'), async (req, res, next) => {
  try {
    const existing = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!existing) throw new AppError('Buyurtma topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud buyurtmasini tahrirlash mumkin emas', 403);
    }

    const data = {};
    if (req.body.title) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.assignedToId !== undefined) data.assignedToId = req.body.assignedToId || null;
    if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.status) data.status = req.body.status;
    if (req.body.priority) data.priority = req.body.priority;

    const item = await prisma.workOrder.update({
      where: { id: req.params.id },
      data,
      include: {
        transformer: { select: { id: true, inventoryNumber: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    res.json(successResponse(item, 'Buyurtma yangilandi'));
  } catch (error) { next(error); }
});

// ============================================
// DELETE /api/work-orders/:id
// ============================================
router.delete('/:id', audit('DELETE'), async (req, res, next) => {
  try {
    const existing = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      include: { transformer: { select: { regionId: true } } },
    });
    if (!existing) throw new AppError('Buyurtma topilmadi', 404);
    if (req.user.role !== 'ADMIN' && existing.transformer.regionId !== req.user.regionId) {
      throw new AppError('Boshqa hudud buyurtmasini o\'chirish mumkin emas', 403);
    }

    await prisma.workOrder.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'Buyurtma o\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
