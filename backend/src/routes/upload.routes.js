const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { successResponse } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

// Uploads papkasini yaratish
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer sozlamalari
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Faqat JPG, PNG, WEBP formatdagi rasmlar ruxsat etilgan', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/upload — Rasm yuklash
router.post('/', authenticate, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Fayl yuklanmadi', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json(successResponse({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 'Fayl muvaffaqiyatli yuklandi'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
