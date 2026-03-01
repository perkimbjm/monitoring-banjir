
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
  const [reguName, setReguName] = useState('');
  const [hasSeenGpsWarning, setHasSeenGpsWarning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Cleanup URL objects when component unmounts or reports change
  useEffect(() => {
    return () => {
      // Cleanup all preview URLs when component unmounts
      reports.forEach(report => {
        if (report.previewUrl && report.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(report.previewUrl);
        }
      });
    };
  }, [reports]);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    };
    setIsMobile(checkMobile());

    // Cek apakah user sudah pernah melihat GPS warning
    const seenWarning = localStorage.getItem('hasSeenGpsWarning');
    if (seenWarning === 'true') {
      setHasSeenGpsWarning(true);
    }
  }, []);

  const processFile = async (file: File): Promise<FloodReport> => {
    // Buat preview URL yang akan di-cleanup nanti
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
      exifData.dateTime = tags.DateTimeOriginal?.description || tags.DateTime?.description;
      
      console.log('EXIF DateTime:', exifData.dateTime); // Debug
    } catch (e) {
      console.warn('EXIF read error:', e);
    }

    const timestamp = Date.now();
    console.log('Timestamp:', timestamp, new Date(timestamp)); // Debug

    return {
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl,
      exif: exifData,
      timestamp,
      status: 'pending'
    };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    
    // Tutup popup jika masih terbuka
    if (showGpsWarning) {
      setShowGpsWarning(false);
    }
    
    // Batasi maksimal 5 foto
    const fileArray = Array.from(files);
    if (fileArray.length > 5) {
      alert('Maksimal 5 foto dapat diunggah sekaligus. Silakan pilih ulang.');
      return;
    }
    
    const newReports = await Promise.all(
      fileArray.map(async (file) => {
        const report = await processFile(file);
        return { ...report, regu: reguName };
      })
    );
    onReportsAdded(newReports);
  };

  const handleCameraClick = () => {
    // Jika user sudah pernah melihat warning, langsung buka kamera
    if (hasSeenGpsWarning) {
      cameraInputRef.current?.click();
    } else {
      setShowGpsWarning(true);
    }
  };

  const traverseToCamera = () => {
    // Simpan ke localStorage bahwa user sudah melihat warning
    localStorage.setItem('hasSeenGpsWarning', 'true');
    setHasSeenGpsWarning(true);
    setShowGpsWarning(false);
    cameraInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const uploadToDrive = async (report: FloodReport) => {
    onUpdateReport(report.id, { status: 'uploading' });
    
    // Simulasi progress upload
    setUploadProgress(prev => ({ ...prev, [report.id]: 0 }));
    
    // Simulasi progress increment
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[report.id] || 0;
        if (current >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, [report.id]: current + 10 };
      });
    }, 200);

    try {
      // Prepare metadata for the sheet
      const metadata = {
        id: report.id,
        latitude: report.exif.location?.lat || '',
        longitude: report.exif.location?.lng || '',
        altitude: '', // ExifReader might not capture altitude easily without parsing full tags
        camera_maker: report.exif.make || '',
        camera_model: report.exif.model || '',
        tanggal_pengambilan: report.exif.dateTime || new Date().toISOString(),
        regu: report.regu || reguName || ''
      };

      // Use the actual API to upload to Drive and record in Sheet
      const result = await uploadPhotoToDrive(report.file, metadata);
      
      console.log('Upload success:', result);
      
      // Set progress ke 100% sebelum complete
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [report.id]: 100 }));
      
      // Delay sedikit untuk menampilkan 100%
      await new Promise(resolve => setTimeout(resolve, 300));

      onUpdateReport(report.id, { 
        status: 'completed', 
        driveFileId: result.fileId // Save the real File ID from Drive
      });
      
      // Hapus progress setelah selesai
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[report.id];
        return newProgress;
      });
      
      return true;
    } catch (error) {
      console.error('Drive upload failed', error);
      clearInterval(progressInterval);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[report.id];
        return newProgress;
      });
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
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-600 transform transition-all scale-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-300 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={40} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-50">Penting!</h3>
              
              <div className="text-left bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-200 space-y-2 border border-slate-100 dark:border-slate-600">
                <p className="font-medium">Anda harus mengaktifkan tag GPS / Location dengan cara:</p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-500 dark:text-slate-300">
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

      {/* Input Regu */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-600">
        <label className="block mb-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nama Regu</span>
          <span className="text-xs text-slate-500 dark:text-slate-300 ml-2">(opsional)</span>
        </label>
        <input
          type="text"
          value={reguName}
          onChange={(e) => setReguName(e.target.value)}
          placeholder="Contoh: 2"
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-500 dark:text-slate-300 mt-2">
          Nama regu akan ditambahkan ke semua foto yang diupload
        </p>
      </div>

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
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 border-2 border-dashed text-slate-700 dark:text-slate-100 rounded-3xl active:scale-95 transition-all group w-full ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' 
              : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
          }`}
        >
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-slate-500 dark:text-slate-200">
            <Upload size={32} />
          </div>
          <span className="text-xl font-bold">Upload Foto</span>
          <p className="text-slate-400 dark:text-slate-300 text-sm">Pilih {isMobile ? '' : 'atau drag & drop '}maksimal 5 foto</p>
          <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
        </button>
      </div>

      {reports.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-700">
          <div>
            <h4 className="font-bold text-blue-600 dark:text-blue-500">Sinkronisasi Data</h4>
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
        <h3 className="text-sm font-bold uppercase text-slate-600 tracking-widest flex items-center gap-2">
           <ImageIcon size={16} /> Daftar Monitoring Lapangan
        </h3>
        {reports.length === 0 ? (
          <div className="bg-slate-100/50 dark:bg-slate-700/50 rounded-2xl py-12 text-center text-slate-400 dark:text-slate-300 border border-dashed border-slate-200 dark:border-slate-600">
            Belum ada data yang dikumpulkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden group transition-colors">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700">
                  <img 
                    src={report.driveFileId 
                      ? `https://drive.google.com/thumbnail?id=${report.driveFileId}&sz=w300`
                      : report.previewUrl
                    } 
                    className="w-full h-full object-cover" 
                    alt="Preview"
                    loading="lazy"
                    onLoad={(e) => {
                      // Hapus skeleton saat gambar berhasil dimuat
                      const target = e.target as HTMLImageElement;
                      target.parentElement?.classList.remove('animate-pulse');
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.log('Image load error:', target.src);
                      
                      // Jika sedang menggunakan Drive thumbnail, coba previewUrl
                      if (report.driveFileId && target.src.includes('drive.google.com')) {
                        console.log('Fallback to previewUrl:', report.previewUrl);
                        target.src = report.previewUrl;
                      } else {
                        // Jika previewUrl juga gagal, tampilkan placeholder
                        console.log('Both sources failed, showing placeholder');
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }
                    }}
                  />
                  {/* Placeholder jika gambar gagal dimuat */}
                  <div className="absolute inset-0 hidden items-center justify-center bg-slate-200 dark:bg-slate-700">
                    <ImageIcon size={48} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    {report.status === 'completed' && (
                      <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg"><CheckCircle size={14} /></div>
                    )}
                    {report.status === 'uploading' && uploadProgress[report.id] !== undefined && (
                      <div className="relative w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#e5e7eb"
                            strokeWidth="3"
                            fill="none"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - uploadProgress[report.id] / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-blue-600">{uploadProgress[report.id]}%</span>
                      </div>
                    )}
                    {report.status === 'uploading' && uploadProgress[report.id] === undefined && (
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
                   <p className="text-[11px] text-slate-600 dark:text-slate-200 font-bold truncate">{report.file.name}</p>
                   <p className="text-[10px] text-slate-400">
                     {(() => {
                       try {
                         console.log('Report data:', { 
                           exifDateTime: report.exif.dateTime, 
                           timestamp: report.timestamp,
                           timestampDate: report.timestamp ? new Date(report.timestamp) : null
                         }); // Debug
                         
                         // Coba parse EXIF dateTime terlebih dahulu
                         if (report.exif.dateTime) {
                           // Format EXIF: "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
                           const exifDate = report.exif.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                           const date = new Date(exifDate);
                           if (!isNaN(date.getTime())) {
                             return date.toLocaleString('id-ID', { 
                               day: '2-digit', 
                               month: 'short', 
                               year: 'numeric',
                               hour: '2-digit',
                               minute: '2-digit'
                             });
                           }
                         }
                         // Fallback ke timestamp
                         if (report.timestamp && typeof report.timestamp === 'number') {
                           const date = new Date(report.timestamp);
                           if (!isNaN(date.getTime())) {
                             return date.toLocaleString('id-ID', { 
                               day: '2-digit', 
                               month: 'short', 
                               year: 'numeric',
                               hour: '2-digit',
                               minute: '2-digit'
                             });
                           }
                         }
                         return 'Tanggal tidak tersedia';
                       } catch (e) {
                         console.error('Date parsing error:', e);
                         return 'Tanggal tidak tersedia';
                       }
                     })()}
                   </p>
                   
                   <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-600">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        report.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 
                        report.status === 'uploading' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
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
