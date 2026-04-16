const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { AppError } = require('./errorHandler');

// Token tekshirish va foydalanuvchini aniqlash
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Avtorizatsiya tokeni topilmadi', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Foydalanuvchini bazadan olish
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        regionId: true,
        isActive: true,
        expiresAt: true,
      },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 401);
    }

    if (!user.isActive) {
      throw new AppError('Hisob faol emas', 403);
    }

    // Tekshiruvchi muddati tugaganmi
    if (user.role === 'INSPECTOR' && user.expiresAt && new Date() > user.expiresAt) {
      throw new AppError('Kirish muddati tugagan. Admin bilan bog\'laning.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };
