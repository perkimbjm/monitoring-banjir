
import React, { useState, useEffect, useMemo } from 'react';
import { FloodReport } from '../types';
import { MapPin, Calendar, Smartphone, ExternalLink, CloudCheck, CloudOff, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, XCircle } from 'lucide-react';

interface ReportTableProps {
  reports: FloodReport[];
  onDelete?: (id: string) => void;
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

type SortField = 'captureTime' | 'uploadTime' | 'regu';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const ReportTable: React.FC<ReportTableProps> = ({ 
  reports, 
  onDelete,
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
  const [selectedPhoto, setSelectedPhoto] = useState<FloodReport | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'captureTime', direction: 'desc' });
  
  // Gunakan props jika tersedia, fallback ke state internal
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
  
  // Filter dan sorting data
  const filteredAndSortedReports = useMemo(() => {
    // Gunakan propFilteredReports jika tersedia
    let result = propFilteredReports ? [...propFilteredReports] : [...reports];
    
    // Sorting
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'captureTime':
          aValue = parseExifDate(a.exif.dateTime) || a.timestamp;
          bValue = parseExifDate(b.exif.dateTime) || b.timestamp;
          break;
        case 'uploadTime':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'regu':
          aValue = a.regu ? String(a.regu).toLowerCase() : 'zzzzz';
          bValue = b.regu ? String(b.regu).toLowerCase() : 'zzzzz';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [reports, propFilteredReports, sortConfig]);

  // Fungsi untuk mereset semua filter
  const resetFilters = () => {
    setCaptureDateStart('');
    setCaptureDateEnd('');
    setUploadDateStart('');
    setUploadDateEnd('');
    setReguFilter('all');
  };
  
  // Cek apakah ada filter aktif
  const hasActiveFilters = captureDateStart || captureDateEnd || uploadDateStart || uploadDateEnd || reguFilter !== 'all';

  // Fungsi untuk mengubah sorting
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Komponen untuk ikon sorting
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />
      : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  useEffect(() => {
    if (selectedPhoto) {
      // Jika ada driveFileId, gunakan URL Google Drive thumbnail dengan ukuran besar
      if (selectedPhoto.driveFileId) {
        const driveUrl = `https://drive.google.com/thumbnail?id=${selectedPhoto.driveFileId}&sz=w2000`;
        setPhotoUrl(driveUrl);
      }
      // Jika file adalah File object yang valid (dari upload lokal)
      else if (selectedPhoto.file instanceof File) {
        const url = URL.createObjectURL(selectedPhoto.file);
        setPhotoUrl(url);
        // Cleanup URL saat component unmount atau photo berubah
        return () => URL.revokeObjectURL(url);
      } else {
        setPhotoUrl('');
      }
    } else {
      setPhotoUrl('');
    }
  }, [selectedPhoto]);

  if (filteredAndSortedReports.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300">
        <span className="text-6xl mb-4 opacity-10 dark:opacity-30">📂</span>
        <p className="font-medium">Belum ada data terekam. Silakan surveyor mengunggah foto.</p>
      </div>
    );
  }

