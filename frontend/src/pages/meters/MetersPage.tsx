import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { metersApi, transformersApi, regionsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Plus, Search, Filter, Download, X, Gauge, Camera, Trash2, Edit, ArrowUpDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const photoUrl = (url?: string) => {
  if (!url) return '';
  // base64 (data:image/...) yoki to'liq http manzil — to'g'ridan-to'g'ri ishlatiladi
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  // eski, serverga saqlangan rasmlar uchun (orqaga moslik)
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  return base ? base + url : url;
};

// Rasmni base64'ga o'giradi va kerak bo'lsa siqadi (baza kichik bo'lishi uchun)
const fileToCompressedBase64 = (file: File, maxSize = 1200, quality = 0.75): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const MAX_PHOTOS = 5;

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Faol', INACTIVE: 'Nofaol', BROKEN: 'Buzilgan', REPLACED: 'Almashtirilgan' };
const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  BROKEN: 'bg-red-100 text-red-700',
  REPLACED: 'bg-amber-100 text-amber-700',
};
const TYPE_LABELS: Record<string, string> = { SINGLE_PHASE: 'Bir fazali', THREE_PHASE: 'Uch fazali', BALANCE: 'Balans hisoblagich' };

const emptyForm = {
  meterNumber: '', transformerId: '', ownerName: '', address: '', phone: '',
  meterType: 'SINGLE_PHASE', meterModel: '', status: 'ACTIVE', sealNumber: '',
  tariff: '', installationDate: '', lastReading: '', notes: '', photoUrl: '', photos: [] as string[],
};

