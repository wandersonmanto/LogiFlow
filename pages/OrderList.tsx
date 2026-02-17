import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, OrderStatus, OrderType } from '../types';
import { OrderDetailModal } from '../components/OrderDetailModal';

export const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const data = await dbService.getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const openDetail = (order: Order) => {
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
  };

  // Filtering Logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    
    // OrderType enum values are 'Loja' and 'Site'
    const matchesType = typeFilter ? order.type === typeFilter : true;

    return matchesSearch && matchesStatus && matchesType;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.OPEN:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-600 uppercase">Aberto</span>;
      case OrderStatus.IN_PROGRESS:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-600 uppercase">Em Andamento</span>;
      case OrderStatus.COMPLETED:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/20 text-primary uppercase">Concluído</span>;
      case OrderStatus.DELAYED:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-600 uppercase">Em Atraso</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
            <span className="opacity-70">Dashboard</span>
            <span>/</span>
            <span className="text-slate-900">Fila de Pedidos</span>
           </nav>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fila de Pedidos</h2>
           <p className="text-slate-500 text-sm mt-1">Monitoramento em tempo real de todas as vendas e status logísticos.</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <span className="material-symbols-outlined text-lg">download</span>
                Exportar
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Filtros Avançados</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Pesquisa Geral</label>
                <input 
                    type="text" 
                    placeholder="Nº Pedido ou Nome" 
                    className="text-sm border-slate-200 rounded-lg focus:ring-primary focus:border-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Status</label>
                <select 
                    className="text-sm border-slate-200 rounded-lg focus:ring-primary focus:border-primary"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Todos os Status</option>
                    <option value={OrderStatus.OPEN}>Aberto</option>
                    <option value={OrderStatus.IN_PROGRESS}>Em Andamento</option>
                    <option value={OrderStatus.READY_TO_PICK}>A Separar</option>
                    <option value={OrderStatus.DELAYED}>Em Atraso</option>
                    <option value={OrderStatus.COMPLETED}>Concluído</option>
                </select>
            </div>

            {/* NEW: Channel/Type Filter */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Canal de Venda</label>
                <select 
                    className="text-sm border-slate-200 rounded-lg focus:ring-primary focus:border-primary"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">Todos os Canais</option>
                    <option value={OrderType.STORE}>Loja Física</option>
                    <option value={OrderType.ECOMMERCE}>E-commerce (Site)</option>
                </select>
            </div>

            {/* Date Filter (Mock) */}
             <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Período</label>
                <input type="date" className="text-sm border-slate-200 rounded-lg focus:ring-primary focus:border-primary" />
            </div>

            {/* Action Button */}
            <div className="flex items-end lg:col-span-1">
                 <button 
                    onClick={clearFilters}
                    className="w-full bg-slate-100 text-slate-600 hover:text-red-600 font-bold py-2 rounded-lg hover:bg-red-50 transition-colors text-sm border border-slate-200"
                 >
                    Limpar Filtros
                 </button>
            </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
             <div className="p-12 text-center text-slate-500">Carregando pedidos...</div>
        ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">ID Pedido</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Cliente</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Data Pedido</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Entrega Prevista</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Status</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Canal</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-primary text-sm">{order.orderNumber}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col cursor-pointer group" onClick={() => openDetail(order)}>
                                            <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">{order.customerName}</span>
                                            <span className="text-[11px] text-slate-400">{order.customerLocation}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{order.date}</td>
                                    <td className={`px-6 py-4 text-sm font-medium ${order.status === OrderStatus.DELAYED ? 'text-red-500' : 'text-slate-600'}`}>
                                        {order.deliveryDate || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <span className="material-symbols-outlined text-lg">{order.type === 'Loja' ? 'storefront' : 'language'}</span>
                                            <span className="text-xs font-medium">{order.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => openDetail(order)}
                                            className="text-xs font-bold text-primary hover:underline"
                                        >
                                            Ver Detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    Nenhum pedido encontrado com os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
      </div>

      <OrderDetailModal 
         isOpen={isDetailModalOpen}
         order={selectedOrder}
         onClose={() => { setIsDetailModalOpen(false); setSelectedOrder(null); }}
      />
    </div>
  );
};