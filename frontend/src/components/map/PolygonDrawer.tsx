import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Trash2, Check, Layers } from 'lucide-react';

const pointIcon = L.divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function ClickHandler({ onAdd, enabled }: { onAdd: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (polygon: number[][]) => void;
  initialPolygon?: number[][] | null;
  regionName?: string;
}

export default function PolygonDrawer({ isOpen, onClose, onSave, initialPolygon, regionName }: Props) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [drawing, setDrawing] = useState(true);
  const [satellite, setSatellite] = useState(false);

  useEffect(() => {
    if (isOpen && initialPolygon && initialPolygon.length > 0) {
      setPoints(initialPolygon.map(p => [p[0], p[1]] as [number, number]));
      setDrawing(false);
    } else if (isOpen) {
      setPoints([]);
      setDrawing(true);
    }
  }, [isOpen, initialPolygon]);

  if (!isOpen) return null;

  const addPoint = (lat: number, lng: number) => {
    setPoints(prev => [...prev, [lat, lng]]);
  };

  const removePoint = (index: number) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (confirm('Barcha nuqtalarni o\'chirishni tasdiqlaysizmi?')) {
      setPoints([]);
      setDrawing(true);
    }
  };

  const save = () => {
    if (points.length < 3) {
      alert('Kamida 3 ta nuqta tanlang (uchburchak)');
      return;
    }
    onSave(points.map(p => [p[0], p[1]]));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl flex flex-col overflow-hidden" style={{ height: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Hudud chegarasini belgilash
              {regionName && <span className="text-sm text-gray-500 font-normal">— {regionName}</span>}
            </h2>
            <p className="text-sm text-gray-500">
              Xaritaga bosib hudud chegarasini chizing ({points.length} ta nuqta)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b bg-gray-50 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setDrawing(!drawing)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
              drawing ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            {drawing ? 'Chizish yoqilgan' : 'Chizishni yoqish'}
          </button>
          <button
            onClick={clearAll}
            disabled={points.length === 0}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Tozalash
          </button>
          <button
            onClick={() => setSatellite(!satellite)}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-100 ml-auto"
          >
            <Layers className="w-4 h-4" />
            {satellite ? 'Xarita' : 'Sputnik'}
          </button>
        </div>

        {/* Info banner */}
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-800 flex-shrink-0">
          {points.length === 0
            ? '📍 Xaritaga bosib chegara nuqtalarini qo\'shing. Kamida 3 ta nuqta kerak.'
            : points.length < 3
            ? `📍 Yana ${3 - points.length} ta nuqta qo'shing`
            : `✅ ${points.length} ta nuqta tanlangan. Nuqta ustiga bosib o'chirishingiz mumkin.`
          }
        </div>

        {/* Map */}
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <MapContainer
            center={[41.3, 69.28]}
            zoom={6}
            style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
          >
            <TileLayer
              url={satellite
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            />
            <ClickHandler onAdd={addPoint} enabled={drawing} />

            {/* Poligon (qizil chegara) */}
            {points.length >= 3 && (
              <Polygon
                positions={points}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#ef4444',
                  fillOpacity: 0.15,
                  weight: 3,
                }}
              />
            )}

            {/* Nuqtalar */}
            {points.map((p, i) => (
              <Marker
                key={i}
                position={p}
                icon={pointIcon}
                eventHandlers={{ click: () => removePoint(i) }}
              />
            ))}
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm">
            <span className="font-medium">{points.length}</span> ta nuqta
            {points.length >= 3 && <span className="text-emerald-600 ml-2">✓ Chegara to'g'ri chizilgan</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 border rounded-lg text-sm hover:bg-gray-100">Bekor</button>
            <button
              onClick={save}
              disabled={points.length < 3}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 font-medium flex items-center gap-1"
            >
              <Check className="w-4 h-4" /> Saqlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
