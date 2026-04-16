import { useEffect, useState } from 'react';
import { dashboardApi } from '@/api/client';
import { Zap, Activity, AlertTriangle, Wrench, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { DashboardOverview } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: '#10b981',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
  OFFLINE: '#6b7280',
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [criticals, setCriticals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ov, rc, ct] = await Promise.all([
        dashboardApi.overview(),
        dashboardApi.regionCapacity(),
        dashboardApi.criticalTransformers(),
      ]);
      setOverview(ov.data.data);
      setRegionData(rc.data.data);
      setCriticals(ct.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  const statusPie = overview?.statusBreakdown
    ? Object.entries(overview.statusBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Boshqaruv paneliga umumiy ko'rinish</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Zap} label="Transformatorlar" value={overview?.transformers.total || 0} sub={`${overview?.transformers.online || 0} onlayn / ${overview?.transformers.offline || 0} oflayn`} color="blue" />
        <StatCard icon={Activity} label="O'rtacha salomatlik" value={`${overview?.avgHealthScore || 0}%`} sub={`${overview?.substations || 0} podstansiyalar`} color="emerald" />
        <StatCard icon={AlertTriangle} label="Faol ogohlantirishlar" value={overview?.alerts.active || 0} sub={`${overview?.alerts.critical || 0} kritik`} color="amber" />
        <StatCard icon={Wrench} label="Ochilgan muammolar" value={overview?.openWorkOrders || 0} sub={`${overview?.openIncidents || 0} hodisalar`} color="red" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Region Capacity Chart */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Hudud quvvat yuklamasi</h2>
            <button className="text-sm text-blue-600 hover:underline">Haqiqiy ma'lumotlar</button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData.filter(r => r.count > 0)}>
                <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number) => [`${val} kVA`, 'Quvvat']} />
                <Bar dataKey="totalCapacity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Transformers */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Kritik transformatorlar</h2>
          <p className="text-sm text-gray-500 mb-3">Salomatlik va ogohlantirish ustuvorligi</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {criticals.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Kritik transformatorlar yo'q</p>
            ) : (
              criticals.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm text-blue-700">{t.inventoryNumber}</div>
                    <div className="text-xs text-gray-500">{t.region?.name} • {t.substation?.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Quvvat: {t.capacityKva} kVA</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={t.status} />
                    <div className="text-xs text-gray-500 mt-1">Salomatlik: {t.healthScore}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Transformator holati bo'linishi</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusPie.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Priority */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Ogohlantirish ustuvorligi ko'rinishi</h2>
          <div className="space-y-4">
            <ProgressBar label="ACTIVE" value={overview?.alerts.active || 0} max={Math.max(overview?.alerts.active || 1, 1)} />
            <ProgressBar label="CRITICAL" value={overview?.alerts.critical || 0} max={Math.max(overview?.alerts.active || 1, 1)} />
            <ProgressBar label="EMERGENCY" value={overview?.alerts.emergency || 0} max={Math.max(overview?.alerts.active || 1, 1)} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <MiniStat label="Kritik ogohlantirishlar" value={overview?.alerts.critical || 0} />
            <MiniStat label="Favqulodda ogohlantirishlar" value={overview?.alerts.emergency || 0} />
            <MiniStat label="Ochilgan ish buyurtmalari" value={overview?.openWorkOrders || 0} />
            <MiniStat label="Ochilgan hodisalar" value={overview?.openIncidents || 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({ icon: Icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon className={`w-5 h-5 ${colors[color]}`} />
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    OPERATIONAL: 'badge-operational', WARNING: 'badge-warning', CRITICAL: 'badge-critical', OFFLINE: 'badge-offline',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[status] || cls.OFFLINE}`}>{status}</span>;
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg border p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
