import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FloodReport } from '../types';

// Fix default marker icon issues in React using CDN icons (avoids import errors)
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewerProps {
  reports: FloodReport[];
}

// Available basemap identifiers and their tile URLs
const BASEMAPS: Record<string, string> = {
  OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  GoogleHybrid: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  ArcGISImagery: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  CartoLight: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  BIGIndonesia: 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/tile/{z}/{y}/{x}'
};

// Component to handle map view updates when data changes
const MapController = ({ reports }: { reports: FloodReport[] }) => {
  const map = useMap();

  useEffect(() => {
    // Magic fix for rendering issues: invalidateSize after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    if (reports.length === 0) return;

    const bounds = L.latLngBounds([]);
    let hasPoints = false;
    
    // Check efficient bounds calculation
    reports.forEach(r => {
      if (r.exif.location) {
        bounds.extend([r.exif.location.lat, r.exif.location.lng]);
        hasPoints = true;
      }
    });

    if (hasPoints && map) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [reports, map]);

  return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({ reports }) => {
  const [basemap, setBasemap] = useState<string>('OSM');

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-200">
      {/* Basemap selector */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-2 transition-colors">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mr-2">Basemap:</label>
        <select
          value={basemap}
          onChange={e => setBasemap(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded px-1 py-0.5 focus:outline-none"
        >
          {Object.keys(BASEMAPS).map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <MapContainer 
        center={[-3.3167, 114.591]} 
        zoom={12} 
        className="w-full h-full"
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={BASEMAPS[basemap]}
        />
        
        {reports.map((report) => (
          report.exif.location && (
            <Marker 
              key={report.id} 
              position={[report.exif.location.lat, report.exif.location.lng]}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-sm mb-1">{report.file.name}</h3>
                  <div className="aspect-video bg-slate-100 rounded mb-2 overflow-hidden">
                    <img src={report.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-slate-500">
                    {report.exif.dateTime || new Date(report.timestamp).toLocaleString()}
                  </p>
                  <a 
                    href={report.previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Buka di Drive
                  </a>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        <MapController reports={reports} />
      </MapContainer>

      {/* Point Count Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 pointer-events-none transition-colors">
        <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-widest">WebGIS Layer</h4>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 bg-blue-600 rounded-full shadow-sm ring-2 ring-blue-100 dark:ring-blue-900" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {reports.filter(r => r.exif.location).length} Titik Kejadian Terdeteksi
          </span>
        </div>
      </div>
    </div>
  );
};
