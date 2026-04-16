import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { transformersApi } from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Edit, MapPin, Zap, Users, Activity, AlertTriangle, Wrench, Calendar, Building2 } from 'lucide-react';

const markerIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function TransformerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isReadOnly = user?.role === 'INSPECTOR';

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try { const r = await transformersApi.get(id!); setData(r.data.data); } catch { navigate('/transformers'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!data) return null;

  const statusCls: Record<string, string> = { OPERATIONAL: 'badge-operational', WARNING: 'badge-warning', CRITICAL: 'badge-critical', OFFLINE: 'badge-offline' };
  const riskCls: Record<string, string> = { LOW: 'text-emerald-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-500', CRITICAL: 'text-red-700' };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/transformers')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">{data.inventoryNumber} <span className={`text-sm px-2 py-0.5 rounded-full ${statusCls[data.status]}`}>{data.status}</span></h1>
            <p className="text-sm text-gray-500">{data.model} • {data.manufacturer || 'Noma\'lum ishlab chiqaruvchi'}</p>
          </div>
        </div>
        {!isReadOnly && (
          <Link to={`/transformers/${id}/edit`} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Edit className="w-4 h-4" /> Tahrirlash
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Info cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniCard icon={Zap} label="Quvvat" value={`${data.capacityKva} kVA`} color="blue" />
            <MiniCard icon={Activity} label="Salomatlik" value={`${data.healthScore}%`} color={data.healthScore > 70 ? 'emerald' : data.healthScore > 40 ? 'amber' : 'red'} />
            <MiniCard icon={Users} label="Xonadonlar" value={data.connectedHouseholds} color="purple" />
            <MiniCard icon={AlertTriangle} label="Risk" value={data.riskLevel} color={data.riskLevel === 'LOW' ? 'emerald' : 'red'} />
          </div>

          {/* Transformator rasmi */}
          {data.photoUrl && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4">Transformator surati</h2>
              <img src={data.photoUrl} alt={data.inventoryNumber} className="max-h-96 rounded-lg mx-auto border" />
            </div>
          )}

          {/* Asosiy ma'lumotlar */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-4">Asosiy ma'lumotlar</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <Info label="Inventar raqami" value={data.inventoryNumber} />
              <Info label="Model" value={data.model} />
              <Info label="Ishlab chiqaruvchi" value={data.manufacturer} />
              <Info label="Ishlab chiqarilgan yili" value={data.manufactureYear} />
              <Info label="O'rnatilgan sana" value={data.installationDate ? new Date(data.installationDate).toLocaleDateString('uz') : '—'} />
              <Info label="Hudud turi" value={data.areaType} />
              <Info label="Yuklama" value={`${data.loadPercent || 0}%`} />
              <Info label="Onlayn" value={data.isOnline ? 'Ha' : 'Yo\'q'} />
            </div>
          </div>

          {/* Joylashuv */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" /> Joylashuv</h2>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <Info label="Viloyat" value={data.region?.name} />
              <Info label="Tuman" value={data.district?.name} />
              <Info label="Podstansiya" value={data.substation?.name} />
              <Info label="Manzil" value={data.address} />
              <Info label="Koordinata" value={`${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)}`} />
            </div>
            <div className="h-64 rounded-xl overflow-hidden border">
              <MapContainer center={[data.latitude, data.longitude]} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[data.latitude, data.longitude]} icon={markerIcon} />
              </MapContainer>
            </div>
          </div>

          {/* Oxirgi ogohlantirishlar */}
          {data.alerts && data.alerts.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Oxirgi ogohlantirishlar</h2>
              <div className="space-y-2">
                {data.alerts.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div><span className="font-medium">{a.title}</span><span className="text-xs text-gray-500 ml-2">{new Date(a.createdAt).toLocaleDateString('uz')}</span></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700' : a.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>{a.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Texnik xizmat tarixi */}
          {data.maintenance && data.maintenance.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-gray-600" /> Texnik xizmat tarixi</h2>
              <div className="space-y-2">
                {data.maintenance.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div><span className="font-medium">{m.workType}</span><span className="text-xs text-gray-500 ml-2">{m.description}</span></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Live Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 sticky top-6">
            <h3 className="font-semibold mb-4">Live Preview</h3>
            <div className="space-y-4">
              <PreviewItem icon={Zap} label="Transformer ID" value={data.inventoryNumber} />
              <PreviewItem icon={MapPin} label="Location" value={data.address || `${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`} color="red" />
              <PreviewItem icon={Users} label="Connected Households" value={`${data.connectedHouseholds} households`} />

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Capacity</span><span className="font-bold">{data.capacityKva} kVA</span></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Load</span><span>{data.loadPercent || 0}%</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: `${data.loadPercent || 0}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Capacity per Household</span><span>{data.connectedHouseholds ? Math.round(data.capacityKva / data.connectedHouseholds * 100) / 100 : 0} kVA</span></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Health Score</span><span className={`font-bold ${data.healthScore > 70 ? 'text-emerald-600' : 'text-red-600'}`}>{data.healthScore}%</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${data.healthScore > 70 ? 'bg-emerald-500' : data.healthScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${data.healthScore}%` }} /></div>
              </div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Risk Level</span><span className={`font-medium ${riskCls[data.riskLevel]}`}>{data.riskLevel}</span></div>
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${data.status === 'OPERATIONAL' ? 'bg-emerald-500' : data.status === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`} /><span>Status</span><span className="ml-auto font-medium">{data.status}</span></div>
              </div>

              {/* Statistika */}
              {data._count && (
                <div className="border-t pt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="font-bold text-lg">{data._count.alerts}</div>Alertlar</div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="font-bold text-lg">{data._count.maintenance}</div>Xizmatlar</div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="font-bold text-lg">{data._count.inspections}</div>Tekshiruvlar</div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="font-bold text-lg">{data._count.incidents}</div>Hodisalar</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = { blue: 'text-blue-600', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600', purple: 'text-purple-600' };
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-500">{label}</span><Icon className={`w-4 h-4 ${colors[color]}`} /></div>
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (<div><span className="text-gray-500">{label}</span><div className="font-medium mt-0.5">{value || '—'}</div></div>);
}

function PreviewItem({ icon: Icon, label, value, color = 'blue' }: any) {
  return (
    <div className="flex items-start gap-3"><Icon className={`w-4 h-4 mt-0.5 text-${color}-500`} /><div><div className="text-xs text-gray-500">{label}</div><div className="text-sm font-medium">{value || '—'}</div></div></div>
  );
}
