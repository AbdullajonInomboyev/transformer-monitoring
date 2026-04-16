import { useEffect, useState } from 'react';
import { usersApi, regionsApi } from '@/api/client';
import { Plus, Edit, Trash2, Key, X, UserCheck, UserX } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'password' | null>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const emptyForm = { email: '', password: '', fullName: '', phone: '', role: 'EMPLOYEE', regionId: '', expiresAt: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); loadRegions(); }, []);
  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try { const r = await usersApi.list({ page, limit: 10 }); setUsers(r.data.data); setTotal(r.data.pagination.total); }
    catch {} finally { setLoading(false); }
  };
  const loadRegions = async () => { try { const r = await regionsApi.all(); setRegions(r.data.data); } catch {} };

  // Yaratish
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data: any = { ...form };
      if (!data.expiresAt) delete data.expiresAt;
      if (!data.regionId) data.regionId = null;
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt).toISOString();
      await usersApi.create(data);
      setModal(null); setForm(emptyForm); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  // Tahrirlash
  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({
      email: u.email, password: '', fullName: u.fullName, phone: u.phone || '',
      role: u.role, regionId: u.regionId || '', expiresAt: u.expiresAt ? u.expiresAt.slice(0, 16) : '',
    });
    setModal('edit');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data: any = { fullName: form.fullName, phone: form.phone, role: form.role, regionId: form.regionId || null };
      if (form.expiresAt) data.expiresAt = new Date(form.expiresAt).toISOString();
      else data.expiresAt = null;
      await usersApi.update(editUser.id, data);
      setModal(null); setEditUser(null); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  // Parol o'zgartirish
  const openPassword = (u: any) => { setEditUser(u); setNewPassword(''); setModal('password'); };
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await usersApi.resetPassword(editUser.id, newPassword);
      setModal(null); alert('Parol yangilandi!');
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  // O'chirish
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`)) return;
    try { await usersApi.delete(id); load(); } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
  };

  const roleBadge = (role: string) => {
    const cls: Record<string, string> = { ADMIN: 'bg-purple-100 text-purple-700', EMPLOYEE: 'bg-blue-100 text-blue-700', INSPECTOR: 'bg-amber-100 text-amber-700' };
    const labels: Record<string, string> = { ADMIN: 'Admin', EMPLOYEE: 'Hodim', INSPECTOR: 'Tekshiruvchi' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[role]}`}>{labels[role]}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar Boshqaruvi</h1>
          <p className="text-sm text-gray-500">Hodimlar, adminlar va tekshiruvchilarni boshqarish</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal('create'); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Yangi Foydalanuvchi
        </button>
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ism</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Biriktirilgan hudud</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Holat</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Muddat</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Oxirgi kirish</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">{roleBadge(u.role)}</td>
                <td className="px-4 py-3">
                  {u.region ? (
                    <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{u.region.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Barcha hududlar</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-700"><UserCheck className="w-3.5 h-3.5" /> Faol</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500"><UserX className="w-3.5 h-3.5" /> Nofaol</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.expiresAt ? (
                    <span className={new Date(u.expiresAt) < new Date() ? 'text-red-600 font-medium' : ''}>
                      {new Date(u.expiresAt).toLocaleDateString('uz')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('uz') : 'Hech qachon'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Tahrirlash">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => openPassword(u)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Parol yangilash">
                      <Key className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(u.id, u.fullName)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="O'chirish">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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

      {/* ============ YARATISH / TAHRIRLASH MODALI ============ */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{modal === 'create' ? 'Yangi Foydalanuvchi' : `Tahrirlash: ${editUser?.fullName}`}</h2>
              <button onClick={() => { setModal(null); setEditUser(null); }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To'liq ism *</label>
                  <input value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} required
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+998..."
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {modal === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parol *</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required minLength={6}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                  <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="EMPLOYEE">Hodim</option>
                    <option value="ADMIN">Admin</option>
                    <option value="INSPECTOR">Tekshiruvchi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hudud biriktirish</label>
                  <select value={form.regionId} onChange={e => setForm(f => ({...f, regionId: e.target.value}))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Barcha hududlar (cheklanmagan)</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hodim faqat tanlangan hududni ko'radi</p>
                </div>
              </div>

              {(form.role === 'INSPECTOR') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kirish muddati</label>
                  <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({...f, expiresAt: e.target.value}))}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-500 mt-1">Shu sanadan keyin tizimga kira olmaydi</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => { setModal(null); setEditUser(null); }} className="px-4 py-2 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saqlanmoqda...' : modal === 'create' ? 'Yaratish' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ PAROL O'ZGARTIRISH MODALI ============ */}
      {modal === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Parol yangilash</h2>
              <button onClick={() => { setModal(null); setEditUser(null); }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-800">{editUser?.fullName}</span> ({editUser?.email}) uchun yangi parol
            </p>
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yangi parol *</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  placeholder="Kamida 6 ta belgi"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
                  {saving ? '...' : 'Parolni yangilash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
