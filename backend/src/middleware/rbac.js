const { AppError } = require('./errorHandler');

// ============================================
// ROL TEKSHIRISH
// Faqat ruxsat berilgan rollar o'tadi
// ============================================
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Avtorizatsiya talab qilinadi', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Bu amalni bajarishga ruxsat yo\'q', 403));
    }

    next();
  };
};

// ============================================
// TEKSHIRUVCHI FAQAT GET SO'ROVLARI
// Inspector faqat ko'rishi mumkin
// ============================================
const inspectorReadOnly = (req, res, next) => {
  if (req.user.role === 'INSPECTOR' && req.method !== 'GET') {
    return next(new AppError('Tekshiruvchi faqat ma\'lumotlarni ko\'ra oladi', 403));
  }
  next();
};

// ============================================
// HUDUD FILTRI
// Hodim faqat o'z hududini ko'radi
// Admin hammani ko'radi
// ============================================
const regionFilter = (req, res, next) => {
  if (req.user.role === 'ADMIN') {
    // Admin barcha hududlarni ko'radi
    req.regionFilter = {};
  } else if (req.user.regionId) {
    // Hodim/Tekshiruvchi faqat o'z hududini
    req.regionFilter = { regionId: req.user.regionId };
    // Tuman darajasida biriktirilgan bo'lsa — faqat o'sha tumanlar
    if (
      req.user.assignmentType === 'DISTRICTS' &&
      Array.isArray(req.user.districtIds) &&
      req.user.districtIds.length > 0
    ) {
      req.regionFilter.districtId = { in: req.user.districtIds };
    }
  } else {
    return next(new AppError('Hudud biriktirilmagan. Admin bilan bog\'laning.', 403));
  }
  next();
};

// ============================================
// TUMAN TEKSHIRISH (yozish amallari uchun)
// Hodim tuman darajasida biriktirilgan bo'lsa,
// faqat o'z tumanlariga yozishi mumkin
// ============================================
const canWriteDistrict = (user, districtId) => {
  if (user.role === 'ADMIN') return true;
  if (
    user.assignmentType === 'DISTRICTS' &&
    Array.isArray(user.districtIds) &&
    user.districtIds.length > 0
  ) {
    return !!districtId && user.districtIds.includes(districtId);
  }
  return true; // Viloyat darajasida biriktirilgan
};

// ============================================
// O'Z RESURSI TEKSHIRISH
// Foydalanuvchi faqat o'zi yaratgan yoki
// o'z hududidagi ma'lumotni tahrirlashi mumkin
// ============================================
const ownerOrAdmin = (getResourceRegionId) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'ADMIN') {
        return next(); // Admin hamma narsani qila oladi
      }

      if (req.user.role === 'INSPECTOR') {
        return next(new AppError('Tekshiruvchi tahrirlash huquqiga ega emas', 403));
      }

      // Hodim uchun: resursning hududini tekshirish
      const resourceRegionId = await getResourceRegionId(req);
      
      if (resourceRegionId && resourceRegionId !== req.user.regionId) {
        return next(new AppError('Boshqa hudud ma\'lumotlarini tahrirlash mumkin emas', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authorize, inspectorReadOnly, regionFilter, ownerOrAdmin, canWriteDistrict };
