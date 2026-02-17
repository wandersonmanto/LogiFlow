import React from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-2 bg-background-light border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400" 
                placeholder="Pesquisar pedidos, clientes ou notas..." 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none text-slate-900">{currentUser?.displayName || 'Usuário'}</p>
                <p className="text-[10px] text-primary font-medium uppercase tracking-wider mt-1">Operador Logístico</p>
              </div>
              <div 
                className="size-10 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200"
                style={{ backgroundImage: `url('${currentUser?.photoURL || 'https://via.placeholder.com/40'}')` }}
              ></div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
