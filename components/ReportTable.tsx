
import React from 'react';
import { FloodReport } from '../types';
import { MapPin, Calendar, Smartphone, ExternalLink, CloudCheck, CloudOff } from 'lucide-react';

interface ReportTableProps {
  reports: FloodReport[];
}

export const ReportTable: React.FC<ReportTableProps> = ({ reports }) => {
  if (reports.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
        <span className="text-6xl mb-4 opacity-10 dark:opacity-20">📂</span>
        <p className="font-medium">Belum ada data terekam. Silakan surveyor mengunggah foto.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
          <th className="py-4 px-4 font-bold">Foto</th>
          <th className="py-4 px-4 font-bold">Sinkronisasi</th>
          <th className="py-4 px-4 font-bold">Metadata Perangkat</th>
          <th className="py-4 px-4 font-bold">Koordinat (Lat, Lng)</th>
          <th className="py-4 px-4 font-bold">Tautan Drive</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {reports.map((report) => (
          <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-600">
                  <img src={report.previewUrl} className="w-full h-full object-cover" alt="Thumb" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate max-w-[120px]">{report.file.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono italic flex items-center gap-1">
                    <Calendar size={10} /> {report.exif.dateTime?.substring(0,10) || new Date(report.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </td>
            <td className="py-3 px-4">
              {report.status === 'completed' ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full inline-flex">
                   <CloudCheck size={14} /> Terkirim
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full inline-flex">
                   <CloudOff size={14} /> Lokal
                </div>
              )}
            </td>
            <td className="py-3 px-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Smartphone size={12} className="text-slate-400" />
                {report.exif.make || 'Tidak Diketahui'} {report.exif.model}
              </div>
            </td>
            <td className="py-3 px-4">
              {report.exif.location ? (
                <div className="flex items-center gap-2 text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded inline-flex border border-blue-100 dark:border-blue-800">
                  <MapPin size={12} />
                  {report.exif.location.lat.toFixed(5)}, {report.exif.location.lng.toFixed(5)}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Tanpa GPS</span>
              )}
            </td>
            <td className="py-3 px-4">
              {report.driveFileId ? (
                <a 
                  href={`https://drive.google.com/file/d/${report.driveFileId}/view`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline"
                >
                  <ExternalLink size={14} /> Lihat File
                </a>
              ) : (
                <span className="text-xs text-slate-300 dark:text-slate-600">Belum Ada</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
