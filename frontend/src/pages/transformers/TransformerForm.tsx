import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transformersApi, regionsApi, districtsApi, substationsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { ArrowLeft, MapPin, X, Camera } from 'lucide-react';
import MapPicker from '@/components/map/MapPicker';

const MAX_PHOTOS = 5;

const photoUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  return base ? base + url : url;
};

// Rasmni siqib base64'ga o'giradi
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

export default function TransformerForm() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [substations, setSubstations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [form, setForm] = useState({
    inventoryNumber: '', model: '', manufacturer: '', networkName: '',
    regionId: user?.regionId || '', districtId: '', substationId: '',
    latitude: 41.2995, longitude: 69.2401, address: '',
    capacityKva: 100, manufactureYear: 2026,
    installationDate: new Date().toISOString().split('T')[0],
    connectedHouseholds: 0, estimatedPopulation: 0, areaType: 'ETK tasarrufidagi',
    status: 'OPERATIONAL', healthScore: 95, notes: '', photoUrl: '',
  });

  useEffect(() => { loadRegions(); }, []);
  useEffect(() => { if (form.regionId) { loadDistricts(form.regionId); loadSubstations(form.regionId); } }, [form.regionId]);
  useEffect(() => { if (isEdit) loadTransformer(); }, [id]);

  const loadRegions = async () => { try { const r = await regionsApi.all(); setRegions(r.data.data); } catch {} };
  const loadDistricts = async (rid: string) => { try { const r = await districtsApi.byRegion(rid); setDistricts(r.data.data); } catch {} };
  const loadSubstations = async (rid: string) => { try { const r = await substationsApi.byRegion(rid); setSubstations(r.data.data); } catch {} };
  const loadTransformer = async () => {
    setLoading(true);
    try {
      const res = await transformersApi.get(id!);
      const t = res.data.data;
      setForm({ inventoryNumber: t.inventoryNumber||'', model: t.model||'', manufacturer: t.manufacturer||'',
        networkName: t.networkName||'',
        regionId: t.regionId||'', districtId: t.districtId||'', substationId: t.substationId||'',
        latitude: t.latitude||41.2995, longitude: t.longitude||69.2401, address: t.address||'',
        capacityKva: t.capacityKva||100, manufactureYear: t.manufactureYear||2026,
        installationDate: t.installationDate ? t.installationDate.split('T')[0] : '',
        connectedHouseholds: t.connectedHouseholds||0, estimatedPopulation: t.estimatedPopulation||0,
        areaType: t.areaType||'ETK tasarrufidagi', status: t.status||'OPERATIONAL', healthScore: t.healthScore||95,
        notes: t.notes||'', photoUrl: t.photoUrl||'' });
      const existing = Array.isArray(t.photos) && t.photos.length ? t.photos : (t.photoUrl ? [t.photoUrl] : []);
      setPhotos(existing);
    } catch {} finally { setLoading(false); }
  };

  const update = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));
  const handleMapSelect = (lat: number, lng: number, addr?: string) => setForm(f => ({ ...f, latitude: lat, longitude: lng, address: addr || f.address }));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const freeSlots = MAX_PHOTOS - photos.length;
    if (freeSlots <= 0) { alert(`Ko'pi bilan ${MAX_PHOTOS} ta rasm`); return; }
    const selected = files.slice(0, freeSlots);
    try {
      const base64List = await Promise.all(selected.map(f => fileToCompressedBase64(f)));
      setPhotos(prev => [...prev, ...base64List]);
    } catch { alert("Rasmni o'qishda xatolik"); }
  };
  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, photoUrl: photos[0] || '', photos,
        capacityKva: Number(form.capacityKva), manufactureYear: Number(form.manufactureYear),
        connectedHouseholds: Number(form.connectedHouseholds), estimatedPopulation: Number(form.estimatedPopulation),
        healthScore: Number(form.healthScore), latitude: Number(form.latitude), longitude: Number(form.longitude) };
      if (isEdit) await transformersApi.update(id!, data);
      else await transformersApi.create(data);
      navigate('/transformers');
    } catch (err: any) { alert(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Transformatorni tahrirlash' : 'Yangi Transformator Qo\'shish'}</h1>
          <p className="text-sm text-gray-500">{isEdit ? 'Ma\'lumotlarni yangilang' : 'Formani to\'ldiring'}</p>
        </div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> Orqaga</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Sec n={1} t="Asosiy Ma'lumotlar">
          <div className="grid grid-cols-2 gap-4">
            <Inp l="Inventar Raqami *" v={form.inventoryNumber} c={v=>update('inventoryNumber',v)} p="Masalan: T-001" />
            <Inp l="Model" v={form.model} c={v=>update('model',v)} p="Transformator modeli" />
            <Inp l="Ustachilik bo'lagi nomi" v={form.manufacturer} c={v=>update('manufacturer',v)} />
            <Sel l="Viloyat *" v={form.regionId} c={v=>update('regionId',v)} o={regions.map(r=>({v:r.id,l:r.name}))} dis={user?.role==='EMPLOYEE'} />
            <Sel l="Tuman" v={form.districtId} c={v=>update('districtId',v)} o={districts.map(d=>({v:d.id,l:d.name}))} />
            <Sel l="Podstansiya" v={form.substationId} c={v=>update('substationId',v)} o={substations.map(s=>({v:s.id,l:s.name}))} />
            <Inp l="Tarmoq nomi" v={form.networkName} c={v=>update('networkName',v)} p="Masalan: GKTP, SKTP, KTP..." full />
          </div>
        </Sec>

        <Sec n={2} t="Joylashuv">
          <Inp l="Manzil" v={form.address} c={v=>update('address',v)} p="To'liq manzilni kiriting" full />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Inp l="Latitude *" v={form.latitude} c={v=>update('latitude',v)} ty="number" />
            <Inp l="Longitude *" v={form.longitude} c={v=>update('longitude',v)} ty="number" />
          </div>
          <button type="button" onClick={()=>setMapOpen(true)} className="mt-3 w-full p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-sm text-blue-700 hover:bg-blue-100">
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Xarita orqali aniqlash osonroq</span>
            <span className="font-medium">Xaritadan tanlash</span>
          </button>
        </Sec>

        <Sec n={3} t="Transformator Suratlari">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 mb-3">
              {photos.map((src, i) => (
                <div key={i} className="relative">
                  <img src={photoUrl(src)} alt={`rasm ${i+1}`} className="w-24 h-24 rounded-lg object-cover border" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded">Asosiy</span>}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <div className="flex flex-col gap-1">
                  <label className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500">
                    <Camera className="w-6 h-6" /><span className="text-[10px] mt-1">Galereya</span>
                    <input type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />
                  </label>
                  <label className="text-[10px] text-center text-blue-500 cursor-pointer hover:underline">
                    Kamera
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                  </label>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Ko'pi bilan {MAX_PHOTOS} ta rasm ({photos.length}/{MAX_PHOTOS}). Birinchi rasm asosiy hisoblanadi. "Galereya" orqali bir martada bir nechta rasm tanlash mumkin.</p>
          </div>
        </Sec>

        <Sec n={4} t="Aholi va Ist'molchilar">
          <div className="grid grid-cols-2 gap-4">
            <Inp l="Ulangan Xonadonlar" v={form.connectedHouseholds} c={v=>update('connectedHouseholds',v)} ty="number" />
            <Inp l="Taxminiy Aholi" v={form.estimatedPopulation} c={v=>update('estimatedPopulation',v)} ty="number" />
          </div>
          <div className="mt-4"><Sel l="Hudud Turi" v={form.areaType} c={v=>update('areaType',v)} o={[{v:'ETK tasarrufidagi',l:'ETK tasarrufidagi'},{v:'Yuridik iste\'molchi',l:'Yuridik iste\'molchi'},{v:'Byudjet',l:'Byudjet'}]} /></div>
        </Sec>

        <Sec n={5} t="Texnik Xususiyatlar">
          <div className="grid grid-cols-2 gap-4">
            <Inp l="Quvvat (kVA) *" v={form.capacityKva} c={v=>update('capacityKva',v)} ty="number" />
            <Inp l="Ishlab Chiqarilgan Yili" v={form.manufactureYear} c={v=>update('manufactureYear',v)} ty="number" />
            <Inp l="O'rnatilgan Sana" v={form.installationDate} c={v=>update('installationDate',v)} ty="date" />
            <Inp l="Salomatlik (%)" v={form.healthScore} c={v=>update('healthScore',v)} ty="number" />
          </div>
        </Sec>

        <Sec n={6} t="Holat">
          <Sel l="Holati" v={form.status} c={v=>update('status',v)} o={[{v:'OPERATIONAL',l:'Ishlayapti'},{v:'WARNING',l:'Ogohlantirish'},{v:'CRITICAL',l:'Kritik'},{v:'OFFLINE',l:'O\'chgan'}]} />
        </Sec>

        <Sec n={7} t="Qo'shimcha">
          <label className="block text-sm font-medium text-gray-700 mb-1">Izohlar</label>
          <textarea value={form.notes} onChange={e=>update('notes',e.target.value)} rows={3} placeholder="Qo'shimcha ma'lumotlar..." className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
        </Sec>

        <div className="flex items-center gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={()=>navigate(-1)} className="px-6 py-2.5 border rounded-xl text-sm">Bekor</button>
          <button type="submit" disabled={saving} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </form>
      <MapPicker isOpen={mapOpen} onClose={()=>setMapOpen(false)} onSelect={handleMapSelect} initialLat={Number(form.latitude)} initialLng={Number(form.longitude)} />
    </div>
  );
}

function Sec({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (<div className="bg-white rounded-xl border p-6"><h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">{n}</span>{t}</h2>{children}</div>);
}
function Inp({ l, v, c, p, ty = 'text', full = false, dis = false }: any) {
  return (<div className={full?'col-span-2':''}><label className="block text-sm font-medium text-gray-700 mb-1">{l}</label><input type={ty} value={v} onChange={e=>c(e.target.value)} placeholder={p} disabled={dis} step={ty==='number'?'any':undefined} className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" /></div>);
}
function Sel({ l, v, c, o, dis, full }: any) {
  return (<div className={full?'col-span-2':''}><label className="block text-sm font-medium text-gray-700 mb-1">{l}</label><select value={v} onChange={e=>c(e.target.value)} disabled={dis} className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"><option value="">Tanlang</option>{o?.map((x:any)=><option key={x.v} value={x.v}>{x.l}</option>)}</select></div>);
}