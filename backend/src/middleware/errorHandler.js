// Markazlashtirilgan xato qayta ishlash
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server xatosi';

  // Prisma xatoliklari
  if (err.code === 'P2002') {
    statusCode = 409;
    const field = err.meta?.target?.[0] || 'maydon';
    message = `Bu ${field} allaqachon mavjud`;
  }

  if (err.code === 'P2003') {
    statusCode = 409;
    message = "Bu yozuvga bog'liq boshqa ma'lumotlar mavjud. Avval ularni o'chiring.";
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Yozuv topilmadi';
  }

  // JWT xatoliklari
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Yaroqsiz token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token muddati tugagan';
  }

  // Zod validatsiya xatoliklari
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  }

  console.error(`[ERROR] ${statusCode} - ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { AppError, errorHandler };
