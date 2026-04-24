import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';
import { transformersApi, usersApi } from '@/api/client';
import { Plus, Edit, Trash2, X, Eye, FileText, Search } from 'lucide-react';

const statusLabels: Record<string, string> = { OPEN: 'Ochiq', IN_PROGRESS: 'Jarayonda', COMPLETED: 'Bajarildi', CANCELLED: 'Bekor' };
const statusCls: Record<string, string> = { OPEN: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-gray-100 text-gray-600' };

export default function WorkPermitsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [transformers, setTransformers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const emptyForm = {
    department: '', workSupervisor: '', workPerformer: '', watcherName: '',
    brigadeMembers: [{ name: '', role: '' }],
    transformerId: '', taskDescription: '',
    workStartDate: '', workStartTime: '', workEndDate: '', workEndTime: '',
    safetyMeasures: [{ equipment: '', action: '' }],
    specialInstructions: '', issuedByName: '', issuedByDate: '',
    permittedByName: '', permittedByDate: '',
    dailyLogs: [{ date: '', startTime: '', endTime: '', supervisorSign: '', performerSign: '' }],
    brigadeChanges: [{ memberIn: '', memberOut: '', date: '', permission: '' }],
    status: 'OPEN',
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => { load(); loadTransformers(); loadEmployees(); }, []);
  useEffect(() => { load(); }, [page, search]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/work-permits', { params: { page, limit: 10, search } });
      setItems(r.data.data); setTotal(r.data.pagination.total);
    } catch {} finally { setLoading(false); }
  };

  const loadTransformers = async () => {
    try { const r = await transformersApi.map(); setTransformers(r.data.data); } catch {}
  };

  const loadEmployees = async () => {
    try { const r = await usersApi.list({ limit: 200 }); setEmployees(r.data.data || []); } catch {}
  };

  const openCreate = () => { setForm({ ...emptyForm, brigadeMembers: [{ name: '', role: '' }], safetyMeasures: [{ equipment: '', action: '' }], dailyLogs: [{ date: '', startTime: '', endTime: '', supervisorSign: '', performerSign: '' }], brigadeChanges: [{ memberIn: '', memberOut: '', date: '', permission: '' }] }); setEditItem(null); setModal('create'); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      ...item,
      brigadeMembers: item.brigadeMembers || [{ name: '', role: '' }],
      safetyMeasures: item.safetyMeasures || [{ equipment: '', action: '' }],
      dailyLogs: item.dailyLogs || [{ date: '', startTime: '', endTime: '', supervisorSign: '', performerSign: '' }],
      brigadeChanges: item.brigadeChanges || [{ memberIn: '', memberOut: '', date: '', permission: '' }],
      workStartDate: item.workStartDate ? item.workStartDate.split('T')[0] : '',
      workEndDate: item.workEndDate ? item.workEndDate.split('T')[0] : '',
      issuedByDate: item.issuedByDate ? item.issuedByDate.split('T')[0] : '',
      permittedByDate: item.permittedByDate ? item.permittedByDate.split('T')[0] : '',
    });
    setModal('edit');
  };
  const openView = (item: any) => { setEditItem(item); setModal('view'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form };
      delete data.id; delete data.createdAt; delete data.updatedAt;
      delete data.createdBy; delete data.transformer; delete data.number;
      if (!data.transformerId) delete data.transformerId;

      if (modal === 'create') await api.post('/work-permits', data);
      else await api.put(`/work-permits/${editItem.id}`, data);
      setModal(null); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try { await api.delete(`/work-permits/${id}`); load(); } catch {}
  };

  const addRow = (field: string, template: any) => {
    setForm((f: any) => ({ ...f, [field]: [...(f[field] || []), template] }));
  };
  const updateRow = (field: string, index: number, key: string, value: string) => {
    setForm((f: any) => {
      const arr = [...(f[field] || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...f, [field]: arr };
    });
  };
  const removeRow = (field: string, index: number) => {
    setForm((f: any) => ({ ...f, [field]: f[field].filter((_: any, i: number) => i !== index) }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Naryad-ijozat</h1>
          <p className="text-sm text-gray-500">Elektr qurilmalarda xavfsiz ish bajarish uchun</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Yangi naryad
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Qidirish..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">№</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Bo'lim</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ish rahbari</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ish bajaruvchi</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Transformator</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Boshlanish</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Holat</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Naryad topilmadi</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.number}</td>
                <td className="px-4 py-3">{item.department || '—'}</td>
                <td className="px-4 py-3">{item.workSupervisor || '—'}</td>
                <td className="px-4 py-3">{item.workPerformer || '—'}</td>
                <td className="px-4 py-3 text-blue-600">{item.transformer?.inventoryNumber || '—'}</td>
                <td className="px-4 py-3 text-xs">{item.workStartDate ? new Date(item.workStartDate).toLocaleDateString('uz') : '—'} {item.workStartTime || ''}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls[item.status]}`}>{statusLabels[item.status]}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openView(item)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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

      {/* VIEW MODAL */}
      {modal === 'view' && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Naryad-ijozat № {editItem.number}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <Info label="Bo'lim" value={editItem.department} />
                <Info label="Holat" value={statusLabels[editItem.status]} />
                <Info label="Ish rahbari" value={editItem.workSupervisor} />
                <Info label="Ish bajaruvchi" value={editItem.workPerformer} />
                <Info label="Kuzatuvchi" value={editItem.watcherName} />
                <Info label="Transformator" value={editItem.transformer?.inventoryNumber} />
              </div>
              <Info label="Topshiriq" value={editItem.taskDescription} />
              <div className="grid grid-cols-2 gap-4">
                <Info label="Boshlanish" value={`${editItem.workStartDate ? new Date(editItem.workStartDate).toLocaleDateString('uz') : ''} ${editItem.workStartTime || ''}`} />
                <Info label="Tugash" value={`${editItem.workEndDate ? new Date(editItem.workEndDate).toLocaleDateString('uz') : ''} ${editItem.workEndTime || ''}`} />
              </div>
              {editItem.brigadeMembers?.length > 0 && (
                <div><label className="font-medium">Brigada a'zolari:</label>
                  <div className="mt-1 space-y-1">{editItem.brigadeMembers.map((m: any, i: number) => <div key={i} className="bg-gray-50 rounded p-2">{m.name} — {m.role}</div>)}</div>
                </div>
              )}
              {editItem.safetyMeasures?.length > 0 && (
                <div><label className="font-medium">Xavfsizlik chora-tadbirlari:</label>
                  <div className="mt-1 space-y-1">{editItem.safetyMeasures.map((m: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded p-2">
                      <span className="font-medium">{m.equipment}</span>: {m.action}
                    </div>
                  ))}</div>
                </div>
              )}
              <Info label="Alohida ko'rsatmalar" value={editItem.specialInstructions} />
              <div className="grid grid-cols-2 gap-4">
                <Info label="Berdi" value={`${editItem.issuedByName || ''} ${editItem.issuedByDate ? new Date(editItem.issuedByDate).toLocaleDateString('uz') : ''}`} />
                <Info label="Ruxsat berdi" value={`${editItem.permittedByName || ''} ${editItem.permittedByDate ? new Date(editItem.permittedByDate).toLocaleDateString('uz') : ''}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {modal === 'create' ? 'Yangi Naryad-ijozat' : `Tahrirlash: №${editItem?.number}`}
              </h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-5">
              {/* 1. Asosiy */}
              <Section title="Asosiy ma'lumotlar">
                <div className="grid grid-cols-2 gap-4">
                  <Inp label="Bo'lim" value={form.department} onChange={(v: string) => setForm((f: any) => ({...f, department: v}))} placeholder="Masalan: Namangan HET" />
                  <Sel label="Holat" value={form.status} onChange={(v: string) => setForm((f: any) => ({...f, status: v}))} options={[{v:'OPEN',l:'Ochiq'},{v:'IN_PROGRESS',l:'Jarayonda'},{v:'COMPLETED',l:'Bajarildi'},{v:'CANCELLED',l:'Bekor'}]} />
                  <Inp label="Ish rahbari" value={form.workSupervisor} onChange={(v: string) => setForm((f: any) => ({...f, workSupervisor: v}))} />
                  <Inp label="Ish bajaruvchi (kuzatuvchi)" value={form.workPerformer} onChange={(v: string) => setForm((f: any) => ({...f, workPerformer: v}))} />
                  <Inp label="Kuzatuvchi" value={form.watcherName} onChange={(v: string) => setForm((f: any) => ({...f, watcherName: v}))} />
                  <Sel label="Transformator" value={form.transformerId} onChange={(v: string) => setForm((f: any) => ({...f, transformerId: v}))}
                    options={transformers.map((t: any) => ({ v: t.id, l: `${t.inventoryNumber} (${t.model || ''})` }))} placeholder="Tanlang..." />
                </div>
              </Section>

              {/* 2. Brigada — xodimlardan tanlash */}
              <Section title="Brigada a'zolari">
                {form.brigadeMembers?.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <select value={m.name} onChange={e => updateRow('brigadeMembers', i, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="">Xodimni tanlang...</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.fullName}>{emp.fullName} ({emp.role})</option>
                      ))}
                    </select>
                    <input value={m.role} onChange={e => updateRow('brigadeMembers', i, 'role', e.target.value)} placeholder="Lavozimi / guruh" className="w-40 px-3 py-2 border rounded-lg text-sm" />
                    <button type="button" onClick={() => removeRow('brigadeMembers', i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => addRow('brigadeMembers', { name: '', role: '' })} className="text-xs text-blue-600 hover:underline">+ A'zo qo'shish</button>
              </Section>

              {/* 3. Topshiriq */}
              <Section title="Topshiriq (nima ish bajariladi)">
                <textarea value={form.taskDescription} onChange={e => setForm((f: any) => ({...f, taskDescription: e.target.value}))} rows={3}
                  placeholder="Masalan: TM-646/630 kVa TRP ni yopish, yo'nilma 250 kVa TKTP ni montaj qilmoq"
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
              </Section>

              {/* 4. Ish vaqti */}
              <Section title="Ish boshlanishi va tugashi">
                <div className="grid grid-cols-2 gap-4">
                  <Inp label="Boshlanish sanasi" value={form.workStartDate} onChange={(v: string) => setForm((f: any) => ({...f, workStartDate: v}))} type="date" />
                  <Inp label="Vaqti" value={form.workStartTime} onChange={(v: string) => setForm((f: any) => ({...f, workStartTime: v}))} placeholder="Masalan: 9:00" />
                  <Inp label="Tugash sanasi" value={form.workEndDate} onChange={(v: string) => setForm((f: any) => ({...f, workEndDate: v}))} type="date" />
                  <Inp label="Vaqti" value={form.workEndTime} onChange={(v: string) => setForm((f: any) => ({...f, workEndTime: v}))} placeholder="Masalan: 18:00" />
                </div>
              </Section>

              {/* 5. Xavfsizlik choralari — action textarea qilindi */}
              <Section title="1-jadval: Xavfsizlik chora-tadbirlari">
                {form.safetyMeasures?.map((m: any, i: number) => (
                  <div key={i} className="mb-3 p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <input value={m.equipment} onChange={e => updateRow('safetyMeasures', i, 'equipment', e.target.value)} placeholder="Elektr qurilma nomi" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <button type="button" onClick={() => removeRow('safetyMeasures', i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <textarea value={m.action} onChange={e => updateRow('safetyMeasures', i, 'action', e.target.value)}
                      placeholder="Nimani o'chirish va qaerga ulash kerak (ko'p qatorli yozish mumkin)"
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
                  </div>
                ))}
                <button type="button" onClick={() => addRow('safetyMeasures', { equipment: '', action: '' })} className="text-xs text-blue-600 hover:underline">+ Qo'shish</button>
              </Section>

              {/* 6. Alohida ko'rsatmalar */}
              <Section title="Alohida ko'rsatmalar">
                <textarea value={form.specialInstructions} onChange={e => setForm((f: any) => ({...f, specialInstructions: e.target.value}))} rows={2}
                  placeholder="Masalan: ish enur moddq R. Nodimovga otishga mumkin"
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
              </Section>

              {/* 7. Ruxsat beruvchilar */}
              <Section title="Naryad berdi / Ruxsat berdi">
                <div className="grid grid-cols-2 gap-4">
                  <Inp label="Naryad berdi (F.I.O)" value={form.issuedByName} onChange={(v: string) => setForm((f: any) => ({...f, issuedByName: v}))} />
                  <Inp label="Sana" value={form.issuedByDate} onChange={(v: string) => setForm((f: any) => ({...f, issuedByDate: v}))} type="date" />
                  <Inp label="Ruxsat berdi (F.I.O)" value={form.permittedByName} onChange={(v: string) => setForm((f: any) => ({...f, permittedByName: v}))} />
                  <Inp label="Sana" value={form.permittedByDate} onChange={(v: string) => setForm((f: any) => ({...f, permittedByDate: v}))} type="date" />
                </div>
              </Section>

              {/* 8. Kundalik ish */}
              <Section title="3-jadval: Kundalik ish qo'yish va tugash">
                {form.dailyLogs?.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
                    <input value={m.date} onChange={e => updateRow('dailyLogs', i, 'date', e.target.value)} type="date" className="w-32 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.startTime} onChange={e => updateRow('dailyLogs', i, 'startTime', e.target.value)} placeholder="Boshlanish" className="w-24 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.endTime} onChange={e => updateRow('dailyLogs', i, 'endTime', e.target.value)} placeholder="Tugash" className="w-24 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.supervisorSign} onChange={e => updateRow('dailyLogs', i, 'supervisorSign', e.target.value)} placeholder="Qo'yuvchi" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.performerSign} onChange={e => updateRow('dailyLogs', i, 'performerSign', e.target.value)} placeholder="Bajaruvchi" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <button type="button" onClick={() => removeRow('dailyLogs', i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => addRow('dailyLogs', { date: '', startTime: '', endTime: '', supervisorSign: '', performerSign: '' })} className="text-xs text-blue-600 hover:underline">+ Kun qo'shish</button>
              </Section>

              {/* 9. Brigada tarkibidagi o'zgarishlar */}
              <Section title="4-jadval: Brigada tarkibidagi o'zgarishlar">
                {form.brigadeChanges?.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
                    <input value={m.memberIn} onChange={e => updateRow('brigadeChanges', i, 'memberIn', e.target.value)} placeholder="Kiritildi (F.I.O)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.memberOut} onChange={e => updateRow('brigadeChanges', i, 'memberOut', e.target.value)} placeholder="Chiqarildi (F.I.O)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.date} onChange={e => updateRow('brigadeChanges', i, 'date', e.target.value)} type="date" className="w-32 px-3 py-2 border rounded-lg text-sm" />
                    <input value={m.permission} onChange={e => updateRow('brigadeChanges', i, 'permission', e.target.value)} placeholder="Ruxsat" className="w-24 px-3 py-2 border rounded-lg text-sm" />
                    <button type="button" onClick={() => removeRow('brigadeChanges', i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => addRow('brigadeChanges', { memberIn: '', memberOut: '', date: '', permission: '' })} className="text-xs text-blue-600 hover:underline">+ O'zgarish qo'shish</button>
              </Section>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setModal(null)} className="px-5 py-2 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
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

function Section({ title, children }: any) {
  return (<div className="bg-gray-50 rounded-xl p-4"><h3 className="text-sm font-bold mb-3">{title}</h3>{children}</div>);
}
function Inp({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (<div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>);
}
function Sel({ label, value, onChange, options, placeholder }: any) {
  return (<div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">{placeholder || 'Tanlang'}</option>{options?.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>);
}
function Info({ label, value }: any) {
  return (<div><span className="text-gray-500 text-xs">{label}</span><div className="font-medium mt-0.5">{value || '—'}</div></div>);
}