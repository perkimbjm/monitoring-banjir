import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PhotoUpload } from './components/PhotoUpload';
// Lazy load MapViewer as it contains heavy dependencies (maplibre-gl)
import { MapViewer } from './components/MapViewer';
import { ReportTable } from './components/ReportTable';
import { FloodReport, UserRole } from './types';
import { fetchSheetData } from './api';
import { applyServiceWorkerUpdate } from './pwa';
import * as XLSX from 'xlsx';
import {
  Activity,
  UserCircle,
  ShieldCheck,
  Download,
  PlusCircle,
  Map as MapIcon,
  Table as TableIcon,
  CloudUpload,
  RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<FloodReport[]>([]);
  const [role, setRole] = useState<UserRole>('surveyor');
  const [adminView, setAdminView] = useState<'map' | 'table'>('map');
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      // Jika ada pilihan tersimpan, gunakan itu
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
      // Jika belum pernah pilih, gunakan preferensi sistem sebagai default
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Listen for service worker updates
  useEffect(() => {
    const handleSwUpdate = () => setSwUpdateAvailable(true);
    window.addEventListener('sw-update-available', handleSwUpdate);
    return () => window.removeEventListener('sw-update-available', handleSwUpdate);
  }, []);

  // Load data from Google Sheet on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchSheetData();
        const loadedReports: FloodReport[] = data.map(item => {
          // Robust coordinate parsing
          const parseCoord = (val: string | number) => {
             if (typeof val === 'number') return val;
             if (!val) return undefined;
             // Remove leading quote (common in Sheets) and fix comma decimal
             const cleanVal = String(val).replace(/^'/, '').replace(',', '.').trim();
             if (cleanVal === '') return undefined;
             const num = Number(cleanVal);
             return isNaN(num) ? undefined : num;
          };

          const lat = parseCoord(item.latitude);
          const lng = parseCoord(item.longitude);

          // Extract Drive ID if possible
          const driveIdMatch = item.link_drive?.match(/\/d\/(.+?)\//);
          const driveId = driveIdMatch ? driveIdMatch[1] : undefined;

          return {
            id: item.id || Math.random().toString(36),
            // Mock File object for compatibility
            file: { name: item.nama_file || 'Untitled', type: 'image/jpeg' } as File,
            // Convert View Link to something usable? For now keep original link
            previewUrl: item.link_drive, 
            exif: {
              make: item.camera_maker,
              model: item.camera_model,
              dateTime: item.tanggal_pengambilan,
              location: (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) ? {
                lat,
                lng
              } : undefined
            },
            timestamp: (() => {
              try {
                if (item.tanggal_pengambilan) {
                  // Coba parse format EXIF: "YYYY:MM:DD HH:MM:SS"
                  const exifDate = item.tanggal_pengambilan.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                  const date = new Date(exifDate);
                  if (!isNaN(date.getTime())) {
                    return date.getTime();
                  }
                }
                return Date.now();
              } catch (e) {
                return Date.now();
              }
            })(),
            status: 'completed',
            driveFileId: driveId,
            regu: item.regu || undefined
          } as FloodReport;
        });

        setReports(prev => {
             const existingIds = new Set(prev.map(r => r.id));
             const uniqueNew = loadedReports.filter(r => !existingIds.has(r.id));
             return [...prev, ...uniqueNew];
        });
      } catch (err) {
        console.error("Failed to load sheet data", err);
      }
    };
    loadData();
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const handleReportsAdded = useCallback((newReports: FloodReport[]) => {
    setReports(prev => [...newReports, ...prev]);
  }, []);

  const handleUpdateReport = useCallback((id: string, updates: Partial<FloodReport>) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const handleDeleteReport = useCallback(async (id: string) => {
    try {
      // Import deletePhotoFromDrive
      const { deletePhotoFromDrive } = await import('./api');
      await deletePhotoFromDrive(id);
      setReports(prev => prev.filter(r => r.id !== id));
      
      // Tampilkan pesan sukses
      showNotification('Data berhasil dihapus!', 'success');
    } catch (error) {
      console.error('Failed to delete report:', error);
      
      // Tampilkan pesan error
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus data';
      showNotification(`Gagal menghapus data: ${errorMessage}`, 'error');
    }
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`;
    
    notification.innerHTML = `
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${type === 'success' 
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
        }
      </svg>
      <span class="font-semibold">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
      notification.style.animation = 'slide-out-to-top 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  const handleExportExcel = useCallback(() => {
    if (reports.length === 0) return;
    const exportData = reports.map(r => ({
      ID: r.id,
      Filename: r.file.name,
      Regu: r.regu || 'N/A',
      Date: r.exif.dateTime || new Date(r.timestamp).toLocaleString(),
      Latitude: r.exif.location?.lat || 'N/A',
      Longitude: r.exif.location?.lng || 'N/A',
      Device: `${r.exif.make || ''} ${r.exif.model || ''}`,
      Drive_Link: r.driveFileId ? `https://drive.google.com/file/d/${r.driveFileId}/view` : 'Not Uploaded'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FloodReports");
    XLSX.writeFile(workbook, `Flood_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [reports]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">

      {swUpdateAvailable && (
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-center gap-3 text-sm z-50">
          <RefreshCw size={16} className="animate-spin" />
          <span className="font-medium">Versi baru tersedia!</span>
          <button
            onClick={() => applyServiceWorkerUpdate()}
            className="bg-white text-blue-600 px-3 py-1 rounded-md font-bold text-xs hover:bg-blue-50 transition-colors"
          >
            Perbarui
          </button>
        </div>
      )}

      <Header toggleTheme={toggleTheme} isDark={isDark} role={role} setRole={setRole} />
      
      <main className="flex-1 flex flex-col">
        {role === 'surveyor' ? (
          <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-50 flex items-center gap-3">
                <PlusCircle className="text-blue-600 dark:text-blue-300" size={32} /> Pengumpulan Data Lapangan
              </h2>
              <p className="text-slate-500 dark:text-slate-300 text-lg">Ambil foto lokasi banjir dan sinkronkan ke Google Drive.</p>
            </div>
            
            <PhotoUpload 
              onReportsAdded={handleReportsAdded} 
              onUpdateReport={handleUpdateReport}
              reports={reports} 
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto p-4 md:p-8 gap-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={<Activity size={24} />} label="Total Laporan" value={reports.length} color="blue" />
              <StatCard icon={<MapIcon size={24} />} label="Terpetakan" value={reports.filter(r => r.exif.location).length} color="green" />
              <StatCard icon={<CloudUpload size={24} />} label="Terupload ke Drive" value={reports.filter(r => r.status === 'completed').length} color="purple" />
              <button 
                onClick={handleExportExcel}
                disabled={reports.length === 0}
                className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none p-6 flex items-center justify-between transition-all group disabled:opacity-50 hover:-translate-y-1"
              >
                <div className="text-left">
                  <p className="text-xs font-bold uppercase opacity-60 mb-1">Laporan Akhir</p>
                  <p className="text-xl font-bold">Export Excel</p>
                </div>
                <div className="bg-white/10 p-2 rounded-lg">
                  <Download className="group-hover:translate-y-0.5 transition-transform" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 self-start transition-colors">
                <button 
                  onClick={() => setAdminView('map')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${adminView === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <MapIcon size={18} />
                  <span className="text-sm font-bold">WebGIS View</span>
                </button>
                <button 
                  onClick={() => setAdminView('table')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${adminView === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <TableIcon size={18} />
                  <span className="text-sm font-bold">Data Explorer</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden min-h-[600px] transition-colors" style={{ display: 'flex', flexDirection: 'column' }}>
              {adminView === 'map' ? (
                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                  <MapViewer reports={reports} />
                </div>
              ) : (
                <div className="p-6 overflow-x-auto">
                  <ReportTable reports={reports} onDelete={handleDeleteReport} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8 mt-auto transition-colors">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-slate-500 dark:text-slate-300">
             <span className="font-bold text-slate-700 dark:text-slate-100">BPBD Kota Banjarmasin</span>
             <span className="hidden md:inline w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
             <span className="text-sm">Disaster Data Collector System</span>
          </div>
          <p className="text-xs font-medium text-slate-400">
            &copy; {new Date().getFullYear()} di-Develop oleh Digitalisme. Hak Cipta Dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'
  };
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 flex items-center gap-4 transition-colors">
      <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 dark:text-slate-50">{value}</p>
      </div>
    </div>
  );
};

export default App;
