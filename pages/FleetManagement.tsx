import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Driver, Vehicle } from '../types';

export const FleetManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  // Form States (Drivers)
  const [driverForm, setDriverForm] = useState({ name: '', cnh: '', category: '', expirationDate: '', phone: '' });
  
  // Form States (Vehicles)
  const [vehicleForm, setVehicleForm] = useState({ model: '', plate: '', type: 'VUC', capacity: '' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const [d, v] = await Promise.all([dbService.getDrivers(), dbService.getVehicles()]);
        setDrivers(d);
        setVehicles(v);
    } catch (err: any) {
        console.error("Fetch Error:", err);
        let msg = "Erro ao conectar com o banco de dados.";
        if (err.message) msg += ` ${err.message}`;
        if (msg.includes("relation") && msg.includes("does not exist")) {
            msg = "ERRO CRÍTICO: As tabelas não foram criadas no Supabase. Execute o script SQL no painel.";
        } else if (msg.includes("API Key")) {
             msg = "ERRO DE AUTENTICAÇÃO: Verifique sua chave de API (Anon Key) no arquivo .env.";
        }
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
        await dbService.createDriver({
            ...driverForm,
            status: 'Disponível' // Default
        });
        setIsDriverModalOpen(false);
        setDriverForm({ name: '', cnh: '', category: '', expirationDate: '', phone: '' }); // Reset
        fetchData();
    } catch (err: any) {
        setError(`Falha ao salvar motorista: ${err.message}`);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      try {
          await dbService.createVehicle({
              ...vehicleForm,
              type: vehicleForm.type as any,
              status: 'Disponível'
          });
          setIsVehicleModalOpen(false);
          setVehicleForm({ model: '', plate: '', type: 'VUC', capacity: '' });
          fetchData();
      } catch (err: any) {
          setError(`Falha ao salvar veículo: ${err.message}`);
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'Disponível': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase">Disponível</span>;
          case 'Em Rota':
          case 'Em Uso': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 uppercase">Em Operação</span>;
          case 'Manutenção': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 uppercase">Manutenção</span>;
          default: return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500 uppercase">{status}</span>;
      }
  };

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
            <span className="opacity-70">LogiFlow</span>
            <span>/</span>
            <span className="text-slate-900">Frota</span>
           </nav>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Frota e Motoristas</h2>
           <p className="text-slate-500 text-sm mt-1">Controle centralizado de recursos logísticos.</p>
        </div>
        
        <button 
            onClick={() => activeTab === 'drivers' ? setIsDriverModalOpen(true) : setIsVehicleModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all"
        >
            <span className="material-symbols-outlined text-lg">add</span>
            {activeTab === 'drivers' ? 'Novo Motorista' : 'Novo Veículo'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-fadeIn">
            <span className="material-symbols-outlined text-red-500">error</span>
            <div>
                <p className="font-bold text-red-700 text-sm">Erro de Conexão</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
            <button
                onClick={() => setActiveTab('drivers')}
                className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'drivers' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <span className="material-symbols-outlined text-lg">person</span>
                Motoristas
            </button>
            <button
                onClick={() => setActiveTab('vehicles')}
                className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'vehicles' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                Veículos
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
         {loading ? (
             <div className="p-12 text-center text-slate-500">Carregando dados...</div>
         ) : (
             activeTab === 'drivers' ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">CNH / Categoria</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Validade CNH</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {drivers.map(driver => (
                                <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {driver.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm">{driver.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-mono text-slate-600">{driver.cnh}</span>
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded w-fit mt-1">CAT {driver.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{driver.expirationDate}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{driver.phone}</td>
                                    <td className="px-6 py-4">{getStatusBadge(driver.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                                    </td>
                                </tr>
                            ))}
                            {drivers.length === 0 && !error && <tr><td colSpan={6} className="text-center p-8 text-slate-400">Nenhum motorista cadastrado.</td></tr>}
                        </tbody>
                    </table>
                 </div>
             ) : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modelo</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Placa</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Capacidade</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {vehicles.map(vehicle => (
                                <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{vehicle.model}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600 bg-slate-50 px-2 rounded w-fit">{vehicle.plate}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{vehicle.type}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{vehicle.capacity}</td>
                                    <td className="px-6 py-4">{getStatusBadge(vehicle.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                                    </td>
                                </tr>
                            ))}
                            {vehicles.length === 0 && !error && <tr><td colSpan={6} className="text-center p-8 text-slate-400">Nenhum veículo cadastrado.</td></tr>}
                        </tbody>
                    </table>
                 </div>
             )
         )}
      </div>

      {/* DRIVER MODAL */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-lg">Novo Motorista</h3>
                    <button onClick={() => setIsDriverModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                        <input required type="text" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm" 
                            value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} placeholder="Ex: João da Silva" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CPF/CNH</label>
                            <input required type="text" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm" 
                                value={driverForm.cnh} onChange={e => setDriverForm({...driverForm, cnh: e.target.value})} placeholder="000.000.000-00" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Categoria CNH</label>
                            <select required className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm"
                                value={driverForm.category} onChange={e => setDriverForm({...driverForm, category: e.target.value})}>
                                <option value="">Selecione</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Validade CNH</label>
                            <input required type="date" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm" 
                                value={driverForm.expirationDate} onChange={e => setDriverForm({...driverForm, expirationDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                            <input required type="tel" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm" 
                                value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} placeholder="(00) 00000-0000" />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsDriverModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancelar</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-dark shadow-lg shadow-primary/20">Cadastrar Motorista</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* VEHICLE MODAL */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-lg">Novo Veículo</h3>
                    <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Modelo</label>
                        <input required type="text" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm" 
                            value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} placeholder="Ex: Mercedes Sprinter 415" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Placa</label>
                            <input required type="text" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm uppercase" 
                                value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} placeholder="ABC-1234" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                            <select required className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm"
                                value={vehicleForm.type} onChange={e => setVehicleForm({...vehicleForm, type: e.target.value})}>
                                <option value="VUC">VUC</option>
                                <option value="Toco">Toco</option>
                                <option value="Truck">Truck</option>
                                <option value="Van">Van</option>
                                <option value="Utilitário">Utilitário</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Capacidade de Carga</label>
                        <input required type="text" className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm" 
                            value={vehicleForm.capacity} onChange={e => setVehicleForm({...vehicleForm, capacity: e.target.value})} placeholder="Ex: 1500kg" />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancelar</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-dark shadow-lg shadow-primary/20">Cadastrar Veículo</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};