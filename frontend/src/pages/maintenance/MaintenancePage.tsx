import { useEffect, useState } from 'react';
import { maintenanceApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Wrench, Plus, Calendar, CheckCircle2 } from 'lucide-react';

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { load(); }, [page, statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const r = await maintenanceApi.list(params);
      setRecords(r.data.data);
      setTotal(r.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-amber-100 text-amber-700',
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-gray-100 text-gray-600',
    };
    const labels: Record<string, string> = {
      SCHEDULED: 'Rejalashtirilgan',
      IN_PROGRESS: 'Jarayonda',
      COMPLETED: 'Bajarilgan',
      CANCELLED: 'Bekor qilingan',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[status] || ''}`}>{labels[status] || status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Texnik Xizmat Ko'rsatish</h1>
          <p className="text-sm text-gray-500">Transformatorlar uchun texnik xizmat tarixi va rejalari</p>
        </div>
        {!isReadOnly && (
          <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Yangi Yozuv
          </button>
        )}
      </div>

      {/* Filtr */}
      <div className="flex items-center gap-3 mb-4">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Barcha statuslar</option>
          <option value="SCHEDULED">Rejalashtirilgan</option>
          <option value="IN_PROGRESS">Jarayonda</option>
          <option value="COMPLETED">Bajarilgan</option>
          <option value="CANCELLED">Bekor qilingan</option>
        </select>
        <span className="text-sm text-gray-500">Jami: {total} ta yozuv</span>
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Transformator</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ish turi</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tavsif</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rejalashtirilgan</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Bajargan</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">Texnik xizmat yozuvlari topilmadi</p>
              </td></tr>
            ) : records.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-blue-600">{r.transformer?.inventoryNumber || '—'}</td>
                <td className="px-4 py-3">{r.workType}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.description || '—'}</td>
                <td className="px-4 py-3 text-xs flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString('uz') : '—'}
                </td>
                <td className="px-4 py-3 text-sm">{r.performedBy?.fullName || '—'}</td>
                <td className="px-4 py-3">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Sahifada {records.length} ta</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button>
            <span>{page} / {Math.ceil(total/10)||1}</span>
            <button disabled={page >= Math.ceil(total/10)} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button>
          </div>
        </div>
      </div>
    </div>
  );
}
