import { useEffect, useState } from 'react';
import { auditApi } from '@/api/client';
import { FileText, Filter } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { load(); }, [page, actionFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      const r = await auditApi.list(params);
      setLogs(r.data.data);
      setTotal(r.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };

  const actionBadge = (action: string) => {
    const cls: Record<string, string> = {
      LOGIN: 'bg-blue-100 text-blue-700',
      LOGOUT: 'bg-gray-100 text-gray-600',
      CREATE: 'bg-emerald-100 text-emerald-700',
      POST: 'bg-emerald-100 text-emerald-700',
      UPDATE: 'bg-amber-100 text-amber-700',
      PUT: 'bg-amber-100 text-amber-700',
      PATCH: 'bg-amber-100 text-amber-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[action] || 'bg-gray-100 text-gray-600'}`}>{action}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-gray-500">Kim, qachon, nima qilganini kuzatish</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Barcha amallar</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="POST">CREATE</option>
          <option value="PUT">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <span className="text-sm text-gray-500">Jami: {total} ta yozuv</span>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Vaqt</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Foydalanuvchi</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amal</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ob'ekt</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">IP manzil</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">Log yozuvlari topilmadi</p>
              </td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString('uz')}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{l.user?.fullName}</div>
                  <div className="text-xs text-gray-400">{l.user?.email}</div>
                </td>
                <td className="px-4 py-3">{actionBadge(l.action)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {l.entityType}{l.entityId ? ` #${l.entityId.slice(0,8)}` : ''}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{l.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Sahifada {logs.length} ta</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button>
            <span>{page} / {Math.ceil(total/20)||1}</span>
            <button disabled={page >= Math.ceil(total/20)} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button>
          </div>
        </div>
      </div>
    </div>
  );
}
