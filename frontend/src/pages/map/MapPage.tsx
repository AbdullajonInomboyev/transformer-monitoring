import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { transformersApi, regionsApi, powerApi } from '@/api/client';
import { Filter, Navigation, Search, GitBranch, Trash2, X, Plus } from 'lucide-react';

// ============================================================
// IKONLAR
// ============================================================
const transformerIcon = (healthScore: number) => {
  let color = '#22c55e';
  if (healthScore < 50) color = '#ef4444';
  else if (healthScore < 80) color = '#eab308';
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const poleIcon = (active: boolean) => L.divIcon({
  className: '',
  html: `<div style="width:${active ? 20 : 14}px;height:${active ? 20 : 14}px;background:${active ? '#f97316' : '#64748b'};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;transition:all 0.15s"></div>`,
  iconSize: [active ? 20 : 14, active ? 20 : 14],
  iconAnchor: [active ? 10 : 7, active ? 10 : 7],
});

const getNodeCoords = (
  type: 'transformer' | 'pole', id: string,
  transformers: any[], poles: any[]
): [number, number] | null => {
  if (type === 'transformer') {
    const t = transformers.find(x => x.id === id);
    return t ? [t.latitude, t.longitude] : null;
  }
  const p = poles.find(x => x.id === id);
  return p ? [p.latitude, p.longitude] : null;
};

// ============================================================
// Xarita ichidagi klik handler
// ============================================================
function MapClickHandler({ mode, onMapClick }: { mode: string; onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (mode === 'add-pole') onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ============================================================
// Sahifa ochilganda GPS joylashuvga fly
// ============================================================
function FlyToUserLocation() {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { animate: true, duration: 1.2 });
      },
      () => {
        // Ruxsat berilmasa yoki xato — hech narsa qilmaymiz
      },
      { timeout: 8000 }
    );
  }, [map]);
  return null;
}

// ============================================================
// Tanlangan elementga fly (zoom reset bo'lmaydi)
// ============================================================
function FlyToSelected({ selected }: { selected: any }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);
  useEffect(() => {
    if (selected && selected.id !== prevId.current) {
      prevId.current = selected.id;
      const lat = parseFloat(selected.latitude);
      const lng = parseFloat(selected.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 });
      }
    }
  }, [selected, map]);
  return null;
}

// ============================================================
// ASOSIY KOMPONENT
// ============================================================
export default function MapPage() {
  const navigate = useNavigate();
  const [transformers, setTransformers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [poles, setPoles] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [satellite, setSatellite] = useState(false);
  const [showPolygons, setShowPolygons] = useState(false);
  const [healthFilter, setHealthFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [mode, setMode] = useState<'view' | 'add-pole' | 'draw-line'>('view');
  const [showPolesLayer, setShowPolesLayer] = useState(true);
  const [showLinesLayer, setShowLinesLayer] = useState(true);
  const [lineStart, setLineStart] = useState<{ type: 'transformer' | 'pole'; id: string } | null>(null);
  const [lineType, setLineType] = useState<'MAIN' | 'BRANCH'>('MAIN');
  const [selectedPole, setSelectedPole] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [t, r] = await Promise.all([
        transformersApi.map(),
        regionsApi.list({ limit: 50 }),
      ]);
      setTransformers(t.data.data);
      setRegions(r.data.data.filter((x: any) => x.polygonCoords && Array.isArray(x.polygonCoords) && x.polygonCoords.length >= 3));
    } catch (err) { console.error('Asosiy xato:', err); }
    finally { setLoading(false); }
    // Stalba/liniya — alohida (migration bo'lmasa ham xarita ishlaydi)
    try {
      const [p, l] = await Promise.all([powerApi.getPoles(), powerApi.getLines()]);
      setPoles(p.data.data || []);
      setLines(l.data.data || []);
    } catch (err) { console.warn('Stalba/liniya yuklanmadi:', err); }
  };

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (mode !== 'add-pole') return;
    try {
      const res = await powerApi.createPole({ latitude: lat, longitude: lng });
      setPoles(prev => [...prev, res.data.data]);
    } catch (err) { console.error(err); }
  }, [mode]);

  const handleNodeClick = useCallback((type: 'transformer' | 'pole', id: string) => {
    if (mode !== 'draw-line') return;
    if (!lineStart) { setLineStart({ type, id }); return; }
    if (lineStart.type === type && lineStart.id === id) { setLineStart(null); return; }
    const payload: any = { lineType };
    if (lineStart.type === 'transformer') payload.fromTransformerId = lineStart.id;
    else payload.fromPoleId = lineStart.id;
    if (type === 'transformer') payload.toTransformerId = id;
    else payload.toPoleId = id;
    powerApi.createLine(payload).then(res => {
      setLines(prev => [...prev, res.data.data]);
      setLineStart(null);
    }).catch(console.error);
  }, [mode, lineStart, lineType]);

  const deletePole = useCallback(async (id: string) => {
    if (!confirm('Stalbani o\'chirasizmi? Unga bog\'liq liniyalar ham o\'chadi.')) return;
    try {
      await powerApi.deletePole(id);
      setPoles(prev => prev.filter(p => p.id !== id));
      setLines(prev => prev.filter(l => l.fromPoleId !== id && l.toPoleId !== id));
      setSelectedPole(null);
    } catch (err) { console.error(err); }
  }, []);

  const deleteLine = useCallback(async (id: string) => {
    try {
      await powerApi.deleteLine(id);
      setLines(prev => prev.filter(l => l.id !== id));
    } catch (err) { console.error(err); }
  }, []);

  const getLineCoords = useCallback((line: any): [number, number][] | null => {
    const from = line.fromTransformerId
      ? getNodeCoords('transformer', line.fromTransformerId, transformers, poles)
      : line.fromPoleId ? getNodeCoords('pole', line.fromPoleId, transformers, poles) : null;
    const to = line.toTransformerId
      ? getNodeCoords('transformer', line.toTransformerId, transformers, poles)
      : line.toPoleId ? getNodeCoords('pole', line.toPoleId, transformers, poles) : null;
    return from && to ? [from, to] : null;
  }, [transformers, poles]);

  const filtered = transformers.filter(t => {
    if (healthFilter === 'good' && t.healthScore < 80) return false;
    if (healthFilter === 'medium' && (t.healthScore < 50 || t.healthScore >= 80)) return false;
    if (healthFilter === 'bad' && t.healthScore >= 50) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.inventoryNumber?.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q) ||
      t.region?.name?.toLowerCase().includes(q) || t.networkName?.toLowerCase().includes(q);
  });

  const getHealthLabel = (s: number) => s >= 80 ? 'Yaxshi' : s >= 50 ? 'O\'rtacha' : 'Yomon';
  const getHealthColor = (s: number) => s >= 80 ? '#22c55e' : s >= 50 ? '#eab308' : '#ef4444';
  const openNavigation = (lat: number, lng: number) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');

  // ============================================================
  // XARITA ICHIDAGI ELEMENTLAR (MapContainer ichida render)
  // ============================================================
  const MapInner = () => (
    <>
      <MapClickHandler mode={mode} onMapClick={handleMapClick} />
      <FlyToUserLocation />
      {selected && <FlyToSelected selected={selected} />}
      <TileLayer url={satellite
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />

      {showPolygons && regions.map(r => (
        <Polygon key={r.id} positions={r.polygonCoords}
          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.08, weight: 2 }}>
          <Popup><strong>{r.name}</strong></Popup>
        </Polygon>
      ))}

      {showLinesLayer && lines.map(line => {
        const coords = getLineCoords(line);
        if (!coords) return null;
        const isMain = line.lineType === 'MAIN';
        return (
          <Polyline key={line.id} positions={coords}
            pathOptions={{ color: isMain ? '#3b82f6' : '#f59e0b', weight: isMain ? 3 : 2, dashArray: isMain ? undefined : '6 4', opacity: 0.85 }}
            eventHandlers={{ click: () => { if (confirm(`Liniyani o'chirasizmi?`)) deleteLine(line.id); } }} />
        );
      })}

      {showPolesLayer && poles.map(pole => (
        <Marker key={pole.id} position={[pole.latitude, pole.longitude]}
          icon={poleIcon(selectedPole === pole.id || (mode === 'draw-line' && lineStart?.type === 'pole' && lineStart.id === pole.id))}
          eventHandlers={{
            click: () => {
              if (mode === 'draw-line') handleNodeClick('pole', pole.id);
              else setSelectedPole(pole.id === selectedPole ? null : pole.id);
            },
          }} />
      ))}

      {filtered.map(t => (
        <Marker key={t.id} position={[t.latitude, t.longitude]} icon={transformerIcon(t.healthScore || 100)}
          eventHandlers={{
            click: () => {
              if (mode === 'draw-line') handleNodeClick('transformer', t.id);
              else setSelected(t);
            },
            // Ikki marta bosilsa — to'g'ridan-to'g'ri batafsil sahifaga
            dblclick: () => { if (mode === 'view') navigate(`/transformers/${t.id}`); },
          }}>
          {mode === 'view' && (
            <Popup>
              <div className="text-sm min-w-[200px]">
                <div className="font-bold text-base mb-1 text-blue-700 cursor-pointer hover:underline"
                  onClick={() => navigate(`/transformers/${t.id}`)}>{t.inventoryNumber}</div>
                <div className="text-gray-600">{t.model} • {t.capacityKva} kVA</div>
                {t.networkName && <div className="text-gray-500 text-xs">Tarmoq: {t.networkName}</div>}
                <div className="text-gray-500 text-xs mt-1">{t.region?.name}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getHealthColor(t.healthScore || 100) }} />
                  <span className="text-xs font-medium">{t.healthScore}% ({getHealthLabel(t.healthScore || 100)})</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => navigate(`/transformers/${t.id}`)}
                    className="flex-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">Batafsil</button>
                  <button onClick={() => openNavigation(t.latitude, t.longitude)}
                    className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                    <Navigation className="w-3 h-3" /> Yo'l
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </>
  );

  const ListContent = () => (
    <div className="divide-y overflow-y-auto h-full bg-white">
      {filtered.length === 0
        ? <div className="text-center text-gray-400 py-12">Transformator topilmadi</div>
        : filtered.map(t => (
          <div key={t.id} className="p-3 md:p-4 hover:bg-blue-50 transition cursor-pointer"
            onClick={() => { setSelected(t); setMobileTab('map'); }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-blue-700">{t.inventoryNumber}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: getHealthColor(t.healthScore || 100) + '20', color: getHealthColor(t.healthScore || 100) }}>
                {t.healthScore}%
              </span>
            </div>
            <div className="text-xs text-gray-500">{t.region?.name} • {t.capacityKva} kVA {t.networkName ? `• ${t.networkName}` : ''}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={e => { e.stopPropagation(); navigate(`/transformers/${t.id}`); }}
                className="flex-1 text-xs bg-blue-600 text-white px-2 py-1.5 rounded-lg hover:bg-blue-700 font-medium">Batafsil</button>
              <button onClick={e => { e.stopPropagation(); openNavigation(t.latitude, t.longitude); }}
                className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                <Navigation className="w-3 h-3" /> Yo'l
              </button>
            </div>
          </div>
        ))}
    </div>
  );

  // Tanlangan stalba panel (xaritadan tashqarida)
  const SelectedPolePanel = () => {
    const pole = poles.find(p => p.id === selectedPole);
    if (!pole || mode !== 'view') return null;
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-2xl shadow-xl border px-4 py-3 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-gray-800">Stalba tanlandi</div>
          <div className="text-xs text-gray-400">{pole.latitude.toFixed(5)}, {pole.longitude.toFixed(5)}</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <button
          onClick={() => deletePole(pole.id)}
          className="flex items-center gap-1.5 text-xs bg-red-500 text-white px-3 py-2 rounded-xl hover:bg-red-600 font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> O\'chirish
        </button>
        <button
          onClick={() => setSelectedPole(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const DrawingBar = () => mode === 'view' ? null : (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-2xl shadow-xl border px-4 py-3 flex items-center gap-3 max-w-[90vw]">
      {mode === 'add-pole' && (
        <>
          <div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700">Xaritaga bosing — stalba qo'shiladi</span>
        </>
      )}
      {mode === 'draw-line' && (
        <>
          <button onClick={() => setLineType('MAIN')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition flex-shrink-0 ${lineType === 'MAIN' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}>
            ━ Asosiy (ko'k)
          </button>
          <button onClick={() => setLineType('BRANCH')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition flex-shrink-0 ${lineType === 'BRANCH' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-300 text-gray-600'}`}>
            ╌ Tarmoq (sariq)
          </button>
          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">
            {lineStart ? <span className="text-blue-600 font-medium">Boshlanish belgilandi → tugashni bosing</span> : 'Transformator yoki stalbani bosing'}
          </span>
          {lineStart && <button onClick={() => setLineStart(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-4 h-4" /></button>}
        </>
      )}
      <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
      <button onClick={() => { setMode('view'); setLineStart(null); }}
        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 flex-shrink-0">
        <X className="w-3.5 h-3.5" /> Tugatish
      </button>
    </div>
  );

  return (
    <div className="-m-3 md:-m-6 flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* HEADER */}
      <div className="bg-white border-b p-2 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base md:text-xl font-bold">Xarita</h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => { setMode(mode === 'add-pole' ? 'view' : 'add-pole'); setLineStart(null); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition ${mode === 'add-pole' ? 'bg-slate-700 text-white border-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Stalba</span>
            </button>
            <button onClick={() => { setMode(mode === 'draw-line' ? 'view' : 'draw-line'); setLineStart(null); setShowPolesLayer(true); setShowLinesLayer(true); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition ${mode === 'draw-line' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              <GitBranch className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Liniya</span>
            </button>
            <div className="w-px h-5 bg-gray-200" />
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
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={showPolesLayer} onChange={e => setShowPolesLayer(e.target.checked)} className="w-3 h-3" />Stalbalar</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={showLinesLayer} onChange={e => setShowLinesLayer(e.target.checked)} className="w-3 h-3" />Liniyalar</label>
            </div>
          </div>
        )}

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

      {/* KONTENT */}
      <div className="flex-1 flex min-h-0">
        {/* MOBIL */}
        <div className="md:hidden flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : mobileTab === 'map' ? (
            <div className="h-full relative">
              <MapContainer center={[41.3, 69.3]} zoom={6} className="h-full w-full">
                <MapInner />
              </MapContainer>
              <DrawingBar />
              <SelectedPolePanel />
            </div>
          ) : <ListContent />}
        </div>

        {/* DESKTOP */}
        <div className="hidden md:flex flex-1 min-h-0">
          <div className="flex-1 min-h-0 relative">
            {loading ? (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <MapContainer center={[41.3, 69.3]} zoom={6} className="h-full w-full">
                  <MapInner />
                </MapContainer>
                <DrawingBar />
                <SelectedPolePanel />
                {(poles.length > 0 || lines.length > 0) && (
                  <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur rounded-xl shadow px-3 py-2 text-xs flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />{poles.length} stalba</span>
                    <span className="flex items-center gap-1 text-blue-600"><span className="w-3 h-0.5 bg-blue-500 inline-block" />{lines.filter(l => l.lineType === 'MAIN').length} asosiy</span>
                    <span className="flex items-center gap-1 text-amber-600"><span className="w-3 h-0.5 bg-amber-500 inline-block" />{lines.filter(l => l.lineType === 'BRANCH').length} tarmoq</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="w-80 bg-white border-l overflow-y-auto flex-shrink-0">
            <div className="p-3 border-b sticky top-0 bg-white z-10"><h2 className="font-semibold text-sm">Transformatorlar ({filtered.length})</h2></div>
            <ListContent />
          </div>
        </div>
      </div>

      {mode === 'draw-line' && lineStart && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] bg-blue-600 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none">
          ✓ Boshlanish belgilandi → endi tugash nuqtasini bosing
        </div>
      )}
    </div>
  );
}