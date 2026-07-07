import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transformersApi, regionsApi, districtsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Plus, Search, Filter, Download, Upload, Trash2, Edit, X, Zap, ArrowUpDown } from 'lucide-react';

const photoUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  return base ? base + url : url;
};

const STATUS_CLS: Record<string, string> = { OPERATIONAL: 'bg-green-100 text-green-700', WARNING: 'bg-yellow-100 text-yellow-700', CRITICAL: 'bg-red-100 text-red-700', OFFLINE: 'bg-gray-100 text-gray-600' };
const STATUS_LABELS: Record<string, string> = { OPERATIONAL: 'Ishlayapti', WARNING: 'Ogohlantirish', CRITICAL: 'Kritik', OFFLINE: "O'chgan" };
const RISK_LABELS: Record<string, string> = { LOW: 'Past', MEDIUM: "O'rta", HIGH: 'Yuqori', CRITICAL: 'Kritik' };
const AREA_TYPES = ['ETK tasarrufidagi', "Yuridik iste'molchi", 'Byudjet'];

export default function TransformersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [transformers, setTransformers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '', regionId: '', districtId: '', status: '', areaType: '', riskLevel: '',
    minKva: '', maxKva: '', hasPhoto: '',
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const limit = 10;
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { loadRegions(); }, []);
  useEffect(() => { if (filters.regionId) districtsApi.byRegion(filters.regionId).then(r => setDistricts(r.data.data)).catch(() => setDistricts([])); else setDistricts([]); }, [filters.regionId]);
  useEffect(() => { loadTransformers(); }, [page, filters, sortBy, sortDir]);

  const loadRegions = async () => { try { const res = await regionsApi.all(); setRegions(res.data.data); } catch {} };
  const loadTransformers = async () => {
    setLoading(true);
    try {
      const res = await transformersApi.list({ page, limit, sortBy, sortDir, ...filters });
      setTransformers(res.data.data); setTotal(res.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };
  const handleDelete = async (id: string) => { if (!confirm("O'chirishni tasdiqlaysizmi?")) return; try { await transformersApi.delete(id); loadTransformers(); } catch (e: any) { alert(e.response?.data?.error || 'Xatolik'); } };

  const setFilter = (key: string, value: string) => { setPage(1); setFilters(f => ({ ...f, [key]: value })); };
  const clearFilters = () => { setPage(1); setFilters({ search: '', regionId: '', districtId: '', status: '', areaType: '', riskLevel: '', minKva: '', maxKva: '', hasPhoto: '' }); };
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await transformersApi.list({ page: 1, limit: 10000, sortBy, sortDir, ...filters });
      const allData = res.data.data;
      const headers = ['Inventar №', 'Model', 'Tarmoq nomi', 'Hudud', 'Tuman', 'Podstansiya', 'Tasarrufi', 'Aholi', 'Lat', 'Lng', 'Quvvat (kVA)', 'Salomatlik', 'Risk', 'Holat'];
      const rows = allData.map((t: any) => [t.inventoryNumber || '', t.model || '', t.networkName || '', t.region?.name || '', t.district?.name || '', t.substation?.name || '', t.areaType || '', t.estimatedPopulation || 0, t.latitude || '', t.longitude || '', t.capacityKva || '', t.healthScore ?? '', RISK_LABELS[t.riskLevel] || t.riskLevel || '', STATUS_LABELS[t.status] || t.status || '']);
      const csv = [headers.join(';'), ...rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `transformatorlar_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch { alert('Eksport xatolik'); } finally { setExporting(false); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string; const lines = text.split('\n').filter(l => l.trim()); if (lines.length < 2) return;
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim()); let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(sep).map(v => v.replace(/^"|"$/g, '').trim());
          const row: any = {}; headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
          try { await transformersApi.create({ inventoryNumber: row['Inventar №'] || `IMP-${Date.now()}-${i}`, model: row['Model'] || '', networkName: row['Tarmoq nomi'] || '', regionId: user?.regionId || '', latitude: parseFloat(row['Lat']) || 41.3, longitude: parseFloat(row['Lng']) || 69.3, capacityKva: parseInt(row['Quvvat (kVA)']) || 100, status: row['Holat'] || 'OPERATIONAL', areaType: row['Tasarrufi'] || '' }); imported++; } catch {}
        }
        alert(`${imported} ta import qilindi!`); loadTransformers();
      } catch { alert('CSV xatolik'); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const statusBadge = (status: string) => (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[status] || ''}`}>{STATUS_LABELS[status] || status}</span>
  );

  const SortHeader = ({ field, children }: any) => (
    <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className={`w-3 h-3 ${sortBy === field ? 'text-blue-600' : 'text-gray-300'}`} /></span>
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div><h1 className="text-xl md:text-2xl font-bold text-gray-800">Transformatorlar</h1><p className="text-xs md:text-sm text-gray-500">Jami {total} ta — boshqarish, filtrlash va monitoring</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1 px-2 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">CSV</span></button>
          {!isReadOnly && <label className="flex items-center gap-1 px-2 py-1.5 border rounded-lg text-xs hover:bg-gray-50 cursor-pointer"><Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import</span><input type="file" accept=".csv" onChange={handleImport} className="hidden" /></label>}
          {!isReadOnly && <Link to="/transformers/new" className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Yangi</Link>}
        </div>
      </div>

      {/* Qidiruv + filtrlar */}
      <div className="bg-white rounded-xl border p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Inventar №, model, tarmoq, manzil, ishlab chiqaruvchi..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-1 px-3 py-2 border rounded-lg text-sm ${showFilters || activeFilterCount > 1 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filtrlar</span>
            {activeFilterCount > 0 && <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3 pt-3 border-t">
            {user?.role === 'ADMIN' && (
              <select value={filters.regionId} onChange={e => { setFilter('regionId', e.target.value); setFilter('districtId', ''); }} className="px-2 py-1.5 border rounded-lg text-xs">
                <option value="">Barcha viloyatlar</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {filters.regionId && (
              <select value={filters.districtId} onChange={e => setFilter('districtId', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
                <option value="">Barcha tumanlar</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Barcha holatlar</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filters.riskLevel} onChange={e => setFilter('riskLevel', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Barcha risk darajalari</option>
              {Object.entries(RISK_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filters.areaType} onChange={e => setFilter('areaType', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Barcha tasarruf turlari</option>
              {AREA_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filters.hasPhoto} onChange={e => setFilter('hasPhoto', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Rasm: hammasi</option>
              <option value="true">Rasmi bor</option>
              <option value="false">Rasmi yo'q</option>
            </select>
            <input type="number" value={filters.minKva} onChange={e => setFilter('minKva', e.target.value)} placeholder="Min quvvat (kVA)" className="px-2 py-1.5 border rounded-lg text-xs" />
            <input type="number" value={filters.maxKva} onChange={e => setFilter('maxKva', e.target.value)} placeholder="Max quvvat (kVA)" className="px-2 py-1.5 border rounded-lg text-xs" />
            <button onClick={clearFilters} className="flex items-center justify-center gap-1 px-2 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50"><X className="w-3 h-3" /> Tozalash</button>
          </div>
        )}
      </div>

      {/* Mobil kartochkalar */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="text-center text-gray-400 py-8">Yuklanmoqda...</div>
        : transformers.length === 0 ? <div className="text-center text-gray-400 py-8">Transformator topilmadi</div>
        : transformers.map(t => (
          <div key={t.id} className="bg-white rounded-xl border p-4" onClick={() => navigate(`/transformers/${t.id}`)}>
            <div className="flex items-start gap-3">
              {t.photoUrl ? <img src={photoUrl(t.photoUrl)} className="w-14 h-14 rounded-lg object-cover border flex-shrink-0" />
              : <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><Zap className="w-6 h-6 text-blue-400" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600">{t.inventoryNumber}</span>
                  {statusBadge(t.status)}
                </div>
                <div className="text-sm text-gray-600 mt-1">{t.model || '—'} {t.networkName ? `• ${t.networkName}` : ''}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.region?.name} • {t.district?.name || t.substation?.name || '—'}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-blue-600 font-medium">{t.capacityKva} kVA</span>
                  {t.areaType && <span className="text-xs text-gray-400">{t.areaType}</span>}
                </div>
              </div>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t" onClick={e => e.stopPropagation()}>
                <button onClick={() => navigate(`/transformers/${t.id}/edit`)} className="flex-1 py-1.5 text-center text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">Tahrirlash</button>
                <button onClick={() => handleDelete(t.id)} className="py-1.5 px-3 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop jadval */}
      <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rasm</th>
              <SortHeader field="inventoryNumber">Inventar №</SortHeader>
              <SortHeader field="model">Model</SortHeader>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tarmoq nomi</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Hudud / Tuman</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tasarrufi</th>
              <SortHeader field="capacityKva">Quvvat</SortHeader>
              <SortHeader field="status">Holat</SortHeader>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
            </tr></thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400"><div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              : transformers.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Transformator topilmadi</td></tr>
              : transformers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/transformers/${t.id}`)}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>{t.photoUrl ? <img src={photoUrl(t.photoUrl)} className="w-10 h-10 rounded-lg object-cover border" /> : <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Zap className="w-4 h-4 text-blue-400" /></div>}</td>
                  <td className="px-4 py-3 font-medium text-blue-600">{t.inventoryNumber}</td>
                  <td className="px-4 py-3">{t.model || '—'}</td>
                  <td className="px-4 py-3">{t.networkName || '—'}</td>
                  <td className="px-4 py-3"><div className="font-medium">{t.region?.name}</div><div className="text-xs text-gray-500">{t.district?.name || t.substation?.name || '—'}</div></td>
                  <td className="px-4 py-3 text-xs">{t.areaType || '—'}</td>
                  <td className="px-4 py-3"><span className="text-blue-600 font-medium">{t.capacityKva} kVA</span></td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><div className="flex items-center gap-2">{!isReadOnly && (<><button onClick={() => navigate(`/transformers/${t.id}/edit`)} className="text-blue-500 hover:text-blue-700"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm"><span className="text-gray-500">Jami {total} ta</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button><span>{page}/{totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button></div></div>
      </div>

      {/* Mobil pagination */}
      <div className="md:hidden flex items-center justify-between mt-3 text-sm text-gray-500">
        <span>Jami {total} ta</span>
        <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">Oldingi</button><span className="text-xs">{page}/{totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">Keyingi</button></div>
      </div>
    </div>
  );
}