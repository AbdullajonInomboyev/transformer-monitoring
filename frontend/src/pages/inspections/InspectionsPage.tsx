import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inspectionsApi, transformersApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Plus, Search, X, ClipboardCheck, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const RESULT_LABELS: Record<string, string> = { PASS: "O'tdi", FAIL: "O'tmadi", NEEDS_REPAIR: "Ta'mir kerak" };
const RESULT_CLS: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  FAIL: 'bg-red-100 text-red-700',
  NEEDS_REPAIR: 'bg-amber-100 text-amber-700',
};

const emptyForm = { transformerId: '', inspectionDate: new Date().toISOString().slice(0, 10), findings: '', result: 'PASS' };

export default function InspectionsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [transformers, setTransformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', result: '', dateFrom: '', dateTo: '' });
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const limit = 10;

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { load(); }, [page, filters]);

  const loadRefs = async () => { try { const t = await transformersApi.list({ page: 1, limit: 1000 }); setTransformers(t.data.data); } catch {} };
  const load = async () => {
    setLoading(true);
    try {
      const res = await inspectionsApi.list({ page, limit, ...filters });
      setItems(res.data.data); setTotal(res.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };

  const setFilter = (key: string, value: string) => { setPage(1); setFilters(f => ({ ...f, [key]: value })); };

  const openCreate = () => { setForm(emptyForm); setEditItem(null); setModal('create'); };
  const openEdit = (i: any) => {
    setEditItem(i);
    setForm({ transformerId: i.transformerId, inspectionDate: i.inspectionDate?.slice(0, 10), findings: i.findings || '', result: i.result });
    setModal('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, findings: form.findings || null };
      if (modal === 'create') { await inspectionsApi.create(data); toast.success('Tekshiruv qayd etildi'); }
      else { await inspectionsApi.update(editItem.id, data); toast.success('Yangilandi'); }
      setModal(null); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (i: any) => {
    if (!confirm("Tekshiruvni o'chirishni tasdiqlaysizmi?")) return;
    try { await inspectionsApi.delete(i.id); toast.success("O'chirildi"); load(); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  const canModify = (i: any) => user?.role === 'ADMIN' || i.inspector?.id === user?.id;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-blue-600" /> Tekshiruvlar</h1>
          <p className="text-xs md:text-sm text-gray-500">Transformator tekshiruvlari — jami {total} ta</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 w-full sm:w-auto">
          <Plus className="w-3.5 h-3.5" /> Yangi tekshiruv
        </button>
      </div>

      {/* Filtrlar */}
      <div className="bg-white rounded-xl border p-3 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Qidirish..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filters.result} onChange={e => setFilter('result', e.target.value)} className="px-2 py-2 border rounded-lg text-sm">
          <option value="">Barcha natijalar</option>
          {Object.entries(RESULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} className="px-2 py-2 border rounded-lg text-sm" />
        <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} className="px-2 py-2 border rounded-lg text-sm" />
      </div>

      {/* Mobil kartochkalar */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="text-center text-gray-400 py-8">Yuklanmoqda...</div>
        : items.length === 0 ? <div className="text-center text-gray-400 py-8">Tekshiruvlar topilmadi</div>
        : items.map(i => (
          <div key={i.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <Link to={`/transformers/${i.transformerId}`} className="font-semibold text-blue-700">{i.transformer?.inventoryNumber}</Link>
              <span className={`text-xs px-2 py-0.5 rounded-full ${RESULT_CLS[i.result]}`}>{RESULT_LABELS[i.result]}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Sana: {new Date(i.inspectionDate).toLocaleDateString('uz')}</div>
              <div>Tekshiruvchi: {i.inspector?.fullName || '—'}</div>
              {i.findings && <div>Xulosa: {i.findings}</div>}
            </div>
            {canModify(i) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(i)} className="flex-1 py-1.5 text-center text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">Tahrirlash</button>
                <button onClick={() => handleDelete(i)} className="py-1.5 px-3 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <th className="px-4 py-3 text-left font-medium text-gray-600">Transformator</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Sana</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tekshiruvchi</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Natija</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Xulosa</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
            </tr></thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Tekshiruvlar topilmadi</td></tr>
              : items.map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link to={`/transformers/${i.transformerId}`} className="font-medium text-blue-700 hover:underline">{i.transformer?.inventoryNumber}</Link><div className="text-xs text-gray-400">{i.transformer?.region?.name}</div></td>
                  <td className="px-4 py-3">{new Date(i.inspectionDate).toLocaleDateString('uz')}</td>
                  <td className="px-4 py-3 text-gray-500">{i.inspector?.fullName || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${RESULT_CLS[i.result]}`}>{RESULT_LABELS[i.result]}</span></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[260px] truncate">{i.findings || '—'}</td>
                  <td className="px-4 py-3">
                    {canModify(i) && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
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

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">{modal === 'create' ? 'Yangi tekshiruv' : 'Tekshiruvni tahrirlash'}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Transformator *</label>
                <select value={form.transformerId} onChange={e => setForm((f: any) => ({ ...f, transformerId: e.target.value }))} required disabled={modal === 'edit'} className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50">
                  <option value="">Tanlang...</option>
                  {transformers.map(t => <option key={t.id} value={t.id}>{t.inventoryNumber}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Sana *</label>
                  <input type="date" value={form.inspectionDate} onChange={e => setForm((f: any) => ({ ...f, inspectionDate: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Natija</label>
                  <select value={form.result} onChange={e => setForm((f: any) => ({ ...f, result: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(RESULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Xulosa / topilmalar</label>
                <textarea value={form.findings} onChange={e => setForm((f: any) => ({ ...f, findings: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 pt-3 border-t">
                <button type="button" onClick={() => setModal(null)} className="flex-1 sm:flex-none px-4 py-2.5 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
