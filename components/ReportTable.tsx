
import React, { useState, useEffect } from 'react';
import { FloodReport } from '../types';
import { MapPin, Calendar, Smartphone, ExternalLink, CloudCheck, CloudOff, Trash2, X } from 'lucide-react';

interface ReportTableProps {
  reports: FloodReport[];
  onDelete?: (id: string) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({ reports, onDelete }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<FloodReport | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');

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

  if (reports.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300">
        <span className="text-6xl mb-4 opacity-10 dark:opacity-30">📂</span>
        <p className="font-medium">Belum ada data terekam. Silakan surveyor mengunggah foto.</p>
      </div>
    );
  }

  return (
    <>
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
        <tr className="border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold">
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
        {reports.map((report) => (
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
