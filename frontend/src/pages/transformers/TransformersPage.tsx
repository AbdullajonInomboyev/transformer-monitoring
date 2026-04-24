import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transformersApi, regionsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Plus, Search, Filter, Download, Upload, Trash2, Edit } from 'lucide-react';
import api from '@/api/client';

const photoUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  return base ? base + url : url;
};

export default function TransformersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [transformers, setTransformers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', regionId: '', status: '', minKva: '', maxKva: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState(false);
  const limit = 10;

  useEffect(() => { loadRegions(); }, []);
  useEffect(() => { loadTransformers(); }, [page, filters]);

  const loadRegions = async () => {
    try { const res = await regionsApi.all(); setRegions(res.data.data); } catch {}
  };

  const loadTransformers = async () => {
    setLoading(true);
    try {
      const res = await transformersApi.list({ page, limit, ...filters });
      setTransformers(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    try { await transformersApi.delete(id); loadTransformers(); } catch {}
  };

  // CSV Export — BARCHA transformatorlarni yuklaydi
  const handleExport = async () => {
    setExporting(true);
    try {
      // Barcha transformatorlarni olish
      const res = await transformersApi.list({ page: 1, limit: 10000, ...filters });
      const allData = res.data.data;

      const headers = ['Inventar №', 'Model', 'Tarmoq nomi', 'Hudud', 'Podstansiya', 'Tasarrufi', 'Aholi', 'Lat', 'Lng', 'Quvvat (kVA)', 'Status'];
      const rows = allData.map((t: any) => [
        t.inventoryNumber || '', t.model || '', t.networkName || '', t.region?.name || '', t.substation?.name || '',
        t.areaType || '', t.estimatedPopulation || 0, t.latitude || '', t.longitude || '', t.capacityKva || '', t.status || '',
      ]);

      // Excel uchun ; ajratgich va BOM
      const csv = [headers.join(';'), ...rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `transformatorlar_${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export xatolik'); }
    finally { setExporting(false); }
  };

  // CSV Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { alert('CSV fayl bo\'sh'); return; }
        // ; yoki , ajratgichni aniqlash
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim());
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(sep).map(v => v.replace(/^"|"$/g, '').trim());
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
          try {
            await transformersApi.create({
              inventoryNumber: row['Inventar №'] || `IMP-${Date.now()}-${i}`,
              model: row['Model'] || '',
              networkName: row['Tarmoq nomi'] || '',
              regionId: user?.regionId || '',
              latitude: parseFloat(row['Lat']) || 41.3,
              longitude: parseFloat(row['Lng']) || 69.3,
              capacityKva: parseInt(row['Quvvat (kVA)']) || 100,
              status: row['Status'] || 'OPERATIONAL',
              areaType: row['Tasarrufi'] || '',
            });
            imported++;
          } catch {}
        }
        alert(`${imported} ta transformator import qilindi!`);
        loadTransformers();
      } catch { alert('CSV o\'qishda xatolik'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalPages = Math.ceil(total / limit);
  const isReadOnly = user?.role === 'INSPECTOR';

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      OPERATIONAL: 'bg-green-100 text-green-700',
      WARNING: 'bg-yellow-100 text-yellow-700',
      CRITICAL: 'bg-red-100 text-red-700',
      OFFLINE: 'bg-gray-100 text-gray-600',
    };
    const labels: Record<string, string> = {
      OPERATIONAL: 'Ishlayapti', WARNING: 'Ogohlantirish', CRITICAL: 'Kritik', OFFLINE: 'O\'chgan',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[status] || ''}`}>{labels[status] || status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transformatorlar Boshqaruvi</h1>
          <p className="text-sm text-gray-500">Barcha transformatorlarni boshqarish, filtrlash va monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
            <Download className="w-4 h-4" /> {exporting ? 'Yuklanmoqda...' : 'CSV Export'}
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" /> CSV Import
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          {!isReadOnly && (
            <Link to="/transformers/new" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Yangi Transformator
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-4">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" /> Filtrlar
        </button>
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                placeholder="Qidiruv..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {user?.role === 'ADMIN' && (
              <select
                value={filters.regionId}
                onChange={e => { setFilters(f => ({ ...f, regionId: e.target.value })); setPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Barcha hududlar</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <select
              value={filters.status}
              onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Barcha statuslar</option>
              <option value="OPERATIONAL">Ishlayapti</option>
              <option value="WARNING">Ogohlantirish</option>
              <option value="CRITICAL">Kritik</option>
              <option value="OFFLINE">O'chgan</option>
            </select>
            <input
              value={filters.minKva}
              onChange={e => setFilters(f => ({ ...f, minKva: e.target.value }))}
              placeholder="Min kVA"
              className="w-24 px-3 py-2 border rounded-lg text-sm"
            />
            <input
              value={filters.maxKva}
              onChange={e => setFilters(f => ({ ...f, maxKva: e.target.value }))}
              placeholder="Max kVA"
              className="w-24 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={() => { setFilters({ search: '', regionId: '', status: '', minKva: '', maxKva: '' }); setPage(1); }}
              className="text-sm text-red-600 hover:underline"
            >
              Tozalash
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Photo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Inventar №</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Model</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tarmoq nomi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Hudud / Podstansiya</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tasarrufi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Aholi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Quvvat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto" />
                </td></tr>
              ) : transformers.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">Transformator topilmadi</td></tr>
              ) : (
                transformers.map(t => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/transformers/${t.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {t.photoUrl ? (
                        <img src={photoUrl(t.photoUrl)} alt={t.inventoryNumber} className="w-10 h-10 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-400">N/A</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">{t.inventoryNumber}</td>
                    <td className="px-4 py-3">{t.model || '—'}</td>
                    <td className="px-4 py-3">{t.networkName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.region?.name}</div>
                      <div className="text-xs text-gray-500">{t.substation?.name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{t.areaType || '—'}</td>
                    <td className="px-4 py-3">{t.estimatedPopulation?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-blue-600 font-medium">{t.capacityKva} kVA</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {!isReadOnly && (
                          <>
                            <button onClick={() => navigate(`/transformers/${t.id}/edit`)} className="text-blue-500 hover:text-blue-700" title="Tahrirlash">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700" title="O'chirish">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <span className="text-gray-500">Jami {total} ta yozuv, sahifada {transformers.length} ta ko'rinmoqda</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Oldingi</button>
            <span className="px-2">{page} / {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Keyingi</button>
          </div>
        </div>
      </div>
    </div>
  );
}