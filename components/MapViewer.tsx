import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FloodReport } from '../types';

interface MapViewerProps {
  reports: FloodReport[];
}

export const MapViewer: React.FC<MapViewerProps> = ({ reports }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [currentStyle, setCurrentStyle] = useState('osm');
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Map styles configuration
  const mapStyles = {
    osm: {
      name: 'OpenStreetMap',
      style: {
        version: 8 as const,
        sources: {
          'osm-tiles': {
            type: 'raster' as const,
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster' as const,
            source: 'osm-tiles'
          }
        ]
      }
    },
    google: {
      name: 'Google Hybrid',
      style: {
        version: 8 as const,
        sources: {
          'google-tiles': {
            type: 'raster' as const,
            tiles: [
              'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            ],
            tileSize: 256,
            attribution: '&copy; Google'
          }
        },
        layers: [
          {
            id: 'google-tiles',
            type: 'raster' as const,
            source: 'google-tiles'
          }
        ]
      }
    },
    arcgis: {
      name: 'ArcGIS Imagery',
      style: {
        version: 8 as const,
        sources: {
          'arcgis-tiles': {
            type: 'raster' as const,
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; Esri'
          }
        },
        layers: [
          {
            id: 'arcgis-tiles',
            type: 'raster' as const,
            source: 'arcgis-tiles'
          }
        ]
      }
    },
    carto: {
      name: 'Carto Light',
      style: {
        version: 8 as const,
        sources: {
          'carto-tiles': {
            type: 'raster' as const,
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
        },
        layers: [
          {
            id: 'carto-tiles',
            type: 'raster' as const,
            source: 'carto-tiles'
          }
        ]
      }
    },
    big: {
      name: 'BIG Indonesia',
      style: {
        version: 8 as const,
        sources: {
          'big-tiles': {
            type: 'raster' as const,
            tiles: ['https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; BIG Indonesia'
          }
        },
        layers: [
          {
            id: 'big-tiles',
            type: 'raster' as const,
            source: 'big-tiles'
          }
        ]
      }
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyles.osm.style,
      center: [114.591, -3.3167], // [lng, lat] format for MapLibre
      zoom: 12,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');

    // Add fullscreen control
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-left');

    // Add scale control
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Add attribution control
    map.current.addControl(new maplibregl.AttributionControl(), 'bottom-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when reports change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    reports.forEach((report) => {
      if (!report.exif.location) return;

      const { lat, lng } = report.exif.location;
      
      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'min-w-[200px]';
      
      // Tentukan URL gambar yang akan digunakan
      const imageUrl = report.driveFileId 
        ? `https://drive.google.com/thumbnail?id=${report.driveFileId}&sz=w400`
        : report.previewUrl;
      
      popupContent.innerHTML = `
        <h3 class="font-bold text-sm mb-1 break-words">${report.file.name}</h3>
        <div class="aspect-video bg-slate-100 rounded mb-2 overflow-hidden">
          <img 
            src="${imageUrl}" 
            alt="Preview" 
            class="w-full h-full object-cover" 
            loading="lazy"
            onerror="
              console.log('Popup image error:', this.src);
              if (this.src.includes('drive.google.com') && '${report.previewUrl}') {
                this.src = '${report.previewUrl}';
              } else {
                console.log('Both sources failed, hiding image');
                this.style.display = 'none';
                this.parentElement.innerHTML = '<div class=\\'w-full h-full flex items-center justify-center bg-slate-200 text-slate-400\\'>Gambar tidak dapat dimuat</div>';
              }
            "
          />
        </div>
        ${report.regu ? `<p class="text-sm font-semibold text-blue-600 mb-1">Regu: ${report.regu}</p>` : ''}
        <p class="text-xs text-slate-500">
          ${report.exif.dateTime || new Date(report.timestamp).toLocaleString()}
        </p>
        ${report.driveFileId ? `
          <a 
            href="https://drive.google.com/file/d/${report.driveFileId}/view"
            target="_blank" 
            rel="noopener noreferrer"
            class="block mt-2 text-xs text-blue-600 hover:underline"
          >
            Buka di Drive
          </a>
        ` : ''}
      `;

      // Create popup
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setDOMContent(popupContent);

      // Create marker
      const marker = new maplibregl.Marker({
        color: '#3b82f6' // Blue color
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      hasPoints = true;
    });

    // Fit bounds if there are points
    if (hasPoints && map.current) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [reports]);

  // Handle style change
  const handleStyleChange = (styleKey: string) => {
    if (!map.current || styleKey === currentStyle) return;
    
    setCurrentStyle(styleKey);
    map.current.setStyle(mapStyles[styleKey as keyof typeof mapStyles].style);
  };

  return (
    <div className="absolute inset-0">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Layer Control */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="p-2">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Base Layers</h4>
          <div className="space-y-1">
            {Object.entries(mapStyles).map(([key, style]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded">
                <input
                  type="radio"
                  name="mapStyle"
                  value={key}
                  checked={currentStyle === key}
                  onChange={() => handleStyleChange(key)}
                  className="w-3 h-3 text-blue-600"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">{style.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Point Count Overlay */}
      <div className="absolute bottom-15 left-4 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 pointer-events-none transition-colors">
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">WebGIS Layer</h4>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 bg-blue-600 rounded-full shadow-sm ring-2 ring-blue-100 dark:ring-blue-900" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-100">
            {reports.filter(r => r.exif.location).length} Titik Monitoring
          </span>
        </div>
      </div>
    </div>
  );
};