const { z } = require('zod');

// ============================================
// AUTH VALIDATSIYA
// ============================================
const loginSchema = z.object({
  email: z.string().email('Noto\'g\'ri email format'),
  password: z.string().min(6, 'Parol kamida 6 ta belgi'),
});

// ============================================
// USER VALIDATSIYA
// ============================================
const createUserSchema = z.object({
  email: z.string().email('Noto\'g\'ri email format'),
  password: z.string().min(6, 'Parol kamida 6 ta belgi'),
  fullName: z.string().min(2, 'Ism kamida 2 ta belgi'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'INSPECTOR']),
  regionId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true });

// ============================================
// REGION VALIDATSIYA
// ============================================
const createRegionSchema = z.object({
  name: z.string().min(2),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  code: z.string().min(2).max(10),
  population: z.number().int().min(0).optional(),
  areaKm2: z.number().min(0).optional(),
  description: z.string().optional(),
  polygonCoords: z.any().optional(),
});

// ============================================
// DISTRICT VALIDATSIYA
// ============================================
const createDistrictSchema = z.object({
  name: z.string().min(2),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  code: z.string().min(2).max(10),
  regionId: z.string().uuid(),
  population: z.number().int().min(0).optional(),
  areaKm2: z.number().min(0).optional(),
  description: z.string().optional(),
});

// ============================================
// SUBSTATION VALIDATSIYA
// ============================================
const createSubstationSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(1),
  regionId: z.string().uuid(),
  districtId: z.string().uuid().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  address: z.string().optional(),
  commissionedDate: z.string().optional(),
  transformerCapacities: z.any().optional().nullable(),
  notes: z.string().optional(),
});

// ============================================
// TRANSFORMER VALIDATSIYA
// ============================================
const createTransformerSchema = z.object({
  inventoryNumber: z.string().min(1, 'Inventar raqami talab qilinadi'),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  networkName: z.string().optional().nullable(),
  substationId: z.string().uuid().optional().nullable(),
  regionId: z.string().uuid(),
  districtId: z.string().uuid().optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  capacityKva: z.number().int().min(1, 'Quvvat talab qilinadi'),
  manufactureYear: z.number().int().min(1950).max(2030).optional(),
  installationDate: z.string().optional(),
  connectedHouseholds: z.number().int().min(0).optional(),
  estimatedPopulation: z.number().int().min(0).optional(),
  areaType: z.string().optional(),
  healthScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPERATIONAL', 'WARNING', 'CRITICAL', 'OFFLINE']).optional(),
  isOnline: z.boolean().optional(),
  loadPercent: z.number().min(0).max(100).optional(),
  photoUrl: z.string().optional().nullable(),
  photos: z.any().optional().nullable(),
  notes: z.string().optional(),
});

const updateTransformerSchema = createTransformerSchema.partial();

// ============================================
// ALERT VALIDATSIYA
// ============================================
const createAlertSchema = z.object({
  transformerId: z.string().uuid(),
  priority: z.enum(['ACTIVE', 'CRITICAL', 'EMERGENCY']),
  title: z.string().min(3),
  description: z.string().optional(),
});

// ============================================
// MAINTENANCE VALIDATSIYA
// ============================================
const createMaintenanceSchema = z.object({
  transformerId: z.string().uuid(),
  workType: z.string().min(2),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  cost: z.number().min(0).optional(),
});

// ============================================
// VALIDATSIYA MIDDLEWARE
// ============================================
const validate = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  createRegionSchema,
  createDistrictSchema,
  createSubstationSchema,
  createTransformerSchema,
  updateTransformerSchema,
  createAlertSchema,
  createMaintenanceSchema,
  validate,
};