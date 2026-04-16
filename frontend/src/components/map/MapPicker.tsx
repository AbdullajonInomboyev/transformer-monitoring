import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Search, Layers, Navigation } from 'lucide-react';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], 17, { duration: 1 }); }, [lat, lng]);
  return null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapPicker({ isOpen, onClose, onSelect, initialLat, initialLng }: Props) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  if (!isOpen) return null;

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`);
      const d = await r.json();
      if (d.display_name) setAddress(d.display_name);
    } catch { setAddress(''); }
  };

  const handleClick = async (lat: number, lng: number) => { setPos({ lat, lng }); await reverseGeocode(lat, lng); };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=uz`);
      const d = await r.json();
      if (d.length > 0) { setPos({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }); setAddress(d[0].display_name || ''); }
    } catch {}
    setSearching(false);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { alert("GPS qo'llab-quvvatlanmaydi"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); await reverseGeocode(p.coords.latitude, p.coords.longitude); setGpsLoading(false); },
      () => { alert("Joylashuvni aniqlab bo'lmadi"); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const confirm = () => { if (pos) { onSelect(pos.lat, pos.lng, address); onClose(); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden" style={{ height: '90vh' }}>
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" /> Xaritadan joylashuvni tanlang</h2>
            <p className="text-sm text-gray-500">Xaritaga bosing yoki GPS orqali aniqlang</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2 p-3 border-b bg-gray-50 flex-shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Manzilni qidiring..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleSearch} disabled={searching} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{searching ? '...' : 'Qidirish'}</button>
          <button onClick={handleGPS} disabled={gpsLoading} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"><Navigation className="w-4 h-4" />{gpsLoading ? '...' : 'GPS'}</button>
          <button onClick={() => setSatellite(!satellite)} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"><Layers className="w-4 h-4" />{satellite ? 'Xarita' : 'Sputnik'}</button>
        </div>
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <MapContainer center={[initialLat || 41.3, initialLng || 69.28]} zoom={initialLat ? 14 : 6} style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}>
            <TileLayer url={satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
            <ClickHandler onSelect={handleClick} />
            {pos && <><Marker position={[pos.lat, pos.lng]} icon={pinIcon} /><FlyTo lat={pos.lat} lng={pos.lng} /></>}
          </MapContainer>
        </div>
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm">
            {pos ? (<div><span className="font-medium text-gray-800">{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</span>{address && <p className="text-xs text-gray-500 max-w-xs truncate mt-0.5">{address}</p>}</div>) : <span className="text-gray-400">Xaritaga bosing yoki GPS ishlating</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 border rounded-lg text-sm hover:bg-gray-100">Bekor</button>
            <button onClick={confirm} disabled={!pos} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">Tanlash</button>
          </div>
        </div>
      </div>
    </div>
  );
}
