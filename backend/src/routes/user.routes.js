const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, createUserSchema, updateUserSchema } = require('../validators');
const { paginate, paginatedResponse, successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

// Barcha endpointlar faqat ADMIN uchun
router.use(authenticate, authorize('ADMIN'));

// ============================================
// GET /api/users — Barcha foydalanuvchilar
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search, role, regionId } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (regionId) where.regionId = regionId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, fullName: true, phone: true,
          role: true, regionId: true, isActive: true, expiresAt: true,
          lastLoginAt: true, createdAt: true,
          region: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(paginatedResponse(users, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/users — Yangi foydalanuvchi
// ============================================
router.post('/', validate(createUserSchema), async (req, res, next) => {
  try {
    const { password, ...data } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { ...data, passwordHash },
      select: {
        id: true, email: true, fullName: true,
        role: true, regionId: true, isActive: true,
        expiresAt: true, createdAt: true,
      },
    });

    res.status(201).json(successResponse(user, 'Foydalanuvchi yaratildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/users/:id
// ============================================
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, regionId: true, isActive: true, expiresAt: true,
        lastLoginAt: true, createdAt: true,
        region: { select: { id: true, name: true, code: true } },
      },
    });
    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);
    res.json(successResponse(user));
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/users/:id — Tahrirlash
// ============================================
router.put('/:id', validate(updateUserSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: {
        id: true, email: true, fullName: true,
        role: true, regionId: true, isActive: true, expiresAt: true,
      },
    });
    res.json(successResponse(user, 'Foydalanuvchi yangilandi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/users/:id
// ============================================
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      throw new AppError('O\'zingizni o\'chira olmaysiz', 400);
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json(successResponse(null, 'Foydalanuvchi o\'chirildi'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/users/:id/reset-password
// ============================================
router.patch('/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Parol kamida 6 ta belgi bo\'lishi kerak', 400);
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });
    res.json(successResponse(null, 'Parol yangilandi'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
