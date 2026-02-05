import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { FloodReport } from '../types';

interface MapViewerProps {
  reports: FloodReport[];
}

// Available basemap identifiers and their tile URLs
const BASEMAPS: Record<string, string> = {
  OSM: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  GoogleHybrid: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  ArcGISImagery: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  CartoLight: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  BIGIndonesia: 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/tile/{z}/{y}/{x}'
};

export const MapViewer: React.FC<MapViewerProps> = ({ reports }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [basemap, setBasemap] = useState<string>('OSM');

  // Keep a ref to reports so we can access the latest value inside map callbacks
  // without needing to recreate the callbacks or effects
  const reportsRef = useRef(reports);
  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  // Helper to build a minimal style object for the selected basemap
  const buildStyle = (tilesUrl: string) => ({
    version: 8 as const,
    sources: {
      'basemap-tiles': {
        type: 'raster' as const,
        tiles: [tilesUrl],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    layers: [
      {
        id: 'basemap-tiles-layer',
        type: 'raster' as const,
        source: 'basemap-tiles',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  });

  // Centralized function to update the source data
  const updateSource = () => {
    if (!map.current) return;
    const source = map.current.getSource('reports') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = reportsRef.current
      .filter(r => r.exif.location)
      .map(r => {
        const { lat, lng } = r.exif.location!;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [lng, lat] },
          properties: {
            previewUrl: r.previewUrl,
            fileName: r.file.name,
            dateTime: r.exif.dateTime || new Date(r.timestamp).toLocaleString()
          }
        };
      });
    source.setData({ type: 'FeatureCollection', features });
  };

  // Initialise the map only once
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: buildStyle(BASEMAPS[basemap]),
      center: [114.591, -3.3167],
      zoom: 12
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }),
      'top-right'
    );

    // When the style (basemap) loads, ensure the reports source/layer exists
    const addReportsLayer = () => {
      if (!map.current) return;
      if (!map.current.getSource('reports')) {
        map.current.addSource('reports', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'reports-points',
          type: 'circle',
          source: 'reports',
          paint: {
            'circle-radius': 8,
            'circle-color': '#3b82f6', // blue-500
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });
      }
      // Always update data after adding layer/source or when style reloads
      updateSource();
    };

    map.current.on('load', addReportsLayer);
    // In case the style is swapped later, re‑add the source/layer after the new style finishes loading
    map.current.on('styledata', addReportsLayer);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // Run once on mount

  // Update basemap when user selects a different option
  useEffect(() => {
    if (!map.current) return;
    const tilesUrl = BASEMAPS[basemap];
    if (!tilesUrl) return;
    // Preserve current view (center, zoom) before changing style
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    map.current.setStyle(buildStyle(tilesUrl));
    // Restore view after style change
    map.current.once('styledata', () => {
      map.current?.jumpTo({ center: [center.lng, center.lat], zoom });
    });
  }, [basemap]);

  // Whenever reports change, trigger updateSource
  useEffect(() => {
    updateSource();
  }, [reports]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-200">
      {/* Basemap selector – simple dropdown */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-2 transition-colors">
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

      <div ref={mapContainer} className="absolute inset-0" />

      {/* Simple overlay showing point count */}
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 pointer-events-none z-10 transition-colors">
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
