import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { transformersApi, regionsApi } from '@/api/client';
import { Map as MapIcon, Layers, Search, Navigation } from 'lucide-react';

const markerIcon = (status: string) => {
  const colors: Record<string, string> = {
    OPERATIONAL: '#22c55e',  // yashil
    WARNING: '#eab308',      // sariq
    CRITICAL: '#ef4444',     // qizil
    OFFLINE: '#9ca3af',      // kulrang
  };
  const color = colors[status] || '#9ca3af';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Google Maps navigatsiya ochish
const openNavigation = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, '_blank');
};

export default function MapPage() {
  const navigate = useNavigate();
  const [transformers, setTransformers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [satellite, setSatellite] = useState(false);
  const [showPolygons, setShowPolygons] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

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
    if (statusFilter && t.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.inventoryNumber?.toLowerCase().includes(q) ||
      t.address?.toLowerCase().includes(q) ||
      t.region?.name?.toLowerCase().includes(q) ||
      t.networkName?.toLowerCase().includes(q);
  });

  const statusLabel: Record<string, string> = { OPERATIONAL: 'Normal', WARNING: 'Ogohlantirish', CRITICAL: 'Kritik', OFFLINE: 'Oflayn' };
  const statusColor: Record<string, string> = {
    OPERATIONAL: '#22c55e',
    WARNING: '#eab308',
    CRITICAL: '#ef4444',
    OFFLINE: '#9ca3af',
  };

  return (
    <div>
      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-1"><MapIcon className="w-3.5 h-3.5" /> MAP LAYER</div>
            <h1 className="text-xl font-bold">Geospatial Overview</h1>
            <p className="text-sm text-gray-500">Batafsil xarita (OpenStreetMap)</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Qidirish..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-56 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Barchasi</option>
              <option value="OPERATIONAL">Normal</option>
              <option value="WARNING">Ogohlantirish</option>
              <option value="CRITICAL">Kritik</option>
              <option value="OFFLINE">Oflayn</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showPolygons} onChange={e => setShowPolygons(e.target.checked)} />
              Hududlar chegarasi
            </label>
            <button onClick={() => setSatellite(!satellite)} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"><Layers className="w-4 h-4" />{satellite ? 'Xarita' : 'Sputnik'}</button>
            <span className="text-sm text-gray-500">{filtered.length} ta</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          {Object.entries(statusLabel).map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${statusFilter === key ? 'bg-gray-100 border-gray-400' : 'border-transparent'}`}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor[key] }} />{label}
            </button>
          ))}
          {showPolygons && regions.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 ml-4">
              <span className="w-4 h-2 border-2 border-red-600 bg-red-500/20" />
              Hudud chegarasi
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)' }}>
        <div className="flex-1 rounded-xl overflow-hidden border">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : (
            <MapContainer center={[41.3, 69.3]} zoom={6} className="h-full w-full">
              <TileLayer url={satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />

              {showPolygons && regions.map(r => (
                <Polygon key={r.id} positions={r.polygonCoords}
                  pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.1, weight: 2 }}>
                  <Popup>
                    <div className="text-sm">
                      <strong>{r.name}</strong><br />
                      Kod: {r.code}<br />
                      Aholi: {r.population?.toLocaleString()}<br />
                      Maydon: {r.areaKm2} km²
                    </div>
                  </Popup>
                </Polygon>
              ))}

              {filtered.map(t => (
                <Marker key={t.id} position={[t.latitude, t.longitude]} icon={markerIcon(t.status)} eventHandlers={{ click: () => setSelected(t) }}>
                  <Popup>
                    <div className="text-sm min-w-[220px]">
                      <div className="font-bold text-base mb-1">{t.inventoryNumber}</div>
                      <div className="text-gray-600">{t.model} • {t.capacityKva} kVA</div>
                      {t.networkName && <div className="text-gray-500 text-xs">Tarmoq: {t.networkName}</div>}
                      <div className="text-gray-500 text-xs mt-1">{t.region?.name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor[t.status] }} />
                        <span className="text-xs font-medium">{statusLabel[t.status]}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Salomatlik: {t.healthScore}%</div>
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

        <div className="w-80 bg-white rounded-xl border overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b sticky top-0 bg-white z-10"><h2 className="font-semibold">Transformatorlar ({filtered.length})</h2></div>
          <div className="divide-y">
            {filtered.map(t => (
              <div key={t.id} onClick={() => setSelected(t)} className={`p-4 cursor-pointer hover:bg-blue-50 transition ${selected?.id === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-blue-700">{t.inventoryNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: statusColor[t.status] + '20', color: statusColor[t.status] }}>{statusLabel[t.status]}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>Hudud: {t.region?.name}</div>
                  {t.networkName && <div>Tarmoq: {t.networkName}</div>}
                  <div>Quvvat: {t.capacityKva} kVA</div>
                  <div>Salomatlik: {t.healthScore}%</div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/transformers/${t.id}`); }} className="flex-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">Batafsil</button>
                  <button onClick={(e) => { e.stopPropagation(); openNavigation(t.latitude, t.longitude); }} className="flex items-center justify-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700">
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