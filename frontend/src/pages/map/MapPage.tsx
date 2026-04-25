import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { transformersApi, regionsApi } from '@/api/client';
import { Layers, Search, Navigation, Filter, MapIcon, List } from 'lucide-react';

const markerIcon = (healthScore: number) => {
  let color = '#22c55e';
  if (healthScore < 50) color = '#ef4444';
  else if (healthScore < 80) color = '#eab308';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const openNavigation = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
};

const getHealthLabel = (score: number) => score >= 80 ? 'Yaxshi' : score >= 50 ? 'O\'rtacha' : 'Yomon';
const getHealthColor = (score: number) => score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

export default function MapPage() {
  const navigate = useNavigate();
  const [transformers, setTransformers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [satellite, setSatellite] = useState(false);
  const [showPolygons, setShowPolygons] = useState(true);
  const [healthFilter, setHealthFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [t, r] = await Promise.all([transformersApi.map(), regionsApi.list({ limit: 50 })]);
      setTransformers(t.data.data);
      setRegions(r.data.data.filter((x: any) => x.polygonCoords && Array.isArray(x.polygonCoords) && x.polygonCoords.length >= 3));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = transformers.filter(t => {
    if (healthFilter === 'good' && t.healthScore < 80) return false;
    if (healthFilter === 'medium' && (t.healthScore < 50 || t.healthScore >= 80)) return false;
    if (healthFilter === 'bad' && t.healthScore >= 50) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.inventoryNumber?.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q) ||
      t.region?.name?.toLowerCase().includes(q) || t.networkName?.toLowerCase().includes(q);
  });

  const MapContent = () => (
    <MapContainer center={[41.3, 69.3]} zoom={6} className="h-full w-full">
      <TileLayer url={satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
      {showPolygons && regions.map(r => (
        <Polygon key={r.id} positions={r.polygonCoords} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.1, weight: 2 }}>
          <Popup><div className="text-sm"><strong>{r.name}</strong><br />Aholi: {r.population?.toLocaleString()}</div></Popup>
        </Polygon>
      ))}
      {filtered.map(t => (
        <Marker key={t.id} position={[t.latitude, t.longitude]} icon={markerIcon(t.healthScore || 100)} eventHandlers={{ click: () => setSelected(t) }}>
          <Popup>
            <div className="text-sm min-w-[200px]">
              <div className="font-bold text-base mb-1">{t.inventoryNumber}</div>
              <div className="text-gray-600">{t.model} • {t.capacityKva} kVA</div>
              {t.networkName && <div className="text-gray-500 text-xs">Tarmoq: {t.networkName}</div>}
              <div className="text-gray-500 text-xs mt-1">{t.region?.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getHealthColor(t.healthScore || 100) }} />
                <span className="text-xs font-medium">{t.healthScore}% ({getHealthLabel(t.healthScore || 100)})</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => navigate(`/transformers/${t.id}`)} className="flex-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">Batafsil</button>
                <button onClick={() => openNavigation(t.latitude, t.longitude)} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                  <Navigation className="w-3 h-3" /> Yo'l
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );

  const ListContent = () => (
    <div className="divide-y overflow-y-auto h-full bg-white">
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">Transformator topilmadi</div>
      ) : filtered.map(t => (
        <div key={t.id} className="p-3 md:p-4 hover:bg-blue-50 transition cursor-pointer" onClick={() => { setSelected(t); setMobileTab('map'); }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-blue-700">{t.inventoryNumber}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: getHealthColor(t.healthScore||100) + '20', color: getHealthColor(t.healthScore||100) }}>{t.healthScore}%</span>
          </div>
          <div className="text-xs text-gray-500">
            {t.region?.name} • {t.capacityKva} kVA {t.networkName ? `• ${t.networkName}` : ''}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={(e) => { e.stopPropagation(); navigate(`/transformers/${t.id}`); }} className="flex-1 text-xs bg-blue-600 text-white px-2 py-1.5 rounded-lg hover:bg-blue-700 font-medium">Batafsil</button>
            <button onClick={(e) => { e.stopPropagation(); openNavigation(t.latitude, t.longitude); }} className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1.5 rounded-lg hover:bg-green-700 font-medium">
              <Navigation className="w-3 h-3" /> Yo'l
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="-m-3 md:-m-6 flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="bg-white border-b p-2 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base md:text-xl font-bold">Xarita</h1>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-300' : ''}`}>
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={() => setSatellite(!satellite)} className="px-2 py-1.5 border rounded-lg text-xs">{satellite ? 'Xarita' : 'Sputnik'}</button>
            <span className="text-xs text-gray-500">{filtered.length} ta</span>
          </div>
        </div>

        {showFilters && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Qidirish..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[{ k: 'good', l: 'Yaxshi 80%+', c: '#22c55e' }, { k: 'medium', l: '50-80%', c: '#eab308' }, { k: 'bad', l: '50%-', c: '#ef4444' }].map(s => (
                <button key={s.k} onClick={() => setHealthFilter(healthFilter === s.k ? '' : s.k)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${healthFilter === s.k ? 'bg-gray-100 border-gray-400' : 'border-gray-200'}`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />{s.l}
                </button>
              ))}
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={showPolygons} onChange={e => setShowPolygons(e.target.checked)} className="w-3 h-3" />Chegaralar</label>
            </div>
          </div>
        )}

        {/* Mobil tablar */}
        <div className="md:hidden flex mt-2 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setMobileTab('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${mobileTab === 'map' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Xarita
          </button>
          <button onClick={() => setMobileTab('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${mobileTab === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            Ro'yxat ({filtered.length})
          </button>
        </div>
      </div>

      {/* Kontent */}
      <div className="flex-1 flex min-h-0">
        {/* Mobilda tab bo'yicha */}
        <div className="md:hidden flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : mobileTab === 'map' ? (
            <div className="h-full"><MapContent /></div>
          ) : (
            <ListContent />
          )}
        </div>

        {/* Desktop — xarita + yon panel */}
        <div className="hidden md:flex flex-1 min-h-0">
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full bg-gray-100"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : (
              <MapContent />
            )}
          </div>
          <div className="w-80 bg-white border-l overflow-y-auto flex-shrink-0">
            <div className="p-3 border-b sticky top-0 bg-white z-10"><h2 className="font-semibold text-sm">Transformatorlar ({filtered.length})</h2></div>
            <ListContent />
          </div>
        </div>
      </div>
    </div>
  );
}