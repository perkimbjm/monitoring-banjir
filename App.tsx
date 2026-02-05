
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PhotoUpload } from './components/PhotoUpload';
// Lazy load MapViewer as it contains heavy dependencies (maplibre-gl)
const MapViewer = React.lazy(() => import('./components/MapViewer').then(module => ({ default: module.MapViewer })));
import { ReportTable } from './components/ReportTable';
import { FloodReport, UserRole } from './types';
import * as XLSX from 'xlsx';
import { 
  Activity, 
  UserCircle, 
  ShieldCheck,
  Download,
  PlusCircle,
  Map as MapIcon,
  Table as TableIcon,
  CloudUpload
} from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<FloodReport[]>([]);
  const [role, setRole] = useState<UserRole>('surveyor');
  const [adminView, setAdminView] = useState<'map' | 'table'>('map');
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const handleReportsAdded = useCallback((newReports: FloodReport[]) => {
    setReports(prev => [...newReports, ...prev]);
  }, []);

  const handleUpdateReport = useCallback((id: string, updates: Partial<FloodReport>) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const handleExportExcel = useCallback(() => {
    if (reports.length === 0) return;
    const exportData = reports.map(r => ({
      ID: r.id,
      Filename: r.file.name,
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      <Header toggleTheme={toggleTheme} isDark={isDark} role={role} setRole={setRole} />
      
      <main className="flex-1 flex flex-col">
        {role === 'surveyor' ? (
          <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <PlusCircle className="text-blue-600 dark:text-blue-400" size={32} /> Pengumpulan Data Lapangan
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Ambil foto lokasi banjir dan sinkronkan ke Google Drive.</p>
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
                className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none p-6 flex items-center justify-between transition-all group disabled:opacity-50 hover:-translate-y-1"
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
              <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 self-start transition-colors">
                <button 
                  onClick={() => setAdminView('map')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${adminView === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <MapIcon size={18} />
                  <span className="text-sm font-bold">WebGIS View</span>
                </button>
                <button 
                  onClick={() => setAdminView('table')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${adminView === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <TableIcon size={18} />
                  <span className="text-sm font-bold">Data Explorer</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[600px] flex flex-col transition-colors">
              {adminView === 'map' ? (
                <React.Suspense fallback={<div className="w-full h-full flex items-center justify-center text-slate-500">Loading Map...</div>}>
                  <MapViewer reports={reports} />
                </React.Suspense>
              ) : (
                <div className="p-6 overflow-x-auto">
                  <ReportTable reports={reports} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto transition-colors">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-slate-500 dark:text-slate-400">
             <span className="font-bold text-slate-700 dark:text-slate-200">BPBD Kota Banjarmasin</span>
             <span className="hidden md:inline w-1 h-1 bg-slate-300 rounded-full"></span>
             <span className="text-sm">Disaster Data Collector System</span>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Hak Cipta Dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
  };
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
      <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider leading-none mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

export default App;
