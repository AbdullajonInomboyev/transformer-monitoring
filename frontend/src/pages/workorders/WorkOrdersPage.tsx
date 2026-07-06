import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { workOrdersApi, transformersApi, usersApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { Plus, Search, X, ListTodo, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = { OPEN: 'Ochiq', IN_PROGRESS: 'Jarayonda', CLOSED: 'Yopilgan' };
const STATUS_CLS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_LABELS: Record<string, string> = { LOW: 'Past', MEDIUM: "O'rta", HIGH: 'Yuqori', URGENT: 'Shoshilinch' };
const PRIORITY_CLS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-red-100 text-red-700',
};

const emptyForm = { transformerId: '', title: '', description: '', assignedToId: '', dueDate: '', status: 'OPEN', priority: 'MEDIUM' };

export default function WorkOrdersPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [transformers, setTransformers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const limit = 10;
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { load(); }, [page, filters]);

  const loadRefs = async () => {
    try {
      const t = await transformersApi.list({ page: 1, limit: 1000 });
      setTransformers(t.data.data);
    } catch {}
    // Faqat admin foydalanuvchilar ro'yxatini olishi mumkin
    if (user?.role === 'ADMIN') {
      try { const u = await usersApi.list({ page: 1, limit: 200 }); setUsers(u.data.data); } catch {}
    }
  };
  const load = async () => {
    setLoading(true);
    try {
      const res = await workOrdersApi.list({ page, limit, ...filters });
      setItems(res.data.data); setTotal(res.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };

  const setFilter = (key: string, value: string) => { setPage(1); setFilters(f => ({ ...f, [key]: value })); };

  const openCreate = () => { setForm(emptyForm); setEditItem(null); setModal('create'); };
  const openEdit = (i: any) => {
    setEditItem(i);
    setForm({
      transformerId: i.transformerId, title: i.title, description: i.description || '',
      assignedToId: i.assignedTo?.id || '', dueDate: i.dueDate ? i.dueDate.slice(0, 10) : '',
      status: i.status, priority: i.priority,
    });
    setModal('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data: any = {
        ...form,
        description: form.description || null,
        assignedToId: form.assignedToId || null,
        dueDate: form.dueDate || null,
      };
      if (modal === 'create') { await workOrdersApi.create(data); toast.success('Buyurtma yaratildi'); }
      else { await workOrdersApi.update(editItem.id, data); toast.success('Yangilandi'); }
      setModal(null); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (i: any) => {
    if (!confirm("Buyurtmani o'chirishni tasdiqlaysizmi?")) return;
    try { await workOrdersApi.delete(i.id); toast.success("O'chirildi"); load(); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><ListTodo className="w-6 h-6 text-blue-600" /> Ish buyurtmalari</h1>
          <p className="text-xs md:text-sm text-gray-500">Ta'mirlash va xizmat buyurtmalari — jami {total} ta</p>
        </div>
        {!isReadOnly && (
          <button onClick={openCreate} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-3.5 h-3.5" /> Yangi buyurtma
          </button>
        )}
      </div>

      {/* Filtrlar */}
      <div className="bg-white rounded-xl border p-3 mb-4 grid grid-cols-3 gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Qidirish..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="px-2 py-2 border rounded-lg text-sm">
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)} className="px-2 py-2 border rounded-lg text-sm">
          <option value="">Barcha ustuvorliklar</option>
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Mobil kartochkalar */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="text-center text-gray-400 py-8">Yuklanmoqda...</div>
        : items.length === 0 ? <div className="text-center text-gray-400 py-8">Buyurtmalar topilmadi</div>
        : items.map(i => (
          <div key={i.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="font-semibold truncate">{i.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_CLS[i.status]}`}>{STATUS_LABELS[i.status]}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Transformator: <Link to={`/transformers/${i.transformerId}`} className="text-blue-600">{i.transformer?.inventoryNumber}</Link></div>
              <div>Ustuvorlik: <span className={`px-1.5 py-0.5 rounded ${PRIORITY_CLS[i.priority]}`}>{PRIORITY_LABELS[i.priority]}</span></div>
              {i.assignedTo && <div>Mas'ul: {i.assignedTo.fullName}</div>}
              {i.dueDate && <div>Muddat: {new Date(i.dueDate).toLocaleDateString('uz')}</div>}
            </div>
            {!isReadOnly && (
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
              <th className="px-4 py-3 text-left font-medium text-gray-600">Buyurtma</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Transformator</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Mas'ul</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Muddat</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ustuvorlik</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Holat</th>
              {!isReadOnly && <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>}
            </tr></thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Buyurtmalar topilmadi</td></tr>
              : items.map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-medium">{i.title}</div>{i.description && <div className="text-xs text-gray-400 max-w-[220px] truncate">{i.description}</div>}</td>
                  <td className="px-4 py-3"><Link to={`/transformers/${i.transformerId}`} className="text-blue-700 hover:underline">{i.transformer?.inventoryNumber}</Link></td>
                  <td className="px-4 py-3 text-gray-500">{i.assignedTo?.fullName || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{i.dueDate ? new Date(i.dueDate).toLocaleDateString('uz') : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_CLS[i.priority]}`}>{PRIORITY_LABELS[i.priority]}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[i.status]}`}>{STATUS_LABELS[i.status]}</span></td>
                  {!isReadOnly && (
                    <td className="px-4 py-3"><div className="flex items-center gap-1">
                      <button onClick={() => openEdit(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  )}
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
              <h2 className="text-base font-bold">{modal === 'create' ? 'Yangi ish buyurtmasi' : 'Buyurtmani tahrirlash'}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Transformator *</label>
                <select value={form.transformerId} onChange={e => setForm((f: any) => ({ ...f, transformerId: e.target.value }))} required disabled={modal === 'edit'} className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50">
                  <option value="">Tanlang...</option>
                  {transformers.map(t => <option key={t.id} value={t.id}>{t.inventoryNumber}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Sarlavha *</label>
                <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} required placeholder="Masalan: Moy almashtirish" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tavsif</label>
                <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {user?.role === 'ADMIN' && (
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Mas'ul hodim</label>
                    <select value={form.assignedToId} onChange={e => setForm((f: any) => ({ ...f, assignedToId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">Tanlanmagan</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </div>
                )}
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Muddat</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm((f: any) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Ustuvorlik</label>
                  <select value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Holat</label>
                  <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
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