export default function MetersPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [meters, setMeters] = useState<any[]>([]);
  const [transformers, setTransformers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '', transformerId: searchParams.get('transformerId') || '', regionId: '', status: '', meterType: '',
    minReading: '', maxReading: '', installedFrom: '', installedTo: '', hasPhoto: '',
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editMeter, setEditMeter] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const limit = 10;
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { load(); }, [page, filters, sortBy, sortDir]);

  const loadRefs = async () => {
    try {
      const [t, r] = await Promise.all([
        transformersApi.list({ page: 1, limit: 1000 }),
        regionsApi.all(),
      ]);
      setTransformers(t.data.data);
      setRegions(r.data.data);
    } catch {}
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await metersApi.list({ page, limit, sortBy, sortDir, ...filters });
      setMeters(res.data.data);
      setTotal(res.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };

  const setFilter = (key: string, value: string) => { setPage(1); setFilters(f => ({ ...f, [key]: value })); };
  const clearFilters = () => { setPage(1); setFilters({ search: '', transformerId: '', regionId: '', status: '', meterType: '', minReading: '', maxReading: '', installedFrom: '', installedTo: '', hasPhoto: '' }); };
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  // ============ RASM YUKLASH (base64) ============
  // Rasmlar to'g'ridan-to'g'ri form.photos ichida base64 sifatida saqlanadi
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const current = form.photos || [];
    const freeSlots = MAX_PHOTOS - current.length;
    if (freeSlots <= 0) {
      toast.error(`Ko'pi bilan ${MAX_PHOTOS} ta rasm qo'shish mumkin`);
      return;
    }
    const tanlangan = files.slice(0, freeSlots);
    if (files.length > freeSlots) {
      toast(`Faqat ${freeSlots} ta rasm qo'shildi (jami ${MAX_PHOTOS} tagacha)`);
    }

    try {
      const base64List = await Promise.all(tanlangan.map(f => fileToCompressedBase64(f)));
      setForm((f: any) => ({ ...f, photos: [...(f.photos || []), ...base64List] }));
    } catch {
      toast.error('Rasmni o\'qishda xatolik');
    }
  };

  const removePhoto = (idx: number) => {
    setForm((f: any) => ({ ...f, photos: (f.photos || []).filter((_: any, i: number) => i !== idx) }));
  };

  // ============ CRUD ============
  const openCreate = () => {
    setForm({ ...emptyForm, transformerId: filters.transformerId || '' });
    setEditMeter(null); setModal('create');
  };
  const openEdit = (m: any) => {
    setEditMeter(m);
    const photos = Array.isArray(m.photos) ? m.photos : (m.photoUrl ? [m.photoUrl] : []);
    setForm({
      meterNumber: m.meterNumber, transformerId: m.transformerId, ownerName: m.ownerName,
      address: m.address || '', phone: m.phone || '', meterType: m.meterType, meterModel: m.meterModel || '',
      status: m.status, sealNumber: m.sealNumber || '', tariff: m.tariff ?? '',
      installationDate: m.installationDate ? m.installationDate.slice(0, 10) : '',
      lastReading: m.lastReading ?? '', notes: m.notes || '', photoUrl: m.photoUrl || '', photos,
    });
    setModal('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const allPhotos: string[] = form.photos || [];
      const data: any = {
        meterNumber: form.meterNumber.trim(),
        transformerId: form.transformerId,
        ownerName: form.ownerName.trim(),
        address: form.address || null,
        phone: form.phone || null,
        meterType: form.meterType,
        meterModel: form.meterModel || null,
        status: form.status,
        sealNumber: form.sealNumber || null,
        tariff: form.tariff !== '' ? parseFloat(form.tariff) : null,
        installationDate: form.installationDate || null,
        lastReading: form.lastReading !== '' ? parseFloat(form.lastReading) : null,
        notes: form.notes || null,
        photoUrl: allPhotos[0] || null,
        photos: allPhotos,
      };
      if (modal === 'create') {
        await metersApi.create(data);
        toast.success('Hisoblagich yaratildi');
      } else {
        await metersApi.update(editMeter.id, data);
        toast.success('Hisoblagich yangilandi');
      }
      setModal(null); load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setSaving(false); }
  };

  const handleDelete = async (m: any) => {
    if (!confirm(`"${m.meterNumber}" hisoblagichini o'chirishni tasdiqlaysizmi?`)) return;
    try { await metersApi.delete(m.id); toast.success("O'chirildi"); load(); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  // ============ CSV EKSPORT ============
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await metersApi.list({ page: 1, limit: 10000, sortBy, sortDir, ...filters });
      const rows = res.data.data;
      const headers = ['Hisoblagich №', 'Egasi', 'Manzil', 'Telefon', 'Turi', 'Model', 'Holat', 'Plomba №', 'Tarif', "O'rnatilgan", "Oxirgi ko'rsatkich", "Ko'rsatkich sanasi", 'Transformator', 'Viloyat', 'Tuman', 'Izoh'];
      const csvRows = rows.map((m: any) => [
        m.meterNumber, m.ownerName, m.address || '', m.phone || '', TYPE_LABELS[m.meterType] || m.meterType,
        m.meterModel || '', STATUS_LABELS[m.status] || m.status, m.sealNumber || '', m.tariff ?? '',
        m.installationDate ? m.installationDate.slice(0, 10) : '',
        m.lastReading ?? '', m.lastReadingDate ? m.lastReadingDate.slice(0, 10) : '',
        m.transformer?.inventoryNumber || '', m.transformer?.region?.name || '', m.transformer?.district?.name || '',
        m.notes || '',
      ]);
      const csv = [headers.join(';'), ...csvRows.map((r: any[]) => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hisoblagichlar_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Eksport xatolik'); } finally { setExporting(false); }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const SortHeader = ({ field, children }: any) => (
    <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className={`w-3 h-3 ${sortBy === field ? 'text-blue-600' : 'text-gray-300'}`} /></span>
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><Gauge className="w-6 h-6 text-blue-600" /> Hisoblagichlar</h1>
          <p className="text-xs md:text-sm text-gray-500">Xonadon hisoblagichlari — jami {total} ta</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1 px-2 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">CSV</span>
          </button>
          {!isReadOnly && (
            <button onClick={openCreate} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Yangi hisoblagich
            </button>
          )}
        </div>
      </div>

      {/* Qidiruv + filtr paneli */}
      <div className="bg-white rounded-xl border p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              placeholder="Raqam, egasi, manzil, telefon, plomba, transformator..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-1 px-3 py-2 border rounded-lg text-sm ${showFilters || activeFilterCount > 1 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filtrlar</span>
            {activeFilterCount > 0 && <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-3 pt-3 border-t">
            <select value={filters.transformerId} onChange={e => setFilter('transformerId', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Barcha transformatorlar</option>
              {transformers.map(t => <option key={t.id} value={t.id}>{t.inventoryNumber}</option>)}
            </select>
            {user?.role === 'ADMIN' && (
              <select value={filters.regionId} onChange={e => setFilter('regionId', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
                <option value="">Barcha viloyatlar</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Barcha holatlar</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filters.meterType} onChange={e => setFilter('meterType', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Barcha turlar</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filters.hasPhoto} onChange={e => setFilter('hasPhoto', e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
              <option value="">Rasm: hammasi</option>
              <option value="true">Rasmi bor</option>
              <option value="false">Rasmi yo'q</option>
            </select>
            <input type="number" value={filters.minReading} onChange={e => setFilter('minReading', e.target.value)} placeholder="Min ko'rsatkich" className="px-2 py-1.5 border rounded-lg text-xs" />
            <input type="number" value={filters.maxReading} onChange={e => setFilter('maxReading', e.target.value)} placeholder="Max ko'rsatkich" className="px-2 py-1.5 border rounded-lg text-xs" />
            <div className="flex items-center gap-1"><span className="text-xs text-gray-400">Dan:</span><input type="date" value={filters.installedFrom} onChange={e => setFilter('installedFrom', e.target.value)} className="flex-1 px-2 py-1.5 border rounded-lg text-xs" /></div>
            <div className="flex items-center gap-1"><span className="text-xs text-gray-400">Gacha:</span><input type="date" value={filters.installedTo} onChange={e => setFilter('installedTo', e.target.value)} className="flex-1 px-2 py-1.5 border rounded-lg text-xs" /></div>
            <button onClick={clearFilters} className="flex items-center justify-center gap-1 px-2 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50"><X className="w-3 h-3" /> Tozalash</button>
          </div>
        )}
      </div>

      {/* Mobil kartochkalar */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="text-center text-gray-400 py-8">Yuklanmoqda...</div>
        : meters.length === 0 ? <div className="text-center text-gray-400 py-8">Hisoblagichlar topilmadi</div>
        : meters.map(m => (
          <div key={m.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start gap-3 mb-2">
              {m.photoUrl
                ? <img src={photoUrl(m.photoUrl)} className="w-14 h-14 rounded-lg object-cover border" />
                : <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center"><Gauge className="w-6 h-6 text-blue-400" /></div>}
              <div className="min-w-0 flex-1">
                <Link to={`/meters/${m.id}`} className="font-semibold text-blue-700">{m.meterNumber}</Link>
                <div className="text-sm truncate">{m.ownerName}</div>
                <div className="text-xs text-gray-500 truncate">{m.address || '—'}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Transformator: {m.transformer?.inventoryNumber || '—'}</div>
              <div>Oxirgi ko'rsatkich: {m.lastReading ?? '—'} {m.lastReadingDate ? `(${new Date(m.lastReadingDate).toLocaleDateString('uz')})` : ''}</div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Link to={`/meters/${m.id}`} className="flex-1 py-1.5 text-center text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">Batafsil</Link>
              {!isReadOnly && (<>
                <button onClick={() => openEdit(m)} className="py-1.5 px-3 text-xs border rounded-lg hover:bg-gray-50"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(m)} className="py-1.5 px-3 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </>)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop jadval */}
      <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rasm</th>
              <SortHeader field="meterNumber">Hisoblagich №</SortHeader>
              <SortHeader field="ownerName">Egasi</SortHeader>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Manzil</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Transformator</th>
              <SortHeader field="meterType">Turi</SortHeader>
              <SortHeader field="lastReading">Ko'rsatkich</SortHeader>
              <SortHeader field="status">Holat</SortHeader>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
            </tr></thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
              : meters.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Hisoblagichlar topilmadi</td></tr>
              : meters.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {m.photoUrl
                      ? <img src={photoUrl(m.photoUrl)} className="w-10 h-10 rounded-lg object-cover border" />
                      : <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Gauge className="w-4 h-4 text-blue-400" /></div>}
                  </td>
                  <td className="px-4 py-2"><Link to={`/meters/${m.id}`} className="font-medium text-blue-700 hover:underline">{m.meterNumber}</Link></td>
                  <td className="px-4 py-2">{m.ownerName}</td>
                  <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">{m.address || '—'}</td>
                  <td className="px-4 py-2"><Link to={`/transformers/${m.transformerId}`} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">{m.transformer?.inventoryNumber}</Link></td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{TYPE_LABELS[m.meterType]}</td>
                  <td className="px-4 py-2">{m.lastReading ?? '—'}{m.lastReadingDate && <div className="text-xs text-gray-400">{new Date(m.lastReadingDate).toLocaleDateString('uz')}</div>}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[m.status]}`}>{STATUS_LABELS[m.status]}</span></td>
                  <td className="px-4 py-2"><div className="flex items-center gap-1">
                    <Link to={`/meters/${m.id}`} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></Link>
                    {!isReadOnly && (<>
                      <button onClick={() => openEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </>)}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Jami {total} ta</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button>
            <span>{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button>
          </div>
        </div>
      </div>

      {/* Mobil pagination */}
      <div className="md:hidden flex items-center justify-between mt-3 text-sm text-gray-500">
        <span>Jami {total} ta</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">Oldingi</button>
          <span className="text-xs">{page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">Keyingi</button>
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">{modal === 'create' ? 'Yangi hisoblagich' : `Tahrirlash: ${editMeter?.meterNumber}`}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rasmlar */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Hisoblagich rasmlari <span className="text-gray-400 font-normal">({(form.photos || []).length}/{MAX_PHOTOS})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(form.photos || []).map((src: string, i: number) => (
                    <div key={i} className="relative">
                      <img src={photoUrl(src)} className="w-20 h-20 rounded-lg object-cover border" />
                      <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {(form.photos || []).length < MAX_PHOTOS && (
                    <div className="flex flex-col gap-1">
                      <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500">
                        <Camera className="w-5 h-5" /><span className="text-[10px] mt-1">Galereya</span>
                        <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                      </label>
                      <label className="text-[10px] text-center text-blue-500 cursor-pointer hover:underline">
                        Kamera
                        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Ko'pi bilan {MAX_PHOTOS} ta rasm. "Galereya" orqali bir martada bir nechta rasm tanlash mumkin.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Hisoblagich raqami *</label><input value={form.meterNumber} onChange={e => setForm((f: any) => ({ ...f, meterNumber: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Transformator *</label>
                  <select value={form.transformerId} onChange={e => setForm((f: any) => ({ ...f, transformerId: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Tanlang...</option>
                    {transformers.map(t => <option key={t.id} value={t.id}>{t.inventoryNumber} {t.networkName ? `(${t.networkName})` : ''}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Egasi (F.I.Sh.) *</label><input value={form.ownerName} onChange={e => setForm((f: any) => ({ ...f, ownerName: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label><input value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+998..." className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Manzil</label><input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Turi</label>
                  <select value={form.meterType} onChange={e => setForm((f: any) => ({ ...f, meterType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Holat</label>
                  <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Model</label><input value={form.meterModel} onChange={e => setForm((f: any) => ({ ...f, meterModel: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Plomba №</label><input value={form.sealNumber} onChange={e => setForm((f: any) => ({ ...f, sealNumber: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">O'rnatilgan sana</label><input type="date" value={form.installationDate} onChange={e => setForm((f: any) => ({ ...f, installationDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Oxirgi ko'rsatkich</label><input type="number" step="0.01" value={form.lastReading} onChange={e => setForm((f: any) => ({ ...f, lastReading: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tarif (so'm/kVt·s)</label><input type="number" step="0.01" value={form.tariff} onChange={e => setForm((f: any) => ({ ...f, tariff: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Izoh</label><textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="flex gap-3 pt-3 border-t">
                <button type="button" onClick={() => setModal(null)} className="flex-1 sm:flex-none px-4 py-2.5 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saqlanmoqda...' : modal === 'create' ? 'Yaratish' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}