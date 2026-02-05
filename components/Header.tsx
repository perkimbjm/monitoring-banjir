
import React from 'react';
import { Waves, Zap, Sun, Moon, UserCircle, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  toggleTheme: () => void;
  isDark: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleTheme, isDark, role, setRole }) => {
  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 text-white sticky top-0 z-40 shadow-xl transition-all duration-300">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Section */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-xl text-white shadow-inner border border-white/20">
            <Waves size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-none tracking-tight shadow-black drop-shadow-sm">Monitoring Banjir</h1>
            <p className="text-[10px] uppercase font-bold text-indigo-100 tracking-[0.25em] mt-0.5"> dan Potensi Bencana</p>
          </div>
        </div>

        {/* Central Navigation - Floating Pill */}
        <div className="hidden md:flex bg-black/20 dark:bg-black/40 backdrop-blur-sm p-1 rounded-full border border-white/10 shadow-lg">
          <button 
            onClick={() => setRole('surveyor')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              role === 'surveyor' 
                ? 'bg-white text-indigo-600 shadow-md scale-105' 
                : 'text-indigo-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <UserCircle size={16} /> 
            <span>Surveyor Portal</span>
          </button>
          <button 
            onClick={() => setRole('admin')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              role === 'admin' 
                ? 'bg-white text-purple-600 shadow-md scale-105' 
                : 'text-purple-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck size={16} /> 
            <span>Admin Dashboard</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 min-w-fit">
          <button
            onClick={toggleTheme}
            className="group p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all hover:scale-110 active:scale-95"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun size={20} className="text-amber-300 group-hover:rotate-90 transition-transform duration-500" />
            ) : (
              <Moon size={20} className="text-indigo-100 group-hover:-rotate-12 transition-transform duration-500" />
            )}
          </button>
          
          <div className="h-8 w-px bg-white/20 mx-1 hidden sm:block"></div>
          
          <div className="flex items-center gap-3 pl-1">
             <div className="flex flex-col items-end text-right hidden lg:flex">
               <span className="text-xs font-bold text-white leading-tight">Sistem Informasi</span>
               <span className="text-[10px] text-indigo-200">Kota Banjarmasin</span>
             </div>
             <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg border border-white/20 animate-in fade-in zoom-in duration-500">
               <Zap size={20} fill="currentColor" className="text-white" />
             </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation (Visible only on small screens) */}
      <div className="md:hidden flex border-t border-white/10 bg-black/10 backdrop-blur-md">
        <button 
            onClick={() => setRole('surveyor')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${
              role === 'surveyor' ? 'bg-white/20 text-white' : 'text-indigo-100'
            }`}
        >
          <UserCircle size={14} /> Surveyor
        </button>
        <div className="w-px bg-white/10"></div>
        <button 
            onClick={() => setRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${
              role === 'admin' ? 'bg-white/20 text-white' : 'text-indigo-100'
            }`}
        >
          <ShieldCheck size={14} /> Admin
        </button>
      </div>
    </header>
  );
};
