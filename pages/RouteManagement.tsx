import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, LogisticsStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { OrderDetailModal } from '../components/OrderDetailModal';

export const RouteManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Constants for calculating delay (Simulation using today as 2023-10-25 based on mocks)
  const TODAY = new Date('2023-10-25');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await dbService.getOrders();
      // Filter for orders that are ready to route or active (Registered, Separated, Loaded)
      // Excluding completed or cancelled for active routing view
      const activeRoutingOrders = data.filter(o => 
          o.logisticsStatus !== LogisticsStatus.COMPLETED && 
          o.logisticsStatus !== LogisticsStatus.NOT_DELIVERED
      );
      setOrders(activeRoutingOrders);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const openDetail = (order: Order) => {
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
  };

  // Helper: Group orders by City
  const groupedByCity = orders.reduce((acc, order) => {
      const city = order.customerLocation || 'Não definido';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
  }, {} as Record<string, Order[]>);

  // Helper: Calculate Delay Level
  const getDelayStatus = (deliveryDate?: string) => {
      if (!deliveryDate) return 'normal';
      const dDate = new Date(deliveryDate);
      const diffTime = TODAY.getTime() - dDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 3) return 'critical'; // > 3 days late
      if (diffDays > 0) return 'alert';    // Late but < 3 days
      return 'normal'; // On time or future
  };

  const getDelayBadge = (status: string) => {
      switch (status) {
          case 'critical':
              return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">priority_high</span>Crítico (+3 dias)</span>;
          case 'alert':
              return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">warning</span>Atrasado</span>;
          default:
              return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">No Prazo</span>;
      }
  };

  // KPI Calculations
  const totalOrders = orders.length;
  const criticalOrders = orders.filter(o => getDelayStatus(o.deliveryDate) === 'critical').length;
  const alertOrders = orders.filter(o => getDelayStatus(o.deliveryDate) === 'alert').length;
  // Estimate: 1 vehicle per 5 orders (mock logic)
  const vehiclesNeeded = Math.ceil(totalOrders / 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
            <span className="opacity-70">LogiFlow</span>
            <span>/</span>
            <span className="text-slate-900">Rotas</span>
           </nav>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Rotas</h2>
           <p className="text-slate-500 text-sm mt-1">Planejamento e agrupamento inteligente de entregas.</p>
        </div>
        
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                <span className="material-symbols-outlined text-lg">map</span>
                Ver no Mapa
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all">
                <span className="material-symbols-outlined text-lg">alt_route</span>
                Otimizar Rotas
            </button>
        </div>
      </div>

      {/* Control Panel / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Entregas Pendentes</p>
                  <p className="text-2xl font-black text-slate-900">{totalOrders}</p>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">notification_important</span>
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Atraso Crítico</p>
                  <p className="text-2xl font-black text-slate-900">{criticalOrders}</p>
              </div>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Em Alerta</p>
                  <p className="text-2xl font-black text-slate-900">{alertOrders}</p>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">commute</span>
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Veículos Estimados</p>
                  <p className="text-2xl font-black text-slate-900">{vehiclesNeeded}</p>
              </div>
          </div>
      </div>

      {/* Grouped Lists */}
      <div className="space-y-6">
          {loading ? (
               <div className="text-center p-12 text-slate-500">Carregando rotas...</div>
          ) : Object.keys(groupedByCity).length > 0 ? (
              (Object.entries(groupedByCity) as [string, Order[]][]).map(([city, cityOrders]) => (
                  <div key={city} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fadeIn">
                      {/* City Header */}
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate-400">location_city</span>
                              <h3 className="font-bold text-slate-800 text-lg">{city}</h3>
                              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-600">
                                  {cityOrders.length} pedidos
                              </span>
                          </div>
                          <div className="flex gap-2">
                             <button className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">print</span> Imprimir Romaneio
                             </button>
                          </div>
                      </div>

                      {/* Orders List */}
                      <div className="divide-y divide-slate-100">
                          {cityOrders.map(order => {
                              const delayStatus = getDelayStatus(order.deliveryDate);
                              return (
                                  <div key={order.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      {/* Left Info */}
                                      <div className="flex items-start gap-4 flex-1">
                                          <div className={`mt-1 size-2 rounded-full shrink-0 ${delayStatus === 'critical' ? 'bg-red-500' : delayStatus === 'alert' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                          <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-bold text-slate-900">{order.orderNumber}</span>
                                                  {getDelayBadge(delayStatus)}
                                              </div>
                                              <p className="text-sm font-semibold text-slate-700">{order.neighborhood || 'Bairro N/D'}</p>
                                              <div className="cursor-pointer group" onClick={() => openDetail(order)}>
                                                  <p className="text-xs text-slate-500 group-hover:text-primary font-bold">{order.customerName}</p>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Middle Info */}
                                      <div className="flex-1 grid grid-cols-2 gap-4">
                                          <div>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase">Previsão</p>
                                              <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                                  <span className="material-symbols-outlined text-sm text-slate-400">calendar_today</span>
                                                  {order.deliveryDate || '-'}
                                              </p>
                                          </div>
                                          <div>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase">Itens</p>
                                              <p className="text-sm font-medium text-slate-700">{order.items} un.</p>
                                          </div>
                                      </div>

                                      {/* Actions */}
                                      <div>
                                          <button onClick={() => openDetail(order)} className="size-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all">
                                              <span className="material-symbols-outlined text-lg">chevron_right</span>
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))
          ) : (
              <div className="text-center p-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">route</span>
                  <p>Não há pedidos pendentes para roteirização no momento.</p>
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