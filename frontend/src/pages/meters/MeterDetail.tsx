import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { metersApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { ArrowLeft, Gauge, Zap, Phone, MapPin, User, Plus, Trash2, X, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const photoUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  return base ? base + url : url;
};

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Faol', INACTIVE: 'Nofaol', BROKEN: 'Buzilgan', REPLACED: 'Almashtirilgan' };
const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  BROKEN: 'bg-red-100 text-red-700',
  REPLACED: 'bg-amber-100 text-amber-700',
};
const TYPE_LABELS: Record<string, string> = { SINGLE_PHASE: 'Bir fazali', THREE_PHASE: 'Uch fazali', BALANCE: 'Balans hisoblagich' };

export default function MeterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [meter, setMeter] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showReadingForm, setShowReadingForm] = useState(false);
  const [readingForm, setReadingForm] = useState({ reading: '', readingDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([metersApi.get(id!), metersApi.readings(id!)]);
      setMeter(m.data.data);
      setReadings(r.data.data);
    } catch { navigate('/meters'); }
    finally { setLoading(false); }
  };

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await metersApi.addReading(id!, {
        reading: parseFloat(readingForm.reading),
        readingDate: readingForm.readingDate,
        notes: readingForm.notes || null,
      });
      toast.success("Ko'rsatkich kiritildi");
      setShowReadingForm(false);
      setReadingForm({ reading: '', readingDate: new Date().toISOString().slice(0, 10), notes: '' });
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDeleteReading = async (rid: string) => {
    if (!confirm("Ko'rsatkichni o'chirishni tasdiqlaysizmi?")) return;
    try { await metersApi.deleteReading(id!, rid); toast.success("O'chirildi"); load(); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!meter) return null;

  const photos: string[] = Array.isArray(meter.photos) && meter.photos.length ? meter.photos : (meter.photoUrl ? [meter.photoUrl] : []);

  // Iste'mol grafigi uchun (eskidan yangiga)
  const chartData = [...readings]
    .sort((a, b) => new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime())
    .filter(r => r.consumption != null)
    .map(r => ({
      month: new Date(r.readingDate).toLocaleDateString('uz', { month: 'short', year: '2-digit' }),
      consumption: r.consumption,
    }));

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gauge className="w-6 h-6 text-blue-600" /> {meter.meterNumber}
              <span className={`text-sm px-2 py-0.5 rounded-full ${STATUS_CLS[meter.status]}`}>{STATUS_LABELS[meter.status]}</span>
            </h1>
            <p className="text-sm text-gray-500">{meter.ownerName} • {TYPE_LABELS[meter.meterType]}</p>
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={() => setShowReadingForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Ko'rsatkich kiritish
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Rasmlar galereyasi */}
          {photos.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4">Rasmlar ({photos.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <img key={i} src={photoUrl(p)} onClick={() => setLightbox(photoUrl(p))}
                    className="w-full h-40 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition" />
                ))}
              </div>
            </div>
          )}

          {/* Ma'lumotlar */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-4">Hisoblagich ma'lumotlari</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <Info label="Hisoblagich raqami" value={meter.meterNumber} />
              <Info label="Model" value={meter.meterModel} />
              <Info label="Turi" value={TYPE_LABELS[meter.meterType]} />
              <Info label="Plomba raqami" value={meter.sealNumber} />
              <Info label="Egasi" value={meter.ownerName} />
              <Info label="Telefon" value={meter.phone} />
              <Info label="Manzil" value={meter.address} />
              <Info label="Tarif" value={meter.tariff != null ? `${meter.tariff} so'm/kVt·s` : null} />
              <Info label="O'rnatilgan sana" value={meter.installationDate ? new Date(meter.installationDate).toLocaleDateString('uz') : null} />
              <Info label="Kiritgan" value={meter.createdBy?.fullName} />
              {meter.notes && <div className="col-span-2"><span className="text-gray-500">Izoh</span><div className="font-medium mt-0.5">{meter.notes}</div></div>}
            </div>
          </div>

          {/* Iste'mol grafigi */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> Oylik iste'mol (kVt·soat)</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v} kVt·s`, "Iste'mol"]} />
                    <Bar dataKey="consumption" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Ko'rsatkichlar tarixi */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-4">Ko'rsatkichlar tarixi ({readings.length})</h2>
            {readings.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Hali ko'rsatkich kiritilmagan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b"><tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Sana</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Ko'rsatkich</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Iste'mol</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Kiritgan</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Izoh</th>
                    {!isReadOnly && <th className="px-3 py-2"></th>}
                  </tr></thead>
                  <tbody className="divide-y">
                    {readings.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{new Date(r.readingDate).toLocaleDateString('uz')}</td>
                        <td className="px-3 py-2 font-medium">{r.reading}</td>
                        <td className="px-3 py-2">{r.consumption != null ? <span className="text-blue-700">{r.consumption} kVt·s</span> : '—'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{r.recordedBy?.fullName || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs max-w-[160px] truncate">{r.notes || '—'}</td>
                        {!isReadOnly && (
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => handleDeleteReading(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* O'ng ustun */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 sticky top-6 space-y-4">
            <h3 className="font-semibold">Qisqa ma'lumot</h3>
            <PreviewItem icon={Gauge} label="Oxirgi ko'rsatkich" value={meter.lastReading != null ? `${meter.lastReading} kVt·s` : '—'} />
            <PreviewItem icon={User} label="Egasi" value={meter.ownerName} />
            <PreviewItem icon={Phone} label="Telefon" value={meter.phone} />
            <PreviewItem icon={MapPin} label="Manzil" value={meter.address} />
            <div className="border-t pt-4">
              <div className="text-xs text-gray-500 mb-1">Transformator</div>
              <Link to={`/transformers/${meter.transformerId}`} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                <Zap className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-700">{meter.transformer?.inventoryNumber}</div>
                  <div className="text-xs text-gray-500">{meter.transformer?.region?.name}{meter.transformer?.district ? ` • ${meter.transformer.district.name}` : ''}</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-h-[90vh] max-w-full rounded-lg" />
          <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white"><X className="w-6 h-6" /></button>
        </div>
      )}

      {/* Ko'rsatkich kiritish modal */}
      {showReadingForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Yangi ko'rsatkich</h2>
              <button onClick={() => setShowReadingForm(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAddReading} className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Ko'rsatkich (kVt·soat) *</label>
                <input type="number" step="0.01" min="0" value={readingForm.reading} onChange={e => setReadingForm(f => ({ ...f, reading: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm" />
                {meter.lastReading != null && <p className="text-xs text-gray-400 mt-1">Oxirgi: {meter.lastReading}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Sana *</label>
                <input type="date" value={readingForm.readingDate} onChange={e => setReadingForm(f => ({ ...f, readingDate: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Izoh</label>
                <input value={readingForm.notes} onChange={e => setReadingForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowReadingForm(false)} className="flex-1 sm:flex-none px-4 py-2.5 border rounded-lg text-sm">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (<div><span className="text-gray-500">{label}</span><div className="font-medium mt-0.5">{value || '—'}</div></div>);
}

function PreviewItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 text-blue-500" />
      <div><div className="text-xs text-gray-500">{label}</div><div className="text-sm font-medium">{value || '—'}</div></div>
    </div>
  );
}