import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Download,
  PlusCircle,
  Map as MapIcon,
  Table as TableIcon,
  CloudUpload,
  RefreshCw
} from 'lucide-react';

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

const App: React.FC = () => {
  const [reports, setReports] = useState<FloodReport[]>([]);
  const [role, setRole] = useState<UserRole>('surveyor');
  const [adminView, setAdminView] = useState<'map' | 'table'>('map');
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  
  // State untuk filter
  const [captureDateStart, setCaptureDateStart] = useState<string>('');
  const [captureDateEnd, setCaptureDateEnd] = useState<string>('');
  const [uploadDateStart, setUploadDateStart] = useState<string>('');
  const [uploadDateEnd, setUploadDateEnd] = useState<string>('');
  const [reguFilter, setReguFilter] = useState<string>('all');
  
  // Theme state dengan default LIGHT jika localStorage kosong
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'dark';
    }
    return false;
  });

  // Dapatkan daftar regu unik dari data
  const uniqueRegus = useMemo(() => {
    const regus = new Set(reports.map(r => r.regu).filter(Boolean));
    return Array.from(regus).sort();
  }, [reports]);

  // Filter data
  const filteredReports = useMemo(() => {
    let result = [...reports];
    
    // Filter berdasarkan waktu pengambilan
    if (captureDateStart) {
      const startTime = new Date(captureDateStart).getTime();
      result = result.filter(r => {
        const captureTime = parseExifDate(r.exif.dateTime) || r.timestamp;
        return captureTime >= startTime;
      });
    }
    
    if (captureDateEnd) {
      const endTime = new Date(captureDateEnd).getTime() + 86400000;
      result = result.filter(r => {
        const captureTime = parseExifDate(r.exif.dateTime) || r.timestamp;
        return captureTime < endTime;
      });
    }
    
    // Filter berdasarkan waktu upload
    if (uploadDateStart) {
      const startTime = new Date(uploadDateStart).getTime();
      result = result.filter(r => r.timestamp >= startTime);
    }
    
    if (uploadDateEnd) {
      const endTime = new Date(uploadDateEnd).getTime() + 86400000;
      result = result.filter(r => r.timestamp < endTime);
    }
    
    // Filter berdasarkan regu
    if (reguFilter !== 'all') {
      result = result.filter(r => r.regu && String(r.regu).trim().toLowerCase() === String(reguFilter).trim().toLowerCase());
    }
    
    return result;
  }, [reports, captureDateStart, captureDateEnd, uploadDateStart, uploadDateEnd, reguFilter]);

  // Fungsi untuk mereset semua filter
  const resetFilters = useCallback(() => {
    setCaptureDateStart('');
    setCaptureDateEnd('');
    setUploadDateStart('');
    setUploadDateEnd('');
    setReguFilter('all');
  }, []);

  // Cek apakah ada filter aktif
  const hasActiveFilters = captureDateStart || captureDateEnd || uploadDateStart || uploadDateEnd || reguFilter !== 'all';

  // Apply theme tanpa FOUC
  useEffect(() => {
    // Prevent FOUC dengan mengaplikasikan theme segera
    const applyTheme = (dark: boolean) => {
      if (dark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };

    applyTheme(isDark);
  }, [isDark]);

  // Initialize theme on mount untuk mencegah FOUC
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const shouldBeDark = savedTheme === 'dark';
      
      // Apply theme immediately jika berbeda dengan state
      if (shouldBeDark !== isDark) {
        setIsDark(shouldBeDark);
      } else {
        // Pastikan DOM sudah sesuai dengan state
        if (shouldBeDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, []); // Run once on mount

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

  // Reset theme function untuk debugging
  const resetTheme = useCallback(() => {
    localStorage.removeItem('theme');
    setIsDark(false); // Reset ke light mode
    document.documentElement.classList.remove('dark');
    console.log('Theme reset to default (light mode)');
  }, []);

  // Expose resetTheme ke window untuk debugging di console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetTheme = resetTheme;
      console.log('Debug: window.resetTheme() available for theme reset');
    }
  }, [resetTheme]);

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
    if (filteredReports.length === 0) {
      showNotification('Tidak ada data untuk diexport!', 'error');
      return;
    }
    const exportData = filteredReports.map(r => ({
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
    const fileName = hasActiveFilters 
      ? `Flood_Data_Filtered_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Flood_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showNotification(`Berhasil export ${filteredReports.length} data!`, 'success');
  }, [filteredReports, hasActiveFilters]);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">

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
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <PlusCircle className="text-blue-600 dark:text-blue-300" size={32} /> Pengumpulan Data Lapangan
              </h2>
              <p className="text-lg">Ambil foto lokasi banjir dan sinkronkan ke Google Drive.</p>
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
                className="bg-green-800 hover:bg-green-900 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none p-6 flex items-center justify-between transition-all group disabled:opacity-60 hover:-translate-y-1"
              >
                <div className="text-left">
                  <p className="text-xs font-bold uppercase text-slate-200 dark:text-slate-100 mb-1">Laporan Akhir</p>
                  <p className="text-xl font-bold text-white">Export Excel</p>
                </div>
                <div className="bg-white/10 p-2 rounded-lg">
                  <Download className="group-hover:translate-y-0.5 transition-transform text-white" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 self-start transition-colors">
                <button 
                  onClick={() => setAdminView('map')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${adminView === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <MapIcon size={18} />
                  <span className="text-sm font-bold">WebGIS View</span>
                </button>
                <button 
                  onClick={() => setAdminView('table')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${adminView === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <TableIcon size={18} />
                  <span className="text-sm font-bold">Data Explorer</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden min-h-[600px] transition-colors" style={{ display: 'flex', flexDirection: 'column' }}>
              {adminView === 'map' ? (
                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                  <MapViewer 
                    reports={reports} 
                    filteredReports={filteredReports}
                    uniqueRegus={uniqueRegus}
                    captureDateStart={captureDateStart}
                    captureDateEnd={captureDateEnd}
                    uploadDateStart={uploadDateStart}
                    uploadDateEnd={uploadDateEnd}
                    reguFilter={reguFilter}
                    setCaptureDateStart={setCaptureDateStart}
                    setCaptureDateEnd={setCaptureDateEnd}
                    setUploadDateStart={setUploadDateStart}
                    setUploadDateEnd={setUploadDateEnd}
                    setReguFilter={setReguFilter}
                    resetFilters={resetFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                </div>
              ) : (
                <div className="p-6 overflow-x-auto">
                  <ReportTable 
                    reports={reports} 
                    filteredReports={filteredReports}
                    uniqueRegus={uniqueRegus}
                    captureDateStart={captureDateStart}
                    captureDateEnd={captureDateEnd}
                    uploadDateStart={uploadDateStart}
                    uploadDateEnd={uploadDateEnd}
                    reguFilter={reguFilter}
                    setCaptureDateStart={setCaptureDateStart}
                    setCaptureDateEnd={setCaptureDateEnd}
                    setUploadDateStart={setUploadDateStart}
                    setUploadDateEnd={setUploadDateEnd}
                    setReguFilter={setReguFilter}
                    resetFilters={resetFilters}
                    hasActiveFilters={hasActiveFilters}
                    onDelete={handleDeleteReport} 
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8 mt-auto transition-colors">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-slate-600 dark:text-slate-300">
             <span className="font-bold text-slate-800 dark:text-slate-100">BPBD Kota Banjarmasin</span>
             <span className="hidden md:inline w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full"></span>
             <span className="text-sm">Disaster Data Collector System</span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider leading-none mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 dark:text-slate-50">{value}</p>
      </div>
    </div>
  );
};

export default App;
