const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { regionFilter } = require('../middleware/rbac');
const { successResponse } = require('../utils/helpers');

router.use(authenticate, regionFilter);

// ============================================
// GET /api/dashboard/overview
// Boshqaruv paneli umumiy statistika
// ============================================
router.get('/overview', async (req, res, next) => {
  try {
    const regionWhere = req.regionFilter.regionId
      ? { regionId: req.regionFilter.regionId }
      : {};

    const alertWhere = req.regionFilter.regionId
      ? { transformer: { regionId: req.regionFilter.regionId } }
      : {};

    const [
      totalTransformers,
      onlineTransformers,
      totalSubstations,
      activeAlerts,
      criticalAlerts,
      emergencyAlerts,
      openWorkOrders,
      openIncidents,
      statusCounts,
      avgHealth,
    ] = await Promise.all([
      prisma.transformer.count({ where: regionWhere }),
      prisma.transformer.count({ where: { ...regionWhere, isOnline: true } }),
      prisma.substation.count({ where: regionWhere }),
      prisma.alert.count({ where: { ...alertWhere, status: 'OPEN' } }),
      prisma.alert.count({ where: { ...alertWhere, status: 'OPEN', priority: 'CRITICAL' } }),
      prisma.alert.count({ where: { ...alertWhere, status: 'OPEN', priority: 'EMERGENCY' } }),
      prisma.workOrder.count({ where: { ...alertWhere, status: 'OPEN' } }),
      prisma.incident.count({ where: alertWhere }),
      prisma.transformer.groupBy({
        by: ['status'],
        where: regionWhere,
        _count: { status: true },
      }),
      prisma.transformer.aggregate({
        where: regionWhere,
        _avg: { healthScore: true },
      }),
    ]);

    // Status breakdown
    const statusBreakdown = {};
    statusCounts.forEach(s => { statusBreakdown[s.status] = s._count.status; });

    res.json(successResponse({
      transformers: {
        total: totalTransformers,
        online: onlineTransformers,
        offline: totalTransformers - onlineTransformers,
      },
      substations: totalSubstations,
      avgHealthScore: Math.round((avgHealth._avg.healthScore || 0) * 10) / 10,
      alerts: {
        active: activeAlerts,
        critical: criticalAlerts,
        emergency: emergencyAlerts,
      },
      openWorkOrders,
      openIncidents,
      statusBreakdown,
    }));
  } catch (error) { next(error); }
});

// ============================================
// GET /api/dashboard/region-capacity
// Hudud bo'yicha quvvat yuklamasi
// ============================================
router.get('/region-capacity', async (req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        transformers: {
          select: { capacityKva: true, loadPercent: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = regions.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      totalCapacity: r.transformers.reduce((sum, t) => sum + t.capacityKva, 0),
      avgLoad: r.transformers.length
        ? Math.round(r.transformers.reduce((sum, t) => sum + t.loadPercent, 0) / r.transformers.length)
        : 0,
      count: r.transformers.length,
    }));

    res.json(successResponse(data));
  } catch (error) { next(error); }
});

// ============================================
// GET /api/dashboard/critical-transformers
// Kritik transformatorlar ro'yxati
// ============================================
router.get('/critical-transformers', async (req, res, next) => {
  try {
    const regionWhere = req.regionFilter.regionId
      ? { regionId: req.regionFilter.regionId }
      : {};

    const transformers = await prisma.transformer.findMany({
      where: {
        ...regionWhere,
        OR: [
          { status: 'CRITICAL' },
          { status: 'WARNING' },
          { healthScore: { lt: 50 } },
        ],
      },
      take: 10,
      orderBy: { healthScore: 'asc' },
      select: {
        id: true,
        inventoryNumber: true,
        model: true,
        status: true,
        healthScore: true,
        capacityKva: true,
        isOnline: true,
        region: { select: { name: true } },
        substation: { select: { name: true } },
      },
    });

    res.json(successResponse(transformers));
  } catch (error) { next(error); }
});

module.exports = router;
