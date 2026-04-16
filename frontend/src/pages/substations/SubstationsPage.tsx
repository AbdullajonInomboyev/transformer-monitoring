// src/pages/substations/SubstationsPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { substationsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Building2, Plus, Eye, Edit, Trash2, Download, Upload } from 'lucide-react';

export default function SubstationsPage() {
  const { user } = useAuthStore();
  const [substations, setSubstations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { load(); }, [page]);
  const load = async () => {
    setLoading(true);
    try { const r = await substationsApi.list({ page, limit: 10 }); setSubstations(r.data.data); setTotal(r.data.pagination.total); } catch {} finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Podstansiyalar Boshqaruvi</h1>
          <p className="text-sm text-gray-500">Hududlar bo'yicha podstansiyalarni qo'shish, tahrirlash va kuzatish</p>
        </div>
        {!isReadOnly && <Link to="/substations/new" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Yangi Podstansiya</Link>}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-5"><span className="text-sm text-red-500">Jami podstansiya</span><div className="text-2xl font-bold mt-1">{total}</div></div>
        <div className="bg-white rounded-xl border p-5"><span className="text-sm text-gray-500">Hududlar</span><div className="text-2xl font-bold mt-1">15</div></div>
        <div className="bg-white rounded-xl border p-5"><span className="text-sm text-gray-500">Filtrlangan</span><div className="text-2xl font-bold mt-1">{substations.length}</div></div>
        <div className="bg-white rounded-xl border p-5"><span className="text-sm text-gray-500">Ko'rinish</span><div className="text-2xl font-bold mt-1">Jadval</div></div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Podstansiyalar ro'yxati</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 border rounded text-xs hover:bg-gray-50"><Download className="w-3.5 h-3.5" /> CSV export</button>
            <button className="flex items-center gap-1 px-3 py-1.5 border rounded text-xs hover:bg-gray-50"><Upload className="w-3.5 h-3.5" /> CSV import</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Kod</th>
              <th className="px-4 py-3 text-left">Nomi</th>
              <th className="px-4 py-3 text-left">Hudud</th>
              <th className="px-4 py-3 text-left">Transformatorlar</th>
              <th className="px-4 py-3 text-left">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : substations.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.code}</td>
                <td className="px-4 py-3 text-blue-600">{s.name}</td>
                <td className="px-4 py-3">{s.region?.name}</td>
                <td className="px-4 py-3">{s._count?.transformers || 0}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button className="text-blue-600 text-xs flex items-center gap-0.5"><Eye className="w-3.5 h-3.5" /> Ko'rish</button>
                  {!isReadOnly && <>
                    <button className="text-green-600 text-xs flex items-center gap-0.5"><Edit className="w-3.5 h-3.5" /> Tahrirlash</button>
                    <button className="text-red-600 text-xs flex items-center gap-0.5"><Trash2 className="w-3.5 h-3.5" /> O'chirish</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Jami {total} ta</span>
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
