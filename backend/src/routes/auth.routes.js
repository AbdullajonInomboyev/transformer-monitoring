const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { validate, loginSchema } = require('../validators');
const { successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Email yoki parol noto\'g\'ri', 401);

    if (!user.isActive) throw new AppError('Hisob faol emas', 403);

    // Tekshiruvchi muddati
    if (user.role === 'INSPECTOR' && user.expiresAt && new Date() > user.expiresAt) {
      throw new AppError('Kirish muddati tugagan', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new AppError('Email yoki parol noto\'g\'ri', 401);

    // Tokenlar yaratish
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Refresh tokenni saqlash
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Last login yangilash
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
      },
    });

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        regionId: user.regionId,
      },
      accessToken,
      refreshToken,
    }, 'Muvaffaqiyatli kirish'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/auth/refresh
// ============================================
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token talab qilinadi', 400);

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Yaroqsiz yoki muddati tugagan refresh token', 401);
    }

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json(successResponse({ accessToken: newAccessToken }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/auth/logout
// ============================================
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // Barcha refresh tokenlarni o'chirish
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user.id,
        ipAddress: req.ip,
      },
    });

    res.json(successResponse(null, 'Muvaffaqiyatli chiqish'));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/auth/me
// ============================================
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        regionId: true,
        region: { select: { id: true, name: true, code: true } },
        isActive: true,
        expiresAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    res.json(successResponse(user));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
