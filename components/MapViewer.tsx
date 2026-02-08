import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
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

// Component to handle map view updates when data changes
const MapController = ({ reports }: { reports: FloodReport[] }) => {
  const map = useMap();
  const fullscreenControlRef = React.useRef<any>(null);

  useEffect(() => {
    // Add fullscreen control (loaded via CDN)
    const addFullscreenControl = () => {
      try {
        // Check if Fullscreen control is available (from CDN)
        if ((L.Control as any).Fullscreen) {
          console.log('Creating fullscreen control...');
          fullscreenControlRef.current = new (L.Control as any).Fullscreen({
            position: 'topleft',
            title: {
              'false': 'Tampilan Fullscreen',
              'true': 'Keluar Fullscreen'
            }
          });
          map.addControl(fullscreenControlRef.current);
          console.log('Fullscreen control added successfully!');
        } else {
          console.warn('L.Control.Fullscreen not available, retrying...');
          // Retry after a short delay
          setTimeout(addFullscreenControl, 100);
        }
      } catch (error) {
        console.error('Failed to add fullscreen control:', error);
      }
    };

    // Wait a bit for CDN script to load
    setTimeout(addFullscreenControl, 300);

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

    // Cleanup
    return () => {
      if (fullscreenControlRef.current && map) {
        try {
          map.removeControl(fullscreenControlRef.current);
          console.log('Fullscreen control removed');
        } catch (e) {
          // Control might already be removed
        }
      }
    };
  }, [reports, map]);

  return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({ reports }) => {
  const { BaseLayer } = LayersControl;

  return (
    <div className="absolute inset-0">
      <MapContainer 
        center={[-3.3167, 114.591]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <LayersControl position="topright">
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
          </BaseLayer>
          
          <BaseLayer name="Google Hybrid">
            <TileLayer
              attribution='&copy; Google'
              url='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            />
          </BaseLayer>
          
          <BaseLayer name="ArcGIS Imagery">
            <TileLayer
              attribution='&copy; Esri'
              url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            />
          </BaseLayer>
          
          <BaseLayer name="Carto Light">
            <TileLayer
              attribution='&copy; CARTO'
              url='https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
            />
          </BaseLayer>
          
          <BaseLayer name="BIG Indonesia">
            <TileLayer
              attribution='&copy; BIG Indonesia'
              url='https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/tile/{z}/{y}/{x}'
            />
          </BaseLayer>
        </LayersControl>
        
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
                    <img 
                      src={report.driveFileId 
                        ? `https://drive.google.com/thumbnail?id=${report.driveFileId}&sz=w400`
                        : report.previewUrl
                      } 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                      onError={(e) => {
                        // Fallback ke previewUrl jika thumbnail Drive gagal
                        const target = e.target as HTMLImageElement;
                        if (target.src !== report.previewUrl) {
                          target.src = report.previewUrl;
                        }
                      }}
                    />
                  </div>
                  {report.regu && (
                    <p className="text-sm font-semibold text-blue-600 mb-1">
                      Regu: {report.regu}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {report.exif.dateTime || new Date(report.timestamp).toLocaleString()}
                  </p>
                  {report.driveFileId && (
                    <a 
                      href={`https://drive.google.com/file/d/${report.driveFileId}/view`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Buka di Drive
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}

        <MapController reports={reports} />
      </MapContainer>

      {/* Point Count Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 pointer-events-none transition-colors">
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">WebGIS Layer</h4>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 bg-blue-600 rounded-full shadow-sm ring-2 ring-blue-100 dark:ring-blue-900" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-100">
            {reports.filter(r => r.exif.location).length} Titik Kejadian Terdeteksi
          </span>
        </div>
      </div>
    </div>
  );
};
