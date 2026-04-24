import { useEffect, useState } from 'react';
import { substationsApi, regionsApi, districtsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Building2, Plus, Eye, Edit, Trash2, Download, Upload, X, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '',
  code: '',
  regionId: '',
  districtId: '',
  address: '',
  latitude: '',
  longitude: '',
  commissionedDate: '',
  transformerCapacities: [{ kva: '' }],
  notes: '',
};

export default function SubstationsPage() {
  const { user } = useAuthStore();
  const [substations, setSubstations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filterRegionId, setFilterRegionId] = useState('');
  const [search, setSearch] = useState('');

  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { loadRegions(); }, []);
  useEffect(() => { load(); }, [page, filterRegionId, search]);
  useEffect(() => {
    if (form.regionId) {
      districtsApi.byRegion(form.regionId).then(r => setDistricts(r.data.data || [])).catch(() => setDistricts([]));
    } else { setDistricts([]); }
  }, [form.regionId]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (filterRegionId) params.regionId = filterRegionId;
      if (search) params.search = search;
      const r = await substationsApi.list(params);
      setSubstations(r.data.data);
      setTotal(r.data.pagination.total);
    } catch { toast.error('Yuklab bo\'lmadi'); }
    finally { setLoading(false); }
  };

  const loadRegions = async () => {
    try { const r = await regionsApi.all(); setRegions(r.data.data || []); } catch {}
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, transformerCapacities: [{ kva: '' }] });
    setSelected(null);
    setModal('create');
  };

  const openEdit = (s: any) => {
    setSelected(s);
    const caps = s.transformerCapacities && Array.isArray(s.transformerCapacities) && s.transformerCapacities.length > 0
      ? s.transformerCapacities : [{ kva: '' }];
    setForm({
      name: s.name || '',
      code: s.code || '',
      regionId: s.regionId || '',
      districtId: s.districtId || '',
      address: s.address || '',
      latitude: s.latitude || '',
      longitude: s.longitude || '',
      commissionedDate: s.commissionedDate ? s.commissionedDate.slice(0, 10) : '',
      transformerCapacities: caps,
      notes: s.notes || '',
    });
    setModal('edit');
  };

  const openView = async (s: any) => {
    try { const r = await substationsApi.get(s.id); setSelected(r.data.data); } catch { setSelected(s); }
    setModal('view');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const caps = (form.transformerCapacities || []).filter((c: any) => c.kva && String(c.kva).trim() !== '');
      const data: any = {
        name: form.name,
        code: form.code,
        regionId: form.regionId,
        districtId: form.districtId || null,
        address: form.address || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        commissionedDate: form.commissionedDate || undefined,
        transformerCapacities: caps.length > 0 ? caps.map((c: any) => ({ kva: Number(c.kva) })) : null,
        notes: form.notes || undefined,
      };

      if (modal === 'create') {
        await substationsApi.create(data);
        toast.success('Podstansiya qo\'shildi');
      } else if (modal === 'edit' && selected) {
        await substationsApi.update(selected.id, data);
        toast.success('Podstansiya yangilandi');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setSaving(false); }
  };

  const handleDelete = async (s: any) => {
    if (!confirm(`"${s.name}" podstansiyasini o'chirishni tasdiqlaysizmi?`)) return;
    setDeleting(s.id);
    try { await substationsApi.delete(s.id); toast.success('Podstansiya o\'chirildi'); load(); }
    catch (err: any) { toast.error(err.response?.data?.error || 'O\'chirib bo\'lmadi'); }
    finally { setDeleting(null); }
  };

  // Transformer capacities management
  const addCapacity = () => {
    setForm((f: any) => ({ ...f, transformerCapacities: [...(f.transformerCapacities || []), { kva: '' }] }));
  };
  const updateCapacity = (index: number, value: string) => {
    setForm((f: any) => {
      const caps = [...(f.transformerCapacities || [])];
      caps[index] = { kva: value };
      return { ...f, transformerCapacities: caps };
    });
  };
  const removeCapacity = (index: number) => {
    setForm((f: any) => ({
      ...f,
      transformerCapacities: (f.transformerCapacities || []).filter((_: any, i: number) => i !== index),
    }));
  };

  // CSV Export
  const handleExport = () => {
    const headers = ['Nomi', 'kV', 'Hudud', 'Tuman', 'Manzil', 'Lat', 'Lng', 'Transformatorlar soni'];
    const rows = substations.map(s => [
      s.name, s.code, s.region?.name || '', s.district?.name || '', s.address || '',
      s.latitude || '', s.longitude || '', s._count?.transformers || 0,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `podstansiyalar_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Podstansiyalar Boshqaruvi</h1>
          <p className="text-sm text-gray-500">Hududlar bo'yicha podstansiyalarni qo'shish, tahrirlash va kuzatish</p>
        </div>
        {!isReadOnly && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Yangi Podstansiya
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-5">
          <span className="text-sm text-red-500">Jami podstansiya</span>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <span className="text-sm text-gray-500">Hududlar</span>
          <div className="text-2xl font-bold mt-1">{regions.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <span className="text-sm text-gray-500">Filtrlangan</span>
          <div className="text-2xl font-bold mt-1">{substations.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <span className="text-sm text-gray-500">Sahifa</span>
          <div className="text-2xl font-bold mt-1">{page} / {Math.ceil(total / 10) || 1}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Nom yoki kV bo'yicha qidirish..."
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 w-64" />
        <select value={filterRegionId} onChange={e => { setFilterRegionId(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Barcha hududlar</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Podstansiyalar ro'yxati
          </h2>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 border rounded text-xs hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> CSV export
            </button>
            <label className="flex items-center gap-1 px-3 py-1.5 border rounded text-xs hover:bg-gray-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> CSV import
              <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                // Simple import placeholder
                toast.success('CSV import tez orada qo\'shiladi');
              }} />
            </label>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">kV</th>
              <th className="px-4 py-3 text-left">Nomi</th>
              <th className="px-4 py-3 text-left">Hudud</th>
              <th className="px-4 py-3 text-left">Tuman</th>
              <th className="px-4 py-3 text-left">Transformatorlar</th>
              <th className="px-4 py-3 text-left">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : substations.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Ma'lumot topilmadi</td></tr>
            ) : substations.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.code}</td>
                <td className="px-4 py-3 text-blue-600">{s.name}</td>
                <td className="px-4 py-3">{s.region?.name || '—'}</td>
                <td className="px-4 py-3">{s.district?.name || '—'}</td>
                <td className="px-4 py-3">{s._count?.transformers || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openView(s)} className="text-blue-600 text-xs flex items-center gap-0.5 hover:underline">
                      <Eye className="w-3.5 h-3.5" /> Ko'rish
                    </button>
                    {!isReadOnly && (
                      <>
                        <button onClick={() => openEdit(s)} className="text-green-600 text-xs flex items-center gap-0.5 hover:underline">
                          <Edit className="w-3.5 h-3.5" /> Tahrirlash
                        </button>
                        <button onClick={() => handleDelete(s)} disabled={deleting === s.id}
                          className="text-red-600 text-xs flex items-center gap-0.5 hover:underline disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" /> {deleting === s.id ? '...' : 'O\'chirish'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Jami {total} ta</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button>
            <span>{page} / {Math.ceil(total / 10) || 1}</span>
            <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button>
          </div>
        </div>
      </div>

      {/* ===== CREATE / EDIT MODAL ===== */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
                {modal === 'create' ? 'Yangi Podstansiya' : `Tahrirlash: ${selected?.name}`}
              </h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                  <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                    required className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PS-110 Samarqand" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">kVolt *</label>
                  <input value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))}
                    required placeholder="110/10"
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hudud *</label>
                  <select value={form.regionId} onChange={e => setForm((f: any) => ({ ...f, regionId: e.target.value, districtId: '' }))}
                    required className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Tanlang...</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tuman</label>
                  <select value={form.districtId} onChange={e => setForm((f: any) => ({ ...f, districtId: e.target.value }))}
                    disabled={!form.regionId}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                    <option value="">Tanlang...</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Manzil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ko'cha, mahalla..." />
              </div>

              {/* Lokatsiya */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input type="number" step="any" value={form.latitude}
                    onChange={e => setForm((f: any) => ({ ...f, latitude: e.target.value }))}
                    placeholder="41.2995"
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input type="number" step="any" value={form.longitude}
                    onChange={e => setForm((f: any) => ({ ...f, longitude: e.target.value }))}
                    placeholder="69.2401"
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Transformator quvvatlari */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transformator quvvati (kVA)</label>
                {(form.transformerCapacities || []).map((cap: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input type="number" value={cap.kva} onChange={e => updateCapacity(i, e.target.value)}
                      placeholder="Masalan: 630"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-xs text-gray-500">kVA</span>
                    {(form.transformerCapacities || []).length > 1 && (
                      <button type="button" onClick={() => removeCapacity(i)} className="text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addCapacity} className="text-xs text-blue-600 hover:underline">
                  + Quvvat qo'shish
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ishga tushirilgan sana</label>
                <input type="date" value={form.commissionedDate}
                  onChange={e => setForm((f: any) => ({ ...f, commissionedDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Bekor</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saqlanmoqda...' : modal === 'create' ? 'Yaratish' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== VIEW MODAL ===== */}
      {modal === 'view' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> {selected.name}
              </h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="kV" value={selected.code} />
              <Row label="Hudud" value={selected.region?.name || '—'} />
              <Row label="Tuman" value={selected.district?.name || '—'} />
              <Row label="Manzil" value={selected.address || '—'} />
              {(selected.latitude || selected.longitude) && (
                <Row label="Lokatsiya" value={`${selected.latitude || '—'}, ${selected.longitude || '—'}`} />
              )}
              <Row label="Ishga tushirilgan" value={selected.commissionedDate ? new Date(selected.commissionedDate).toLocaleDateString('uz-UZ') : '—'} />
              {selected.transformerCapacities && Array.isArray(selected.transformerCapacities) && selected.transformerCapacities.length > 0 && (
                <Row label="TR quvvatlari" value={selected.transformerCapacities.map((c: any) => `${c.kva} kVA`).join(', ')} />
              )}
              <Row label="Transformatorlar soni" value={selected.transformers?.length ?? selected._count?.transformers ?? 0} />
              {selected.notes && <Row label="Izoh" value={selected.notes} />}
            </div>

            {selected.transformers && selected.transformers.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 border-b">Transformatorlar</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Inv. №</th>
                      <th className="px-3 py-2 text-left">Holat</th>
                      <th className="px-3 py-2 text-left">Quvvat (kVA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selected.transformers.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{t.inventoryNumber}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            t.status === 'OPERATIONAL' ? 'bg-green-100 text-green-700' :
                            t.status === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
                            t.status === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{t.status}</span>
                        </td>
                        <td className="px-3 py-2">{t.capacityKva}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              {!isReadOnly && (
                <button onClick={() => { closeModal(); setTimeout(() => openEdit(selected), 100); }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-green-500 text-green-600 rounded-lg text-sm hover:bg-green-50">
                  <Edit className="w-3.5 h-3.5" /> Tahrirlash
                </button>
              )}
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-500 w-40 shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}