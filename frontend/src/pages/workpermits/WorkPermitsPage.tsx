import { useEffect, useState } from 'react';
import api from '@/api/client';
import { transformersApi, usersApi } from '@/api/client';
import { Plus, Edit, Trash2, X, Eye, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  const emptyForm: any = {
    department: '', workSupervisor: '', workPerformer: '', watcherName: '',
    brigadeMembers: [{ name: '', role: '' }], transformerId: '', taskDescription: '',
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

  const load = async () => { setLoading(true); try { const r = await api.get('/work-permits', { params: { page, limit: 10, search } }); setItems(r.data.data); setTotal(r.data.pagination.total); } catch {} finally { setLoading(false); } };
  const loadTransformers = async () => { try { const r = await transformersApi.map(); setTransformers(r.data.data); } catch {} };
  const loadEmployees = async () => { try { const r = await usersApi.list({ limit: 200 }); setEmployees(r.data.data || []); } catch {} };

  const openCreate = () => { setForm({ ...emptyForm, brigadeMembers: [{ name: '', role: '' }], safetyMeasures: [{ equipment: '', action: '' }], dailyLogs: [{ date: '', startTime: '', endTime: '', supervisorSign: '', performerSign: '' }], brigadeChanges: [{ memberIn: '', memberOut: '', date: '', permission: '' }] }); setEditItem(null); setModal('create'); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ ...item, brigadeMembers: item.brigadeMembers || [{ name: '', role: '' }], safetyMeasures: item.safetyMeasures || [{ equipment: '', action: '' }], dailyLogs: item.dailyLogs || [{ date: '', startTime: '', endTime: '', supervisorSign: '', performerSign: '' }], brigadeChanges: item.brigadeChanges || [{ memberIn: '', memberOut: '', date: '', permission: '' }],
      workStartDate: item.workStartDate ? item.workStartDate.split('T')[0] : '', workEndDate: item.workEndDate ? item.workEndDate.split('T')[0] : '',
      issuedByDate: item.issuedByDate ? item.issuedByDate.split('T')[0] : '', permittedByDate: item.permittedByDate ? item.permittedByDate.split('T')[0] : '' });
    setModal('edit');
  };
  const openView = (item: any) => { setEditItem(item); setModal('view'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form }; delete data.id; delete data.createdAt; delete data.updatedAt; delete data.createdBy; delete data.transformer; delete data.number;
      if (!data.transformerId) delete data.transformerId;
      if (modal === 'create') await api.post('/work-permits', data); else await api.put(`/work-permits/${editItem.id}`, data);
      setModal(null); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm("O'chirishni tasdiqlaysizmi?")) return; try { await api.delete(`/work-permits/${id}`); load(); } catch {} };

  const addRow = (field: string, template: any) => setForm((f: any) => ({ ...f, [field]: [...(f[field] || []), template] }));
  const updateRow = (field: string, index: number, key: string, value: string) => setForm((f: any) => { const arr = [...(f[field] || [])]; arr[index] = { ...arr[index], [key]: value }; return { ...f, [field]: arr }; });
  const removeRow = (field: string, index: number) => setForm((f: any) => ({ ...f, [field]: f[field].filter((_: any, i: number) => i !== index) }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div><h1 className="text-xl md:text-2xl font-bold">Naryad-ijozat</h1><p className="text-xs md:text-sm text-gray-500">Elektr qurilmalarda xavfsiz ish bajarish uchun</p></div>
        <button onClick={openCreate} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Yangi naryad
        </button>
      </div>

      <div className="bg-white rounded-xl border p-3 mb-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Qidirish..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>

      {/* Mobil kartochkalar */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="text-center text-gray-400 py-8">Yuklanmoqda...</div>
        : items.length === 0 ? <div className="text-center text-gray-400 py-8">Naryad topilmadi</div>
        : items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">#{item.number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls[item.status]}`}>{statusLabels[item.status]}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {item.department && <div>Bo'lim: {item.department}</div>}
              {item.workSupervisor && <div>Rahbar: {item.workSupervisor}</div>}
              {item.transformer?.inventoryNumber && <div className="text-blue-600">TR: {item.transformer.inventoryNumber}</div>}
              {item.workStartDate && <div className="text-xs text-gray-500">{new Date(item.workStartDate).toLocaleDateString('uz')} {item.workStartTime || ''}</div>}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <button onClick={() => openView(item)} className="flex-1 py-1.5 text-center text-xs border rounded-lg hover:bg-gray-50">Ko'rish</button>
              <button onClick={() => openEdit(item)} className="flex-1 py-1.5 text-center text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">Tahrirlash</button>
              <button onClick={() => handleDelete(item.id)} className="py-1.5 px-3 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop jadval */}
      <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">№</th><th className="px-4 py-3 text-left font-medium text-gray-600">Bo'lim</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ish rahbari</th><th className="px-4 py-3 text-left font-medium text-gray-600">Transformator</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Boshlanish</th><th className="px-4 py-3 text-left font-medium text-gray-600">Holat</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Amallar</th>
            </tr></thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Naryad topilmadi</td></tr>
              : items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.number}</td><td className="px-4 py-3">{item.department || '—'}</td>
                  <td className="px-4 py-3">{item.workSupervisor || '—'}</td><td className="px-4 py-3 text-blue-600">{item.transformer?.inventoryNumber || '—'}</td>
                  <td className="px-4 py-3 text-xs">{item.workStartDate ? new Date(item.workStartDate).toLocaleDateString('uz') : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls[item.status]}`}>{statusLabels[item.status]}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1">
                    <button onClick={() => openView(item)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Jami {total} ta</span>
          <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Oldingi</button><span>{page}/{Math.ceil(total/10)||1}</span><button disabled={page >= Math.ceil(total/10)} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded disabled:opacity-50">Keyingi</button></div>
        </div>
      </div>

      {/* Mobil pagination */}
      <div className="md:hidden flex items-center justify-between mt-3 text-sm text-gray-500">
        <span>Jami {total} ta</span>
        <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">Oldingi</button><span className="text-xs">{page}/{Math.ceil(total/10)||1}</span><button disabled={page >= Math.ceil(total/10)} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">Keyingi</button></div>
      </div>

      {/* VIEW MODAL */}
      {modal === 'view' && editItem && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">Naryad № {editItem.number}</h2>
              <button onClick={() => setModal(null)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Bo'lim" value={editItem.department} /><Info label="Holat" value={statusLabels[editItem.status]} />
                <Info label="Ish rahbari" value={editItem.workSupervisor} /><Info label="Ish bajaruvchi" value={editItem.workPerformer} />
              </div>
              <Info label="Topshiriq" value={editItem.taskDescription} />
              {editItem.brigadeMembers?.length > 0 && (
                <div><label className="font-medium text-xs">Brigada:</label><div className="mt-1 space-y-1">{editItem.brigadeMembers.map((m: any, i: number) => <div key={i} className="bg-gray-50 rounded p-2 text-xs">{m.name} — {m.role}</div>)}</div></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />{modal === 'create' ? 'Yangi naryad' : `Tahrirlash: №${editItem?.number}`}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <Section title="Asosiy ma'lumotlar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Inp label="Bo'lim" value={form.department} onChange={(v: string) => setForm((f: any) => ({...f, department: v}))} placeholder="Masalan: Namangan HET" />
                  <Sel label="Holat" value={form.status} onChange={(v: string) => setForm((f: any) => ({...f, status: v}))} options={[{v:'OPEN',l:'Ochiq'},{v:'IN_PROGRESS',l:'Jarayonda'},{v:'COMPLETED',l:'Bajarildi'},{v:'CANCELLED',l:'Bekor'}]} />
                  <Inp label="Ish rahbari" value={form.workSupervisor} onChange={(v: string) => setForm((f: any) => ({...f, workSupervisor: v}))} />
                  <Inp label="Ish bajaruvchi" value={form.workPerformer} onChange={(v: string) => setForm((f: any) => ({...f, workPerformer: v}))} />
                  <Inp label="Kuzatuvchi" value={form.watcherName} onChange={(v: string) => setForm((f: any) => ({...f, watcherName: v}))} />
                  <Sel label="Transformator" value={form.transformerId} onChange={(v: string) => setForm((f: any) => ({...f, transformerId: v}))} options={transformers.map((t: any) => ({ v: t.id, l: `${t.inventoryNumber} (${t.model || ''})` }))} placeholder="Tanlang..." />
                </div>
              </Section>

              <Section title="Brigada a'zolari">
                {form.brigadeMembers?.map((m: any, i: number) => (
                  <div key={i} className="mb-3 p-2 bg-white border rounded-lg">
                    <select value={m.name} onChange={e => updateRow('brigadeMembers', i, 'name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-2">
                      <option value="">Xodimni tanlang...</option>
                      {employees.map((emp: any) => <option key={emp.id} value={emp.fullName}>{emp.fullName} ({emp.role})</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <input value={m.role} onChange={e => updateRow('brigadeMembers', i, 'role', e.target.value)} placeholder="Lavozimi / guruh" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <button type="button" onClick={() => removeRow('brigadeMembers', i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addRow('brigadeMembers', { name: '', role: '' })} className="text-xs text-blue-600 hover:underline">+ A'zo qo'shish</button>
              </Section>

              <Section title="Topshiriq">
                <textarea value={form.taskDescription} onChange={e => setForm((f: any) => ({...f, taskDescription: e.target.value}))} rows={3} placeholder="Nima ish bajariladi..." className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
              </Section>

              <Section title="Ish vaqti">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Inp label="Boshlanish sanasi" value={form.workStartDate} onChange={(v: string) => setForm((f: any) => ({...f, workStartDate: v}))} type="date" />
                  <Inp label="Vaqti" value={form.workStartTime} onChange={(v: string) => setForm((f: any) => ({...f, workStartTime: v}))} placeholder="9:00" />
                  <Inp label="Tugash sanasi" value={form.workEndDate} onChange={(v: string) => setForm((f: any) => ({...f, workEndDate: v}))} type="date" />
                  <Inp label="Vaqti" value={form.workEndTime} onChange={(v: string) => setForm((f: any) => ({...f, workEndTime: v}))} placeholder="18:00" />
                </div>
              </Section>

              <Section title="Xavfsizlik chora-tadbirlari">
                {form.safetyMeasures?.map((m: any, i: number) => (
                  <div key={i} className="mb-3 p-2 bg-white border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <input value={m.equipment} onChange={e => updateRow('safetyMeasures', i, 'equipment', e.target.value)} placeholder="Qurilma nomi" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <button type="button" onClick={() => removeRow('safetyMeasures', i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <textarea value={m.action} onChange={e => updateRow('safetyMeasures', i, 'action', e.target.value)} placeholder="Nimani o'chirish va qaerga ulash kerak" rows={2} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
                  </div>
                ))}
                <button type="button" onClick={() => addRow('safetyMeasures', { equipment: '', action: '' })} className="text-xs text-blue-600 hover:underline">+ Qo'shish</button>
              </Section>

              <Section title="Alohida ko'rsatmalar">
                <textarea value={form.specialInstructions} onChange={e => setForm((f: any) => ({...f, specialInstructions: e.target.value}))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
              </Section>

              <Section title="Naryad berdi / Ruxsat berdi">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Inp label="Naryad berdi (F.I.O)" value={form.issuedByName} onChange={(v: string) => setForm((f: any) => ({...f, issuedByName: v}))} />
                  <Inp label="Sana" value={form.issuedByDate} onChange={(v: string) => setForm((f: any) => ({...f, issuedByDate: v}))} type="date" />
                  <Inp label="Ruxsat berdi (F.I.O)" value={form.permittedByName} onChange={(v: string) => setForm((f: any) => ({...f, permittedByName: v}))} />
                  <Inp label="Sana" value={form.permittedByDate} onChange={(v: string) => setForm((f: any) => ({...f, permittedByDate: v}))} type="date" />
                </div>
              </Section>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setModal(null)} className="flex-1 sm:flex-none px-5 py-2.5 border rounded-lg text-sm">Bekor</button>
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

function Section({ title, children }: any) { return (<div className="bg-gray-50 rounded-xl p-3 md:p-4"><h3 className="text-sm font-bold mb-2">{title}</h3>{children}</div>); }
function Inp({ label, value, onChange, placeholder, type = 'text' }: any) { return (<div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>); }
function Sel({ label, value, onChange, options, placeholder }: any) { return (<div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">{placeholder || 'Tanlang'}</option>{options?.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>); }
function Info({ label, value }: any) { return (<div><span className="text-gray-500 text-xs">{label}</span><div className="font-medium mt-0.5 text-sm">{value || '—'}</div></div>); }