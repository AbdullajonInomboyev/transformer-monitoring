export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'INSPECTOR';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  regionId?: string;
  region?: Region;
  isActive: boolean;
  expiresAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Region {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  code: string;
  population: number;
  areaKm2: number;
  description?: string;
  polygonCoords?: any;
  districts?: District[];
  _count?: { districts: number; substations: number; transformers: number; users: number };
}

export interface District {
  id: string;
  name: string;
  code: string;
  regionId: string;
  region?: Region;
  population: number;
  areaKm2: number;
  _count?: { substations: number; transformers: number };
}

export interface Substation {
  id: string;
  name: string;
  code: string;
  regionId: string;
  region?: Region;
  districtId?: string;
  district?: District;
  latitude?: number;
  longitude?: number;
  address?: string;
  photoUrl?: string;
  _count?: { transformers: number };
}

export type TransformerStatus = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Transformer {
  id: string;
  inventoryNumber: string;
  model?: string;
  manufacturer?: string;
  substationId?: string;
  substation?: Substation;
  regionId: string;
  region?: Region;
  districtId?: string;
  district?: District;
  latitude: number;
  longitude: number;
  address?: string;
  capacityKva: number;
  manufactureYear?: number;
  installationDate?: string;
  connectedHouseholds: number;
  estimatedPopulation: number;
  areaType?: string;
  healthScore: number;
  riskLevel: RiskLevel;
  status: TransformerStatus;
  isOnline: boolean;
  loadPercent: number;
  photoUrl?: string;
  notes?: string;
  alerts?: Alert[];
  _count?: Record<string, number>;
  createdAt: string;
}

export type AlertPriority = 'ACTIVE' | 'CRITICAL' | 'EMERGENCY';

export interface Alert {
  id: string;
  transformerId: string;
  transformer?: Transformer;
  priority: AlertPriority;
  title: string;
  description?: string;
  status: string;
  resolvedAt?: string;
  resolvedBy?: User;
  createdAt: string;
}

export interface Maintenance {
  id: string;
  transformerId: string;
  transformer?: Transformer;
  workType: string;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
  performedBy?: User;
  status: string;
  createdAt: string;
}

export interface DashboardOverview {
  transformers: { total: number; online: number; offline: number };
  substations: number;
  avgHealthScore: number;
  alerts: { active: number; critical: number; emergency: number };
  openWorkOrders: number;
  openIncidents: number;
  statusBreakdown: Record<string, number>;
}

export interface ApiResponse<T> { success: boolean; data: T; message?: string; }
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean; };
}
export interface SelectOption { id: string; name: string; code?: string; }
