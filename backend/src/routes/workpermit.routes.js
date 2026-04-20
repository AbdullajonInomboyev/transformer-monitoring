const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate);

// GET /api/work-permits
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { department: { contains: search, mode: 'insensitive' } },
        { workSupervisor: { contains: search, mode: 'insensitive' } },
        { workPerformer: { contains: search, mode: 'insensitive' } },
        { taskDescription: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (req.user.role !== 'ADMIN' && req.user.regionId) {
      where.regionId = req.user.regionId;
    }

    const [items, total] = await Promise.all([
      prisma.workPermit.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transformer: { select: { id: true, inventoryNumber: true, model: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.workPermit.count({ where }),
    ]);

    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) { next(error); }
});

// GET /api/work-permits/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.workPermit.findUnique({
      where: { id: req.params.id },
      include: {
        transformer: { select: { id: true, inventoryNumber: true, model: true, networkName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!item) throw new AppError('Topilmadi', 404);
    res.json(successResponse(item));
  } catch (error) { next(error); }
});

// POST /api/work-permits
router.post('/', async (req, res, next) => {
  try {
    const data = { ...req.body, createdById: req.user.id };
    if (data.workStartDate) data.workStartDate = new Date(data.workStartDate);
    if (data.workEndDate) data.workEndDate = new Date(data.workEndDate);
    if (data.issuedByDate) data.issuedByDate = new Date(data.issuedByDate);
    if (data.permittedByDate) data.permittedByDate = new Date(data.permittedByDate);
    if (req.user.regionId) data.regionId = req.user.regionId;

    const item = await prisma.workPermit.create({
      data,
      include: {
        transformer: { select: { id: true, inventoryNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    res.status(201).json(successResponse(item, 'Naryad-ijozat yaratildi'));
  } catch (error) { next(error); }
});

// PUT /api/work-permits/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.workStartDate) data.workStartDate = new Date(data.workStartDate);
    if (data.workEndDate) data.workEndDate = new Date(data.workEndDate);
    if (data.issuedByDate) data.issuedByDate = new Date(data.issuedByDate);
    if (data.permittedByDate) data.permittedByDate = new Date(data.permittedByDate);

    const item = await prisma.workPermit.update({
      where: { id: req.params.id },
      data,
      include: {
        transformer: { select: { id: true, inventoryNumber: true } },
      },
    });
    res.json(successResponse(item, 'Yangilandi'));
  } catch (error) { next(error); }
});

// DELETE /api/work-permits/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.workPermit.delete({ where: { id: req.params.id } });
    res.json(successResponse(null, 'O\'chirildi'));
  } catch (error) { next(error); }
});

module.exports = router;
