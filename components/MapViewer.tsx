import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FloodReport } from '../types';
import { Calendar, CloudCheck, Smartphone, Filter, XCircle } from 'lucide-react';

interface MapViewerProps {
  reports: FloodReport[];
  filteredReports?: FloodReport[];
  uniqueRegus?: string[];
  captureDateStart?: string;
  captureDateEnd?: string;
  uploadDateStart?: string;
  uploadDateEnd?: string;
  reguFilter?: string;
  setCaptureDateStart?: (v: string) => void;
  setCaptureDateEnd?: (v: string) => void;
  setUploadDateStart?: (v: string) => void;
  setUploadDateEnd?: (v: string) => void;
  setReguFilter?: (v: string) => void;
  resetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export const MapViewer: React.FC<MapViewerProps> = ({ 
  reports,
  filteredReports: propFilteredReports,
  uniqueRegus: propUniqueRegus,
  captureDateStart: propCaptureStart,
  captureDateEnd: propCaptureEnd,
  uploadDateStart: propUploadStart,
  uploadDateEnd: propUploadEnd,
  reguFilter: propReguFilter,
  setCaptureDateStart,
  setCaptureDateEnd,
  setUploadDateStart,
  setUploadDateEnd,
  setReguFilter,
  resetFilters: propResetFilters,
  hasActiveFilters: propHasActiveFilters
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [currentStyle, setCurrentStyle] = useState('osm');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isLayerControlCollapsed, setIsLayerControlCollapsed] = useState(true);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  // Layer visibility and opacity state
  const [layerStates, setLayerStates] = useState({
    monitoring: { visible: true, opacity: 1 },
    wms: { visible: false, opacity: 0.7 }
  });
  
  // State internal untuk filter (fallback jika props tidak diberikan)
  const [captureDateStart, setLocalCaptureDateStart] = useState<string>('');
  const [captureDateEnd, setLocalCaptureDateEnd] = useState<string>('');
  const [uploadDateStart, setLocalUploadDateStart] = useState<string>('');
  const [uploadDateEnd, setLocalUploadDateEnd] = useState<string>('');
  const [reguFilter, setLocalReguFilter] = useState<string>('all');
  
  // Gunakan props atau state internal
  const effectiveCaptureStart = propCaptureStart !== undefined ? propCaptureStart : captureDateStart;
  const effectiveCaptureEnd = propCaptureEnd !== undefined ? propCaptureEnd : captureDateEnd;
  const effectiveUploadStart = propUploadStart !== undefined ? propUploadStart : uploadDateStart;
  const effectiveUploadEnd = propUploadEnd !== undefined ? propUploadEnd : uploadDateEnd;
  const effectiveReguFilter = propReguFilter !== undefined ? propReguFilter : reguFilter;
  const effectiveSetCaptureStart = setCaptureDateStart || setLocalCaptureDateStart;
  const effectiveSetCaptureEnd = setCaptureDateEnd || setLocalCaptureDateEnd;
  const effectiveSetUploadStart = setUploadDateStart || setLocalUploadDateStart;
  const effectiveSetUploadEnd = setUploadDateEnd || setLocalUploadDateEnd;
  const effectiveSetReguFilter = setReguFilter || setLocalReguFilter;
  const effectiveResetFilters = propResetFilters || (() => {
    setLocalCaptureDateStart('');
    setLocalCaptureDateEnd('');
    setLocalUploadDateStart('');
    setLocalUploadDateEnd('');
    setLocalReguFilter('all');
  });
  const effectiveHasActiveFilters = propHasActiveFilters !== undefined ? propHasActiveFilters : (effectiveCaptureStart || effectiveCaptureEnd || effectiveUploadStart || effectiveUploadEnd || effectiveReguFilter !== 'all');
  
  // Dapatkan daftar regu unik dari data
  const uniqueRegus = propUniqueRegus || useMemo(() => {
    const regus = new Set(reports.map(r => r.regu).filter(Boolean));
    return Array.from(regus).sort();
  }, [reports]);
  
  // Helper untuk parse tanggal dari EXIF ke timestamp
  const parseExifDate = (dateTime?: string): number | null => {
    if (!dateTime) return null;
    try {
      const dateStr = dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.getTime();
    } catch {
      return null;
    }
  };
  
  // Filter data
  const filteredReports = useMemo(() => {
    // Gunakan propFilteredReports jika tersedia
    if (propFilteredReports) return propFilteredReports;
    
    let result = [...reports];
    
    // Filter berdasarkan waktu pengambilan
    if (effectiveCaptureStart) {
      const startTime = new Date(effectiveCaptureStart).getTime();
      result = result.filter(r => {
        const captureTime = parseExifDate(r.exif.dateTime) || r.timestamp;
        return captureTime >= startTime;
      });
    }
    
    if (effectiveCaptureEnd) {
      const endTime = new Date(effectiveCaptureEnd).getTime() + 86400000;
      result = result.filter(r => {
        const captureTime = parseExifDate(r.exif.dateTime) || r.timestamp;
        return captureTime < endTime;
      });
    }
    
    // Filter berdasarkan waktu upload
    if (effectiveUploadStart) {
      const startTime = new Date(effectiveUploadStart).getTime();
      result = result.filter(r => r.timestamp >= startTime);
    }
    
    if (effectiveUploadEnd) {
      const endTime = new Date(effectiveUploadEnd).getTime() + 86400000;
      result = result.filter(r => r.timestamp < endTime);
    }
    
    // Filter berdasarkan regu
    if (effectiveReguFilter !== 'all') {
      result = result.filter(r => r.regu && String(r.regu).trim().toLowerCase() === String(effectiveReguFilter).trim().toLowerCase());
    }
    
    return result;
  }, [reports, propFilteredReports, effectiveCaptureStart, effectiveCaptureEnd, effectiveUploadStart, effectiveUploadEnd, effectiveReguFilter]);

  // Map styles configuration
  const mapStyles = {
    osm: {
      name: 'OSM',
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

    // Add WMS layer after map loads
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add WMS source with CORS handling via proxy
      map.current.addSource('wms-batas-rt', {
        type: 'raster',
        tiles: [
          '/api/geoserver/webgis/wms?service=WMS&version=1.1.0&request=GetMap&layers=webgis:BATAS_RT_SEBANJARMASIN&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true'
        ],
        tileSize: 512,
        scheme: 'xyz'
      });

      // Add WMS layer
      map.current.addLayer({
        id: 'wms-batas-rt-layer',
        type: 'raster',
        source: 'wms-batas-rt',
        paint: {
          'raster-opacity': layerStates.wms.opacity
        },
        layout: {
          visibility: layerStates.wms.visible ? 'visible' : 'none'
        }
      });
    });

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

    // Only add markers if monitoring layer is visible
    if (!layerStates.monitoring.visible) return;

    // Add new markers
    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    filteredReports.forEach((report) => {
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

      // Set opacity on marker element
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.style.opacity = String(layerStates.monitoring.opacity);
      }

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
  }, [filteredReports, layerStates.monitoring.visible]);

