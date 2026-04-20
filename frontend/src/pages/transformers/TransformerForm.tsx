import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transformersApi, regionsApi, districtsApi, substationsApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { ArrowLeft, MapPin, Upload, X, Image, Camera } from 'lucide-react';
import MapPicker from '@/components/map/MapPicker';
import api from '@/api/client';

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    inventoryNumber: '', model: '', manufacturer: '', networkName: '',
    regionId: user?.regionId || '', districtId: '', substationId: '',
    latitude: 41.2995, longitude: 69.2401, address: '',
    capacityKva: 100, manufactureYear: 2026,
    installationDate: new Date().toISOString().split('T')[0],
    connectedHouseholds: 0, estimatedPopulation: 0, areaType: 'Turar joy',
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
      setForm({ inventoryNumber: t.inventoryNumber||'', model: t.model||'', manufacturer: t.manufacturer||'', networkName: t.networkName||'',
        networkName: t.networkName||'',
        regionId: t.regionId||'', districtId: t.districtId||'', substationId: t.substationId||'',
        latitude: t.latitude||41.2995, longitude: t.longitude||69.2401, address: t.address||'',
        capacityKva: t.capacityKva||100, manufactureYear: t.manufactureYear||2026,
        installationDate: t.installationDate ? t.installationDate.split('T')[0] : '',
        connectedHouseholds: t.connectedHouseholds||0, estimatedPopulation: t.estimatedPopulation||0,
        areaType: t.areaType||'Turar joy', status: t.status||'OPERATIONAL', healthScore: t.healthScore||95,
        notes: t.notes||'', photoUrl: t.photoUrl||'' });
      if (t.photoUrl) {
        const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
        setPhotoPreview(t.photoUrl.startsWith('http') ? t.photoUrl : (base ? base + t.photoUrl : t.photoUrl));
      }
    } catch {} finally { setLoading(false); }
  };

  const update = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));
  const handleMapSelect = (lat: number, lng: number, addr?: string) => setForm(f => ({ ...f, latitude: lat, longitude: lng, address: addr || f.address }));

  // Rasm tanlash (galereyadan yoki kameradan)
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const r = new FileReader();
      r.onload = () => setPhotoPreview(r.result as string);
      r.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    update('photoUrl', '');
  };

  // Rasmni serverga yuklash
  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile) return form.photoUrl;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.url;
    } catch {
      console.error('Rasm yuklashda xatolik');
      return '';
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Avval rasmni yuklash
      let photoUrl = form.photoUrl;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      const data = {
        ...form,
        photoUrl,
        capacityKva: Number(form.capacityKva), manufactureYear: Number(form.manufactureYear),
        connectedHouseholds: Number(form.connectedHouseholds), estimatedPopulation: Number(form.estimatedPopulation),
        healthScore: Number(form.healthScore), latitude: Number(form.latitude), longitude: Number(form.longitude),
      };

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
        {/* 1 - Asosiy */}
        <Sec n={1} t="Asosiy Ma'lumotlar">
          <div className="grid grid-cols-2 gap-4">
            <Inp l="Inventar Raqami *" v={form.inventoryNumber} c={v=>update('inventoryNumber',v)} p="Masalan: T-001" />
            <Inp l="Model" v={form.model} c={v=>update('model',v)} p="Transformator modeli" />
            <Inp l="Ishlab Chiqaruvchi" v={form.manufacturer} c={v=>update('manufacturer',v)} />
            <Sel l="Viloyat *" v={form.regionId} c={v=>update('regionId',v)} o={regions.map(r=>({v:r.id,l:r.name}))} dis={user?.role==='EMPLOYEE'} />
            <Sel l="Tuman" v={form.districtId} c={v=>update('districtId',v)} o={districts.map(d=>({v:d.id,l:d.name}))} />
            <Sel l="Podstansiya" v={form.substationId} c={v=>update('substationId',v)} o={substations.map(s=>({v:s.id,l:s.name}))} />
            <Inp l="Tarmoq nomi" v={form.networkName} c={v=>update('networkName',v)} p="Tarmoq nomini kiriting" full />
          </div>
        </Sec>

        {/* 2 - Joylashuv */}
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

        {/* 3 - Rasm */}
        <Sec n={3} t="Transformator Surati">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Preview" className="max-h-48 rounded-lg mx-auto" />
                <button type="button" onClick={removePhoto} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <div><Image className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-sm font-medium text-gray-700">Rasmni tashlang yoki tanlang</p><p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP — galereyadan yoki kameradan</p></div>
            )}
            <div className="flex items-center justify-center gap-3 mt-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4" /> Galereyadan
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                <Camera className="w-4 h-4" /> Kameradan
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
              </label>
            </div>
          </div>
        </Sec>

        {/* 4 - Aholi */}
        <Sec n={4} t="Aholi va Ist'molchilar">
          <div className="grid grid-cols-2 gap-4">
            <Inp l="Ulangan Xonadonlar" v={form.connectedHouseholds} c={v=>update('connectedHouseholds',v)} ty="number" />
            <Inp l="Taxminiy Aholi" v={form.estimatedPopulation} c={v=>update('estimatedPopulation',v)} ty="number" />
          </div>
          <div className="mt-4"><Sel l="Hudud Turi" v={form.areaType} c={v=>update('areaType',v)} o={[{v:'Turar joy',l:'Turar joy'},{v:'Sanoat',l:'Sanoat'},{v:'Savdo',l:'Savdo'},{v:'Qishloq',l:'Qishloq'}]} /></div>
        </Sec>

        {/* 5 - Texnik */}
        <Sec n={5} t="Texnik Xususiyatlar">
          <div className="grid grid-cols-2 gap-4">
            <Inp l="Quvvat (kVA) *" v={form.capacityKva} c={v=>update('capacityKva',v)} ty="number" />
            <Inp l="Ishlab Chiqarilgan Yili" v={form.manufactureYear} c={v=>update('manufactureYear',v)} ty="number" />
            <Inp l="O'rnatilgan Sana" v={form.installationDate} c={v=>update('installationDate',v)} ty="date" />
            <Inp l="Salomatlik (%)" v={form.healthScore} c={v=>update('healthScore',v)} ty="number" />
          </div>
        </Sec>

        {/* 6 - Holat */}
        <Sec n={6} t="Holat">
          <Sel l="Holati" v={form.status} c={v=>update('status',v)} o={[{v:'OPERATIONAL',l:'Ishlayapti'},{v:'WARNING',l:'Ogohlantirish'},{v:'CRITICAL',l:'Kritik'},{v:'OFFLINE',l:'O\'chgan'}]} />
        </Sec>

        {/* 7 - Izoh */}
        <Sec n={7} t="Qo'shimcha">
          <label className="block text-sm font-medium text-gray-700 mb-1">Izohlar</label>
          <textarea value={form.notes} onChange={e=>update('notes',e.target.value)} rows={3} placeholder="Qo'shimcha ma'lumotlar..." className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
        </Sec>

        {/* Buttons */}
        <div className="flex items-center gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={()=>navigate(-1)} className="px-6 py-2.5 border rounded-xl text-sm">Bekor</button>
          <button type="submit" disabled={saving || uploading} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {uploading ? 'Rasm yuklanmoqda...' : saving ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Yaratish'}
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
function Sel({ l, v, c, o, dis }: any) {
  return (<div><label className="block text-sm font-medium text-gray-700 mb-1">{l}</label><select value={v} onChange={e=>c(e.target.value)} disabled={dis} className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"><option value="">Tanlang</option>{o?.map((x:any)=><option key={x.v} value={x.v}>{x.l}</option>)}</select></div>);
}
