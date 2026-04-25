import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { transformersApi, regionsApi } from '@/api/client';
import { Map as MapIcon, Layers, Search, Navigation, ChevronUp, ChevronDown, Filter } from 'lucide-react';

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
  const [showList, setShowList] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  return (
    <div className="-m-3 md:-m-6">
      {/* Header */}
      <div className="bg-white border-b p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate">Xarita</h1>
            <p className="text-xs text-gray-500 hidden md:block">Batafsil xarita (OpenStreetMap)</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 px-2 py-1.5 border rounded-lg text-xs md:text-sm hover:bg-gray-50">
              <Filter className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Filtr</span>
            </button>
            <button onClick={() => setSatellite(!satellite)} className="flex items-center gap-1 px-2 py-1.5 border rounded-lg text-xs md:text-sm hover:bg-gray-50">
              <Layers className="w-3.5 h-3.5" /> {satellite ? 'Xarita' : 'Sputnik'}
            </button>
            <span className="text-xs text-gray-500">{filtered.length} ta</span>
          </div>
        </div>

        {/* Filtrlar — ochiq/yopiq */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Qidirish..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
                <option value="">Barchasi</option>
                <option value="good">Yaxshi (80%+)</option>
                <option value="medium">O'rtacha (50-80%)</option>
                <option value="bad">Yomon (50%-)</option>
              </select>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={showPolygons} onChange={e => setShowPolygons(e.target.checked)} className="w-3.5 h-3.5" />
                Chegaralar
              </label>
            </div>
            <div className="flex items-center gap-3">
              {[{ k: 'good', l: 'Yaxshi', c: '#22c55e' }, { k: 'medium', l: 'O\'rtacha', c: '#eab308' }, { k: 'bad', l: 'Yomon', c: '#ef4444' }].map(s => (
                <button key={s.k} onClick={() => setHealthFilter(healthFilter === s.k ? '' : s.k)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${healthFilter === s.k ? 'bg-gray-100 border-gray-400' : 'border-transparent'}`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />{s.l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Xarita + Ro'yxat */}
      <div className="md:flex" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Xarita */}
        <div className="w-full md:flex-1 h-[50vh] md:h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : (
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
          )}
        </div>

        {/* Mobilda ro'yxatni ochish/yopish tugmasi */}
        <button onClick={() => setShowList(!showList)}
          className="md:hidden w-full py-2 bg-white border-t flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
          {showList ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          Transformatorlar ({filtered.length})
        </button>

        {/* Ro'yxat paneli */}
        <div className={`
          ${showList ? 'max-h-[40vh]' : 'max-h-0 overflow-hidden'}
          md:max-h-full md:w-80 md:overflow-visible
          bg-white md:border-l overflow-y-auto transition-all duration-300 flex-shrink-0
        `}>
          <div className="p-3 border-b sticky top-0 bg-white z-10 hidden md:block">
            <h2 className="font-semibold text-sm">Transformatorlar ({filtered.length})</h2>
          </div>
          <div className="divide-y">
            {filtered.map(t => (
              <div key={t.id} onClick={() => setSelected(t)} className={`p-3 cursor-pointer hover:bg-blue-50 transition ${selected?.id === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-blue-700">{t.inventoryNumber}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: getHealthColor(t.healthScore||100) + '20', color: getHealthColor(t.healthScore||100) }}>{t.healthScore}%</span>
                </div>
                <div className="text-xs text-gray-500">
                  {t.region?.name} • {t.capacityKva} kVA
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/transformers/${t.id}`); }} className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700">Batafsil</button>
                  <button onClick={(e) => { e.stopPropagation(); openNavigation(t.latitude, t.longitude); }} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700">
                    <Navigation className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}