  // Handle style change
  const handleStyleChange = (styleKey: string) => {
    if (!map.current || styleKey === currentStyle) return;
    
    setCurrentStyle(styleKey);
    const newStyle = mapStyles[styleKey as keyof typeof mapStyles].style;
    map.current.setStyle(newStyle);
    
    // Re-add WMS layer after style change
    map.current.once('styledata', () => {
      if (!map.current) return;
      
      // Re-add WMS source
      if (!map.current.getSource('wms-batas-rt')) {
        map.current.addSource('wms-batas-rt', {
          type: 'raster',
          tiles: [
            '/api/geoserver/webgis/wms?service=WMS&version=1.1.0&request=GetMap&layers=webgis:BATAS_RT_SEBANJARMASIN&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true'
          ],
          tileSize: 512,
          scheme: 'xyz'
        });
      }

      // Re-add WMS layer
      if (!map.current.getLayer('wms-batas-rt-layer')) {
        map.current.addLayer({
          id: 'wms-batas-rt-layer',
          type: 'raster',
          source: 'wms-batas-rt',
          paint: {
            'raster-opacity': layerStates.wms.opacity
          },
          layout: {
            visibility: layerStates.wms.visible ? 'visible' : 'none'
          }
        });
      }
    });
  };

  // Update WMS layer visibility and opacity
  useEffect(() => {
    if (!map.current) return;
    
    const updateWMSLayer = () => {
      if (!map.current?.getLayer('wms-batas-rt-layer')) return;
      
      map.current.setLayoutProperty(
        'wms-batas-rt-layer',
        'visibility',
        layerStates.wms.visible ? 'visible' : 'none'
      );
      
      map.current.setPaintProperty(
        'wms-batas-rt-layer',
        'raster-opacity',
        layerStates.wms.opacity
      );
    };

    if (map.current.isStyleLoaded()) {
      updateWMSLayer();
    } else {
      map.current.once('styledata', updateWMSLayer);
    }
  }, [layerStates.wms.visible, layerStates.wms.opacity]);

