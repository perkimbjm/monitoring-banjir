
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, CheckCircle, Image as ImageIcon, CloudUpload, Loader2, AlertCircle } from 'lucide-react';
import { FloodReport, ExifData } from '../types';
import ExifReader from 'exifreader';
import { uploadPhotoToDrive } from '../api';

interface PhotoUploadProps {
  onReportsAdded: (reports: FloodReport[]) => void;
  onUpdateReport: (id: string, updates: Partial<FloodReport>) => void;
  reports: FloodReport[];
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ onReportsAdded, onUpdateReport, reports }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGpsWarning, setShowGpsWarning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    };
    setIsMobile(checkMobile());
  }, []);

  const processFile = async (file: File): Promise<FloodReport> => {
    const previewUrl = URL.createObjectURL(file);
    let exifData: ExifData = {};

    try {
      const tags = await ExifReader.load(file);
      if (tags.GPSLatitude && tags.GPSLongitude) {
        exifData.location = {
          lat: Number(tags.GPSLatitude.description) * (tags.GPSLatitudeRef?.value[0] === 'S' ? -1 : 1),
          lng: Number(tags.GPSLongitude.description) * (tags.GPSLongitudeRef?.value[0] === 'W' ? -1 : 1),
        };
      }
      exifData.make = tags.Make?.description;
      exifData.model = tags.Model?.description;
      exifData.dateTime = tags.DateTimeOriginal?.description;
    } catch (e) {
      console.warn('EXIF read error:', e);
    }

    return {
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl,
      exif: exifData,
      timestamp: Date.now(),
      status: 'pending'
    };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newReports = await Promise.all(Array.from(files).map(processFile));
    onReportsAdded(newReports);
  };

  const handleCameraClick = () => {
    setShowGpsWarning(true);
  };

  const traverseToCamera = () => {
    setShowGpsWarning(false);
    cameraInputRef.current?.click();
  };

  const uploadToDrive = async (report: FloodReport) => {
    onUpdateReport(report.id, { status: 'uploading' });

    try {
      // Use the actual API to upload to Drive
      const result = await uploadPhotoToDrive(report.file);
      
      console.log('Upload success:', result);

      onUpdateReport(report.id, { 
        status: 'completed', 
        driveFileId: result.fileId // Save the real File ID from Drive
      });
      return true;
    } catch (error) {
      console.error('Drive upload failed', error);
      onUpdateReport(report.id, { status: 'failed' });
      return false;
    }
  };

  const handleSubmitAll = async () => {
    const pendingReports = reports.filter(r => r.status === 'pending' || r.status === 'failed');
    if (pendingReports.length === 0) return;

    setIsSyncing(true);
    for (const report of pendingReports) {
      await uploadToDrive(report);
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-10">
      
      {/* GPS Warning Modal */}
      {showGpsWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 transform transition-all scale-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={40} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Penting!</h3>
              
              <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 space-y-2 border border-slate-100 dark:border-slate-700">
                <p className="font-medium">Anda harus mengaktifkan tag GPS / Location dengan cara:</p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                  <li>Masuk <strong>Pengaturan Kamera</strong> (ikon ⚙️)</li>
                  <li>Aktifkan: <strong>Tag lokasi</strong> / <strong>Lokasi</strong> / <strong>Simpan lokasi</strong> / <strong>GPS tag</strong></li>
                </ol>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setShowGpsWarning(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={traverseToCamera}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                >
                  Saya Mengerti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isMobile ? 'sm:grid-cols-2' : ''} gap-6`}>
        {isMobile && (
          <button 
            onClick={handleCameraClick}
            className="flex flex-col items-center justify-center p-8 bg-blue-600 text-white rounded-3xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all group"
          >
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <span className="text-xl font-bold">Buka Kamera</span>
            <p className="text-blue-100 text-sm opacity-80">Capture langsung di lokasi</p>
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFiles(e.target.files)} />
          </button>
        )}

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-3xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95 transition-all group w-full"
        >
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-slate-500 dark:text-slate-300">
            <Upload size={32} />
          </div>
          <span className="text-xl font-bold">Unggah Galeri</span>
          <p className="text-slate-400 text-sm">Pilih {isMobile ? '' : 'atau drag & drop '}banyak foto sekaligus</p>
          <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
        </button>
      </div>

      {reports.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-300">Sinkronisasi Data</h4>
            <p className="text-xs text-blue-700 dark:text-blue-400">Terdapat {reports.filter(r => r.status === 'pending').length} foto yang belum dikirim ke Google Drive.</p>
          </div>
          <button 
            onClick={handleSubmitAll}
            disabled={isSyncing || reports.filter(r => r.status === 'pending' || r.status === 'failed').length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-800 disabled:opacity-50 transition-all"
          >
            {isSyncing ? <Loader2 className="animate-spin" /> : <CloudUpload />}
            {isSyncing ? 'Mengirim Data...' : 'Kirim ke Google Drive'}
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2">
           <ImageIcon size={16} /> Daftar Monitoring Lapangan
        </h3>
        {reports.length === 0 ? (
          <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl py-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700">
            Belum ada data yang dikumpulkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group transition-colors">
                <div className="relative aspect-[4/3]">
                  <img src={report.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    {report.status === 'completed' && (
                      <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg"><CheckCircle size={14} /></div>
                    )}
                    {report.status === 'uploading' && (
                      <div className="bg-blue-500 text-white p-1.5 rounded-full shadow-lg animate-spin"><Loader2 size={14} /></div>
                    )}
                    {report.status === 'failed' && (
                      <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg"><AlertCircle size={14} /></div>
                    )}
                    {report.status === 'pending' && (
                      <div className="bg-slate-800/80 backdrop-blur text-white p-1.5 rounded-full shadow-lg"><CloudUpload size={14} className="opacity-50" /></div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                   <div className="flex items-center gap-1.5 mb-1">
                     <div className={`w-2 h-2 rounded-full ${report.exif.location ? 'bg-green-500' : 'bg-red-500'}`} />
                     <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                       {report.exif.location ? 'GPS AKTIF' : 'TANPA GPS'}
                     </span>
                   </div>
                   <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold truncate">{report.file.name}</p>
                   <p className="text-[10px] text-slate-400">{new Date(report.timestamp).toLocaleTimeString()}</p>
                   
                   <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-700">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        report.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        report.status === 'uploading' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {report.status === 'completed' ? 'Tersimpan di Drive' : 
                         report.status === 'uploading' ? 'Sedang Mengunggah' : 'Menunggu Kirim'}
                      </span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
