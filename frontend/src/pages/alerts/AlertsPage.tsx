import { useEffect, useState } from 'react';
import { alertsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export default function AlertsPage() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await alertsApi.list({ limit: 50 }); setAlerts(r.data.data); } catch {} finally { setLoading(false); }
  };

  const handleResolve = async (id: string) => {
    try { await alertsApi.resolve(id); load(); } catch {}
  };

  const priorityColor: Record<string, string> = { ACTIVE: 'bg-blue-100 text-blue-700', CRITICAL: 'bg-red-100 text-red-700', EMERGENCY: 'bg-red-200 text-red-800' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Alerts</h1>
          <p className="text-sm text-gray-500">Review critical events and system warnings.</p>
        </div>
        {!isReadOnly && <button className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Clear Logs</button>}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Yuklanmoqda...</div>
        ) : alerts.length === 0 ? (
          <div className="p-16 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No events have been logged yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map(a => (
              <div key={a.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${a.priority === 'EMERGENCY' ? 'text-red-600' : a.priority === 'CRITICAL' ? 'text-red-500' : 'text-blue-500'}`} />
                  <div>
                    <div className="font-medium text-sm">{a.title}</div>
                    <div className="text-xs text-gray-500">
                      {a.transformer?.inventoryNumber} • {new Date(a.createdAt).toLocaleString('uz')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[a.priority] || ''}`}>{a.priority}</span>
                  {a.status === 'OPEN' && !isReadOnly && (
                    <button onClick={() => handleResolve(a.id)} className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Hal qilish
                    </button>
                  )}
                  {a.status === 'RESOLVED' && <span className="text-xs text-emerald-600">✓ Hal qilingan</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