  // Update marker opacity
  useEffect(() => {
    markersRef.current.forEach(marker => {
      const element = marker.getElement();
      if (element) {
        element.style.opacity = String(layerStates.monitoring.opacity);
      }
    });
  }, [layerStates.monitoring.opacity]);

  // Toggle layer visibility
  const toggleLayerVisibility = (layerKey: 'monitoring' | 'wms') => {
    setLayerStates(prev => ({
      ...prev,
      [layerKey]: {
        ...prev[layerKey],
        visible: !prev[layerKey].visible
      }
    }));
  };

  // Update layer opacity
  const updateLayerOpacity = (layerKey: 'monitoring' | 'wms', opacity: number) => {
    setLayerStates(prev => ({
      ...prev,
      [layerKey]: {
        ...prev[layerKey],
        opacity
      }
    }));
  };

  return (
    <div className="absolute inset-0">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Layer Control Toggle Button */}
      <div className="absolute top-4 right-4 z-[900]">
        <button
          onClick={() => setIsLayerControlCollapsed(!isLayerControlCollapsed)}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all transform hover:scale-105 ${
            !isLayerControlCollapsed
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title={isLayerControlCollapsed ? 'Tampilkan Layer' : 'Sembunyikan Layer'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </button>
      </div>

      {/* Layer Control Panel - Collapsible */}
      {!isLayerControlCollapsed && (
        <div className="layer-control-panel absolute top-[50px] right-4 z-[900] backdrop-blur-sm rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200 max-w-xs">
          <div className="p-3">
            <h4 className="layer-control-title text-xs mb-3 uppercase tracking-wider">Manajemen Layer</h4>
            
            {/* Base Map Styles */}
            <div className="mb-4">
              <h5 className="text-[10px] font-semibold mb-2 text-slate-600 dark:text-slate-400">Peta Dasar</h5>
              <div className="space-y-2">
                {Object.entries(mapStyles).map(([key, style]) => (
                  <label key={key} className="layer-control-item flex items-center gap-2 cursor-pointer p-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="mapStyle"
                      value={key}
                      checked={currentStyle === key}
                      onChange={() => handleStyleChange(key)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs font-medium">{style.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Data Layers */}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-3">
              <h5 className="text-[10px] font-semibold mb-2 text-slate-600 dark:text-slate-400">Layer Data</h5>
              
              {/* Titik Monitoring Layer */}
              <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={layerStates.monitoring.visible}
                      onChange={() => toggleLayerVisibility('monitoring')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs font-medium">Titik Monitoring</span>
                  </label>
                  <div className="w-3 h-3 bg-blue-600 rounded-full shadow-sm ring-2 ring-blue-100 dark:ring-blue-900" />
                </div>
                {layerStates.monitoring.visible && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-12">Opacity</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layerStates.monitoring.opacity}
                        onChange={(e) => updateLayerOpacity('monitoring', parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 w-8 text-right">
                        {Math.round(layerStates.monitoring.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* WMS Batas RT Layer */}
              <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={layerStates.wms.visible}
                      onChange={() => toggleLayerVisibility('wms')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs font-medium">Batas RT</span>
                  </label>
                  <div className="w-3 h-3 bg-green-600 rounded shadow-sm ring-2 ring-green-100 dark:ring-green-900" />
                </div>
                {layerStates.wms.visible && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 w-12">Opacity</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layerStates.wms.opacity}
                        onChange={(e) => updateLayerOpacity('wms', parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 w-8 text-right">
                        {Math.round(layerStates.wms.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toggle Button - below fullscreen control */}
      <div className="absolute top-[175px] left-3 z-[900]">
        <button
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all transform hover:scale-105 ${
            isFilterVisible
              ? 'bg-amber-600 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title={isFilterVisible ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
        >
          <Filter size={18} />
          {effectiveHasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900"></span>
          )}
        </button>
      </div>

      {/* Filter Panel - positioned below toggle button */}
      {isFilterVisible && (
        <div className="absolute top-[200px] left-4 z-[900] backdrop-blur-sm rounded-lg shadow-xl overflow-hidden max-w-xs animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800/90 dark:to-amber-900/20 border border-amber-200 dark:border-amber-700/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Filter size={12} />
                Filter Peta
              </h4>
              {effectiveHasActiveFilters && (
                <button
                  onClick={effectiveResetFilters}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
                >
                  <XCircle size={10} />
                  Reset
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {/* Filter Waktu Pengambilan */}
              <div>
                <label className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Calendar size={10} />
                  Waktu Pengambilan
                </label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="date"
                    value={effectiveCaptureStart}
                    onChange={(e) => effectiveSetCaptureStart(e.target.value)}
                    className="w-full px-1.5 py-1 text-[10px] border border-amber-200 dark:border-amber-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Dari"
                  />
                  <input
                    type="date"
                    value={effectiveCaptureEnd}
                    onChange={(e) => effectiveSetCaptureEnd(e.target.value)}
                    className="w-full px-1.5 py-1 text-[10px] border border-amber-200 dark:border-amber-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Sampai"
                  />
                </div>
              </div>
              
              {/* Filter Waktu Upload */}
              <div>
                <label className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <CloudCheck size={10} />
                  Waktu Upload
                </label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="date"
                    value={effectiveUploadStart}
                    onChange={(e) => effectiveSetUploadStart(e.target.value)}
                    className="w-full px-1.5 py-1 text-[10px] border border-amber-200 dark:border-amber-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Dari"
                  />
                  <input
                    type="date"
                    value={effectiveUploadEnd}
                    onChange={(e) => effectiveSetUploadEnd(e.target.value)}
                    className="w-full px-1.5 py-1 text-[10px] border border-amber-200 dark:border-amber-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Sampai"
                  />
                </div>
              </div>
              
              {/* Filter Regu */}
              <div>
                <label className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Smartphone size={10} />
                  Regu
                </label>
                <select
                  value={effectiveReguFilter}
                  onChange={(e) => effectiveSetReguFilter(e.target.value)}
                  className="w-full px-1.5 py-1 text-[10px] border border-amber-200 dark:border-amber-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 mt-1"
                >
                  <option value="all">Semua Regu</option>
                  {uniqueRegus.map(regu => (
                    <option key={regu} value={regu}>{regu}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Point Count Overlay */}
      <div className="layer-control-panel absolute bottom-15 left-4 z-[1000] backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 pointer-events-none transition-colors">
        <h4 className="text-[10px] font-black uppercase mb-1.5 tracking-widest">Legenda</h4>
        <div className="space-y-1.5">
          {layerStates.monitoring.visible && (
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 bg-blue-600 rounded-full shadow-sm ring-2 ring-blue-100 dark:ring-blue-900" />
              <span className="text-xs font-bold">
                {filteredReports.filter(r => r.exif.location).length} Titik Monitoring
              </span>
            </div>
          )}
          {layerStates.wms.visible && (
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 bg-green-600 rounded shadow-sm ring-2 ring-green-100 dark:ring-green-900" />
              <span className="text-xs font-bold">Batas RT</span>
            </div>
          )}
        </div>
        {effectiveHasActiveFilters && layerStates.monitoring.visible && (
          <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
            dari {reports.filter(r => r.exif.location).length} total
          </div>
        )}
      </div>
    </div>
  );
};