  return (
    <>
      {/* Kontrol Filter */}
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800/80 dark:to-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Filter size={16} className="text-amber-600 dark:text-amber-400" />
            Filter Data
          </h3>
          {hasActiveFilters && (
            <button
              onClick={effectiveResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
            >
              <XCircle size={14} />
              Reset Filter
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filter Waktu Pengambilan */}
          <div className="bg-white/70 dark:bg-slate-800/70 p-3 rounded-lg border border-amber-100 dark:border-amber-700/30">
            <label className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
              <Calendar size={12} />
              Waktu Pengambilan
            </label>
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <input
                  type="date"
                  value={effectiveCaptureStart}
                  onChange={(e) => effectiveSetCaptureStart(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-amber-200 dark:border-amber-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Dari"
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={effectiveCaptureEnd}
                  onChange={(e) => effectiveSetCaptureEnd(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-amber-200 dark:border-amber-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Sampai"
                />
              </div>
            </div>
          </div>
          
          {/* Filter Waktu Upload */}
          <div className="bg-white/70 dark:bg-slate-800/70 p-3 rounded-lg border border-amber-100 dark:border-amber-700/30">
            <label className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
              <CloudCheck size={12} />
              Waktu Upload
            </label>
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <input
                  type="date"
                  value={effectiveUploadStart}
                  onChange={(e) => effectiveSetUploadStart(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-amber-200 dark:border-amber-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Dari"
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={effectiveUploadEnd}
                  onChange={(e) => effectiveSetUploadEnd(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-amber-200 dark:border-amber-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Sampai"
                />
              </div>
            </div>
          </div>
          
          {/* Filter Regu */}
          <div className="bg-white/70 dark:bg-slate-800/70 p-3 rounded-lg border border-amber-100 dark:border-amber-700/30">
            <label className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
              <Smartphone size={12} />
              Filter Regu
            </label>
            <select
              value={effectiveReguFilter}
              onChange={(e) => effectiveSetReguFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-amber-200 dark:border-amber-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 mt-2"
            >
              <option value="all">Semua Regu</option>
              {uniqueRegus.map(regu => (
                <option key={regu} value={regu}>{regu}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Indikator filter aktif */}
        {effectiveHasActiveFilters && (
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
            <span className="font-semibold">🔍 Filter aktif:</span>
            {effectiveCaptureStart && <span>Pengambilan: {effectiveCaptureStart}</span>}
            {effectiveCaptureEnd && <span>s/d {effectiveCaptureEnd}</span>}
            {effectiveUploadStart && <span>Upload: {effectiveUploadStart}</span>}
            {effectiveUploadEnd && <span>s/d {effectiveUploadEnd}</span>}
            {effectiveReguFilter !== 'all' && <span>Regu: {effectiveReguFilter}</span>}
          </div>
        )}
      </div>

      {/* Kontrol Sorting */}
      <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700/50 dark:to-blue-900/20 rounded-xl border border-slate-200 dark:border-slate-600">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <ArrowUpDown size={16} className="text-blue-600 dark:text-blue-400" />
          Urutkan Data Explorer
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSort('captureTime')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              sortConfig.field === 'captureTime'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50'
                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-500 shadow-sm'
            }`}
          >
            <Calendar size={14} />
            Waktu Pengambilan
            <SortIcon field="captureTime" />
          </button>
          
          <button
            onClick={() => handleSort('uploadTime')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              sortConfig.field === 'uploadTime'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50'
                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-500 shadow-sm'
            }`}
          >
            <CloudCheck size={14} />
            Waktu Upload
            <SortIcon field="uploadTime" />
          </button>
          
          <button
            onClick={() => handleSort('regu')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              sortConfig.field === 'regu'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50'
                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-500 shadow-sm'
            }`}
          >
            <Smartphone size={14} />
            Regu
            <SortIcon field="regu" />
          </button>

          {/* Tombol Reset */}
          <button
            onClick={() => setSortConfig({ field: 'captureTime', direction: 'desc' })}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all hover:scale-105 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600"
            title="Reset ke default (Waktu Pengambilan - Terbaru)"
          >
            ↻ Reset
          </button>
        </div>
        
        {/* Indikator sorting aktif */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
            📊 Diurutkan berdasarkan: <span className="font-bold text-blue-600 dark:text-blue-400">
              {sortConfig.field === 'captureTime' && 'Waktu Pengambilan'}
              {sortConfig.field === 'uploadTime' && 'Waktu Upload'}
              {sortConfig.field === 'regu' && 'Regu'}
            </span> ({sortConfig.direction === 'asc' ? 'A-Z / Terlama-Terbaru' : 'Z-A / Terbaru-Terlama'})
          </div>
          <div className="font-bold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
            📈 {filteredAndSortedReports.length} data ditampilkan
          </div>
        </div>
      </div>
      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt={selectedPhoto.file.name}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    // Sembunyikan gambar dan tampilkan fallback
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
                {selectedPhoto.driveFileId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg" style={{ display: 'none' }} id="fallback-message">
                    <div className="text-center text-white p-8">
                      <p className="text-lg mb-4">Foto tidak dapat ditampilkan langsung</p>
                      <a 
                        href={`https://drive.google.com/file/d/${selectedPhoto.driveFileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                      >
                        <ExternalLink size={20} />
                        Buka di Google Drive
                      </a>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-white text-center">
                <p>Foto tidak dapat dimuat</p>
                <p className="text-sm mt-2">File: {selectedPhoto.file?.name || 'Unknown'}</p>
                {selectedPhoto.driveFileId && (
                  <a 
                    href={`https://drive.google.com/file/d/${selectedPhoto.driveFileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 mt-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                  >
                    <ExternalLink size={20} />
                    Buka di Google Drive
                  </a>
                )}
              </div>
            )}
            
            {/* Photo Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <h3 className="text-white font-bold text-lg mb-2">{selectedPhoto.file.name}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                {selectedPhoto.exif.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span>{selectedPhoto.exif.location.lat.toFixed(5)}, {selectedPhoto.exif.location.lng.toFixed(5)}</span>
                  </div>
                )}
                {selectedPhoto.exif.dateTime && (
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{selectedPhoto.exif.dateTime}</span>
                  </div>
                )}
                {selectedPhoto.exif.make && (
                  <div className="flex items-center gap-1">
                    <Smartphone size={14} />
                    <span>{selectedPhoto.exif.make} {selectedPhoto.exif.model}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b-2 border-blue-200 dark:border-blue-700 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold bg-blue-50/50 dark:bg-blue-900/20">
          <th className="py-4 px-4 font-bold">Foto</th>
          <th className="py-4 px-4 font-bold">Regu</th>
          <th className="py-4 px-4 font-bold">Sinkronisasi</th>
          <th className="py-4 px-4 font-bold">Metadata Perangkat</th>
          <th className="py-4 px-4 font-bold">Koordinat (Lat, Lng)</th>
          <th className="py-4 px-4 font-bold">Tautan Drive</th>
          <th className="py-4 px-4 font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
        {filteredAndSortedReports.map((report) => (
          <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-16 h-12 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => setSelectedPhoto(report)}
                >
                  <img 
                    src={report.driveFileId 
                      ? `https://drive.google.com/thumbnail?id=${report.driveFileId}&sz=w200`
                      : report.previewUrl
                    } 
                    className="w-full h-full object-cover" 
                    alt="Thumb"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.log('Table thumbnail error:', target.src);
                      
                      // Jika sedang menggunakan Drive thumbnail, coba previewUrl
                      if (report.driveFileId && target.src.includes('drive.google.com')) {
                        console.log('Fallback to previewUrl:', report.previewUrl);
                        target.src = report.previewUrl;
                      } else {
                        // Jika previewUrl juga gagal, sembunyikan gambar
                        console.log('Both sources failed');
                        target.style.display = 'none';
                        target.parentElement!.style.backgroundColor = '#f1f5f9';
                        target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-400"><svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">{report.file.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono italic flex items-center gap-1">
                    <Calendar size={10} /> {report.exif.dateTime?.substring(0,10) || new Date(report.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </td>
            <td className="py-3 px-4">
              {report.regu ? (
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded-lg inline-block">
                  {report.regu}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-300 italic">-</span>
              )}
            </td>
            <td className="py-3 px-4">
              {report.status === 'completed' ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-300 font-bold bg-green-50 dark:bg-green-900/40 px-2 py-1 rounded-full inline-flex">
                   <CloudCheck size={14} /> Terkirim
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-200 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full inline-flex">
                   <CloudOff size={14} /> Lokal
                </div>
              )}
            </td>
            <td className="py-3 px-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-200">
                <Smartphone size={12} className="text-slate-400 dark:text-slate-300" />
                {report.exif.make || 'Tidak Diketahui'} {report.exif.model}
              </div>
            </td>
            <td className="py-3 px-4">
              {report.exif.location ? (
                <div className="flex items-center gap-2 text-xs font-mono bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded inline-flex border border-blue-100 dark:border-blue-700">
                  <MapPin size={12} />
                  {report.exif.location.lat.toFixed(5)}, {report.exif.location.lng.toFixed(5)}
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-300 italic">Tanpa GPS</span>
              )}
            </td>
            <td className="py-3 px-4">
              {report.driveFileId ? (
                <a 
                  href={`https://drive.google.com/file/d/${report.driveFileId}/view`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-bold underline"
                >
                  <ExternalLink size={14} /> Lihat File
                </a>
              ) : (
                <span className="text-xs text-slate-300 dark:text-slate-500">Belum Ada</span>
              )}
            </td>
            <td className="py-3 px-4">
              {onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(`Hapus data "${report.file.name}"?`)) {
                      onDelete(report.id);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-2 rounded-lg transition-colors"
                  title="Hapus data"
                >
                  <Trash2 size={14} /> Hapus
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </>
  );
};
