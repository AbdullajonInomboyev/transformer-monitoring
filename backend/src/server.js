const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const regionRoutes = require('./routes/region.routes');
const districtRoutes = require('./routes/district.routes');
const substationRoutes = require('./routes/substation.routes');
const transformerRoutes = require('./routes/transformer.routes');
const alertRoutes = require('./routes/alert.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditRoutes = require('./routes/audit.routes');
const uploadRoutes = require('./routes/upload.routes');
const workPermitRoutes = require('./routes/workpermit.routes');
const powerLineRoutes = require('./routes/powerline.routes');
const meterRoutes = require('./routes/meter.routes');
const inspectionRoutes = require('./routes/inspection.routes');
const incidentRoutes = require('./routes/incident.routes');
const workOrderRoutes = require('./routes/workorder.routes');

const app = express();

// Railway/Render kabi proxy ortida to'g'ri IP aniqlash uchun
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Umumiy API rate limit (DoS himoyasi)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Juda ko'p so'rov. Birozdan keyin urinib ko'ring." },
});
app.use('/api', apiLimiter);

// Rasmlar uchun static (UPLOAD_DIR env orqali — Railway Volume uchun)
const uploadDir = path.isAbsolute(config.upload.dir)
  ? config.upload.dir
  : path.join(__dirname, '..', config.upload.dir.replace(/^\.\//, ''));
app.use('/uploads', express.static(uploadDir));

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/substations', substationRoutes);
app.use('/api/transformers', transformerRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/work-permits', workPermitRoutes);
app.use('/api/power', powerLineRoutes);
app.use('/api/meters', meterRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/work-orders', workOrderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 — errorHandler'dan OLDIN turishi kerak
app.use((req, res) => { res.status(404).json({ success: false, error: 'Endpoint topilmadi' }); });
app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n  Transformator API ishga tushdi: http://localhost:${PORT}\n`);
});

module.exports = app;