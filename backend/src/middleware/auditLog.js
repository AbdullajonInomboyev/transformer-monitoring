const prisma = require('../config/prisma');

// Barcha o'zgarishlarni yozib borish
const auditLog = (entityType) => {
  return (action) => {
    return async (req, res, next) => {
      // Original json metodini intercept qilamiz
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Faqat muvaffaqiyatli so'rovlarni log qilamiz
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const logEntry = {
            userId: req.user.id,
            action: action || req.method,
            entityType,
            entityId: req.params.id || data?.data?.id || null,
            newValues: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
          };

          // Asinxron yozamiz (responseni kutmaymiz)
          prisma.auditLog.create({ data: logEntry }).catch(console.error);
        }

        return originalJson(data);
      };

      next();
    };
  };
};

module.exports = { auditLog };
