import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ path, icon, label, exact = false }: { path: string, icon: string, label: string, exact?: boolean }) => {
     const active = exact ? location.pathname === path : location.pathname.startsWith(path);
     return (
      <button 
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <span className={`material-symbols-outlined text-[22px] ${active ? 'icon-filled' : 'group-hover:text-primary'}`}>{icon}</span>
        <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
      </button>
     )
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined">local_shipping</span>
        </div>
        <div>
          <h1 className="text-slate-900 text-lg font-bold leading-none">LogiFlow</h1>
          <p className="text-primary text-xs font-medium mt-1">Gestão Logística</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <NavItem path="/" icon="dashboard" label="Dashboard" exact />
        <NavItem path="/orders" icon="list_alt" label="Fila de Pedidos" />
        <NavItem path="/operational" icon="conveyor_belt" label="Fila Operacional" />
        <NavItem path="/routes" icon="map" label="Gestão de Rotas" />
        <NavItem path="/new-order" icon="add_circle" label="Novo Pedido" />
        <NavItem path="/drafts" icon="edit_note" label="Rascunhos" />
        <NavItem path="/fleet" icon="local_shipping" label="Gestão de Frota" />
        <NavItem path="/assembly" icon="build" label="Montagem" />
        <NavItem path="/reports" icon="bar_chart" label="Relatórios" />
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};