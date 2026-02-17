import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, LogisticsStatus, Driver, Vehicle } from '../types';
import { useNavigate } from 'react-router-dom';
import { OrderDetailModal } from '../components/OrderDetailModal';

export const OperationalQueue: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [error, setError] = useState<string | null>(null);
  
  // Modals State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Detail Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load Modal (Carregamento)
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Finish Modal (Entrega/Não Entrega)
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LogisticsStatus | null>(null);
  const [observation, setObservation] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await dbService.getOrders();
        setOrders(data);
    } catch (err: any) {
        console.error(err);
        setError("Erro ao carregar fila de pedidos. Verifique a conexão.");
    } finally {
        setLoading(false);
    }
  };

  const fetchFleet = async () => {
      try {
          const [d, v] = await Promise.all([dbService.getDrivers(), dbService.getVehicles()]);
          setDrivers(d);
          setVehicles(v);
      } catch (err) {
          console.error("Erro ao carregar frota para modal:", err);
      }
  }

  useEffect(() => {
    fetchOrders();
    fetchFleet();
  }, []);

  // Handler for simple status updates or opening modals
  const handleStatusUpdateClick = async (order: Order, newStatus: LogisticsStatus) => {
      if (newStatus === LogisticsStatus.IN_TRANSIT) {
          // Open Load Modal
          setSelectedOrder(order);
          setIsLoadModalOpen(true);
      } else if (newStatus === LogisticsStatus.COMPLETED || newStatus === LogisticsStatus.NOT_DELIVERED) {
          // Open Finish Modal
          setSelectedOrder(order);
          setPendingStatus(newStatus);
          setIsFinishModalOpen(true);
      } else {
          // Direct Update (including Retry from Not Delivered -> Separated)
          try {
             await dbService.updateLogisticsStatus(order.id, newStatus);
             fetchOrders();
          } catch(e) {
             alert("Erro ao atualizar status");
          }
      }
  };

  // Submit Load Modal
  const confirmLoad = async () => {
      if (!selectedOrder || !selectedDriverId || !selectedVehicleId) return;
      
      const driver = drivers.find(d => d.id === selectedDriverId);
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);

      try {
          await dbService.updateLogisticsStatus(selectedOrder.id, LogisticsStatus.IN_TRANSIT, {
              driver,
              vehicle
          });

          setIsLoadModalOpen(false);
          setSelectedDriverId('');
          setSelectedVehicleId('');
          setSelectedOrder(null);
          fetchOrders();
      } catch (e) {
          alert("Erro ao confirmar carregamento");
      }
  };

  // Submit Finish Modal
  const confirmFinish = async () => {
      if (!selectedOrder || !pendingStatus) return;

      try {
          await dbService.updateLogisticsStatus(selectedOrder.id, pendingStatus, {
              observation
          });

          setIsFinishModalOpen(false);
          setPendingStatus(null);
          setObservation('');
          setSelectedOrder(null);
          fetchOrders();
      } catch (e) {
          alert("Erro ao finalizar entrega");
      }
  };

  // Open Detail Modal
  const openDetail = (order: Order) => {
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'todos') return true;
    if (activeTab === 'pendentes') return order.logisticsStatus === LogisticsStatus.REGISTERED;
    if (activeTab === 'separar') return order.logisticsStatus === LogisticsStatus.REGISTERED; 
    if (activeTab === 'carregar') return order.logisticsStatus === LogisticsStatus.SEPARATED || order.logisticsStatus === LogisticsStatus.LOADED;
    if (activeTab === 'rota') return order.logisticsStatus === LogisticsStatus.IN_TRANSIT;
    if (activeTab === 'concluido') return order.logisticsStatus === LogisticsStatus.COMPLETED;
    if (activeTab === 'falhas') return order.logisticsStatus === LogisticsStatus.NOT_DELIVERED || order.logisticsStatus === LogisticsStatus.ADDRESS_NOT_FOUND;
    return true;
  });

  const getActionBtn = (order: Order) => {
    switch (order.logisticsStatus) {
      case LogisticsStatus.REGISTERED:
        return (
          <button 
            onClick={() => handleStatusUpdateClick(order, LogisticsStatus.SEPARATED)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            Iniciar Separação
          </button>
        );
      case LogisticsStatus.SEPARATED:
        return (
          <button 
            onClick={() => handleStatusUpdateClick(order, LogisticsStatus.LOADED)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            Confirmar Carregamento
          </button>
        );
      case LogisticsStatus.LOADED:
        return (
          <button 
            onClick={() => handleStatusUpdateClick(order, LogisticsStatus.IN_TRANSIT)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            Iniciar Rota
          </button>
        );
      case LogisticsStatus.IN_TRANSIT:
        return (
           <div className="flex gap-2 justify-end">
              <button 
                onClick={() => handleStatusUpdateClick(order, LogisticsStatus.NOT_DELIVERED)}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                Não Entregue
              </button>
              <button 
                onClick={() => handleStatusUpdateClick(order, LogisticsStatus.COMPLETED)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                Confirmar Entrega
              </button>
           </div>
        );
      case LogisticsStatus.NOT_DELIVERED:
      case LogisticsStatus.ADDRESS_NOT_FOUND:
        return (
          <button 
            onClick={() => handleStatusUpdateClick(order, LogisticsStatus.SEPARATED)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">replay</span>
            Nova Tentativa
          </button>
        );
      default:
        return <span className="text-xs text-slate-400 font-medium">Sem ações disponíveis</span>;
    }
  };

  const getStatusBadge = (status: LogisticsStatus) => {
    const styles: Record<string, string> = {
        [LogisticsStatus.REGISTERED]: 'bg-slate-100 text-slate-600',
        [LogisticsStatus.SEPARATED]: 'bg-blue-100 text-blue-700',
        [LogisticsStatus.LOADED]: 'bg-indigo-100 text-indigo-700',
        [LogisticsStatus.IN_TRANSIT]: 'bg-amber-100 text-amber-700',
        [LogisticsStatus.COMPLETED]: 'bg-emerald-100 text-emerald-700',
        [LogisticsStatus.NOT_DELIVERED]: 'bg-red-100 text-red-700',
        [LogisticsStatus.ADDRESS_NOT_FOUND]: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    );
  };

  const getBairro = (id: string) => {
    const bairros = ['Centro', 'Vila Mariana', 'Barra Funda', 'Pinheiros', 'Moema', 'Lapa', 'Tatuapé', 'Ipiranga', 'Jardins'];
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return bairros[sum % bairros.length];
  }

  const getVendedor = (id: string) => {
    const vendedores = ['Ricardo Souza', 'Amanda Lima', 'Bruno Castro', 'Carla Dias', 'Felipe Melo'];
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return vendedores[sum % vendedores.length];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Fila Operacional</h2>
           <p className="text-slate-500 text-sm mt-1">Gerencie o fluxo de cargas e descargas em tempo real.</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <span className="material-symbols-outlined text-lg">tune</span>
                Filtros Avançados
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <div>
                <p className="font-bold text-red-700 text-sm">Erro de Conexão</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        </div>
      )}

      <div className="border-b border-slate-200">
        <div className="flex gap-6 overflow-x-auto">
            {[
                { id: 'todos', label: 'Todos', count: orders.length },
                { id: 'pendentes', label: 'Pendentes', count: orders.filter(o => o.logisticsStatus === LogisticsStatus.REGISTERED).length },
                { id: 'separar', label: 'A Separar', count: orders.filter(o => o.logisticsStatus === LogisticsStatus.REGISTERED).length },
                { id: 'carregar', label: 'A Carregar', count: orders.filter(o => o.logisticsStatus === LogisticsStatus.SEPARATED || o.logisticsStatus === LogisticsStatus.LOADED).length },
                { id: 'rota', label: 'Em Rota', count: orders.filter(o => o.logisticsStatus === LogisticsStatus.IN_TRANSIT).length },
                { id: 'falhas', label: 'Falhas', count: orders.filter(o => o.logisticsStatus === LogisticsStatus.NOT_DELIVERED || o.logisticsStatus === LogisticsStatus.ADDRESS_NOT_FOUND).length },
                { id: 'concluido', label: 'Concluído', count: orders.filter(o => o.logisticsStatus === LogisticsStatus.COMPLETED).length },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === tab.id 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    {tab.label}
                    <span className={`text-[10px] py-0.5 px-2 rounded-full ${
                         activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                    }`}>
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
             <div className="p-12 text-center text-slate-500">Carregando fila...</div>
        ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pedido</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bairro</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5 font-bold text-slate-900 text-sm">
                                        {order.orderNumber}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col cursor-pointer group" onClick={() => openDetail(order)}>
                                            <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{order.customerName}</span>
                                            <span className="text-xs text-slate-500">{order.customerLocation}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm text-slate-700 font-medium">
                                            {getBairro(order.id)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                {getVendedor(order.id).charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{getVendedor(order.id)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {getStatusBadge(order.logisticsStatus)}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        {getActionBtn(order)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                                        <p className="text-sm">Nenhum pedido nesta etapa.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
      </div>

      {/* DETAIL MODAL (REUSABLE) */}
      <OrderDetailModal 
         isOpen={isDetailModalOpen}
         order={selectedOrder}
         onClose={() => { setIsDetailModalOpen(false); setSelectedOrder(null); }}
      />

      {/* LOAD MODAL */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900 text-lg">Selecionar Transporte</h3>
                    <p className="text-xs text-slate-500">Defina o motorista e veículo para a rota.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Motorista</label>
                        <select 
                            className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm"
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                        >
                            <option value="">Selecione um motorista...</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Veículo</label>
                        <select 
                            className="w-full px-4 py-2 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm"
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                        >
                            <option value="">Selecione um veículo...</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.model} - {v.plate} ({v.status})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end">
                    <button onClick={() => setIsLoadModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button 
                        onClick={confirmLoad}
                        disabled={!selectedDriverId || !selectedVehicleId}
                        className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FINISH MODAL */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900 text-lg">
                        {pendingStatus === LogisticsStatus.COMPLETED ? 'Confirmar Entrega' : 'Registrar Ocorrência'}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                        {pendingStatus === LogisticsStatus.COMPLETED 
                         ? 'Insira observações sobre a entrega (quem recebeu, condição, etc).' 
                         : 'Descreva o motivo da não entrega para registro.'}
                    </p>
                    <textarea 
                        className="w-full px-4 py-3 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm h-32 resize-none"
                        placeholder="Observações..."
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                    ></textarea>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end">
                    <button onClick={() => setIsFinishModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button 
                        onClick={confirmFinish}
                        className={`px-6 py-2 text-white font-bold text-sm rounded-lg ${pendingStatus === LogisticsStatus.COMPLETED ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};