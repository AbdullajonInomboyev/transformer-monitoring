import { useEffect, useState } from 'react';
import { regionsApi, districtsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Globe, Plus, Edit, Trash2, MapPin, X } from 'lucide-react';
import PolygonDrawer from '@/components/map/PolygonDrawer';

export default function RegionsPage() {
  const { user } = useAuthStore();
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtPage, setDistrictPage] = useState(1);
  const [districtTotal, setDistrictTotal] = useState(0);
  const [polygonRegion, setPolygonRegion] = useState<any>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editRegion, setEditRegion] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', population: 0, areaKm2: 0, description: '' });

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => { loadRegions(); loadDistricts(); }, []);
  useEffect(() => { loadDistricts(); }, [districtPage]);

  const loadRegions = async () => {
    try { const r = await regionsApi.list({ limit: 20 }); setRegions(r.data.data); } catch {}
    finally { setLoading(false); }
  };
  const loadDistricts = async () => {
    try { const r = await districtsApi.list({ page: districtPage, limit: 10 }); setDistricts(r.data.data); setDistrictTotal(r.data.pagination.total); } catch {}
  };

  const openCreate = () => { setForm({ name: '', code: '', population: 0, areaKm2: 0, description: '' }); setModal('create'); };
  const openEdit = (r: any) => { setEditRegion(r); setForm({ name: r.name, code: r.code, population: r.population, areaKm2: r.areaKm2, description: r.description || '' }); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, population: Number(form.population), areaKm2: Number(form.areaKm2) };
      if (modal === 'create') await regionsApi.create(data);
      else await regionsApi.update(editRegion.id, data);
      setModal(null); loadRegions();
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" viloyatini o'chirishni tasdiqlaysizmi?`)) return;
    try { await regionsApi.delete(id); loadRegions(); } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
  };

  const savePolygon = async (coords: number[][]) => {
    if (!polygonRegion) return;
    try {
      await regionsApi.update(polygonRegion.id, { polygonCoords: coords });
      alert("Hudud chegarasi saqlandi!");
      loadRegions();
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
  };

  const totalPop = regions.reduce((s, r) => s + (r.population || 0), 0);
  const totalArea = regions.reduce((s, r) => s + (r.areaKm2 || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hududlar Boshqaruvi</h1>
          <p className="text-sm text-gray-500">Viloyat va tumanlarni boshqarish, xaritada chegara chizish</p>
        </div>
        {isAdmin && <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Yangi Viloyat</button>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Jami viloyatlar" value={regions.length} icon={<Globe className="w-5 h-5 text-gray-400" />} />
        <Stat label="Jami aholi" value={totalPop.toLocaleString()} />
        <Stat label="Jami maydon" value={`${totalArea.toLocaleString()} km²`} />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden mb-8">
        <div className="p-4 border-b"><h2 className="font-semibold">Viloyatlar ro'yxati</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Nomi</th>
                <th className="px-4 py-3 text-left">Kod</th>
                <th className="px-4 py-3 text-left">Aholi soni</th>
                <th className="px-4 py-3 text-left">Maydon</th>
                <th className="px-4 py-3 text-left">Tumanlar</th>
                <th className="px-4 py-3 text-left">Chegara</th>
                {isAdmin && <th className="px-4 py-3 text-left">Amallar</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {regions.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.code}</td>
                  <td className="px-4 py-3">{r.population?.toLocaleString()}</td>
                  <td className="px-4 py-3">{r.areaKm2} km²</td>
                  <td className="px-4 py-3">{r._count?.districts || 0}</td>
                  <td className="px-4 py-3">
                    {r.polygonCoords ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Belgilangan
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPolygonRegion(r)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                          title="Chegara chizish"
                        >
                          <MapPin className="w-3.5 h-3.5" /> {r.polygonCoords ? 'Tahrirlash' : 'Chegara'}
                        </button>
                        <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r.id, r.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Tumanlar ro'yxati</h2>
          <p className="text-sm text-gray-500">Jami {districtTotal} ta tuman</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Viloyat</th>
                <th className="px-4 py-3 text-left">Tuman nomi</th>
                <th className="px-4 py-3 text-left">Kod</th>
                <th className="px-4 py-3 text-left">Aholi soni</th>
                <th className="px-4 py-3 text-left">Maydon</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {districts.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase">{d.region?.code}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">{d.code}</td>
                  <td className="px-4 py-3">{d.population?.toLocaleString()}</td>
                  <td className="px-4 py-3">{d.areaKm2} km²</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Jami {districtTotal} ta</span>
          <div className="flex gap-2">
            <button disabled={districtPage <= 1} onClick={() => setDistrictPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button>
            <span>{districtPage} / {Math.ceil(districtTotal / 10) || 1}</span>
            <button disabled={districtPage >= Math.ceil(districtTotal / 10)} onClick={() => setDistrictPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button>
          </div>
        </div>
      </div>

      {/* Polygon drawer modal */}
      <PolygonDrawer
        isOpen={!!polygonRegion}
        onClose={() => setPolygonRegion(null)}
        onSave={savePolygon}
        initialPolygon={polygonRegion?.polygonCoords}
        regionName={polygonRegion?.name}
      />

      {/* Yaratish/tahrirlash modali */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{modal === 'create' ? 'Yangi Viloyat' : `Tahrirlash: ${editRegion?.name}`}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kod *</label>
                  <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} required placeholder="TK, NM, SM..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aholi soni</label>
                  <input type="number" value={form.population} onChange={e => setForm(f => ({...f, population: Number(e.target.value)}))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maydon (km²)</label>
                  <input type="number" step="0.01" value={form.areaKm2} onChange={e => setForm(f => ({...f, areaKm2: Number(e.target.value)}))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '...' : modal === 'create' ? 'Yaratish' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: any) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between"><span className="text-sm text-gray-500">{label}</span>{icon}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
