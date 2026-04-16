const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

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

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rasmlar uchun static
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);
app.use((req, res) => { res.status(404).json({ error: 'Endpoint topilmadi' }); });

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n  Transformator API ishga tushdi: http://localhost:${PORT}\n`);
});

module.exports = app;
