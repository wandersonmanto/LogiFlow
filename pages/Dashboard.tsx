import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, KPI, OrderStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { OrderDetailModal } from '../components/OrderDetailModal';

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const data = await dbService.getOrders();
      setOrders(data);
    };
    fetchOrders();
  }, []);

  const openDetail = (order: Order) => {
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
  };

  const [kpis, setKpis] = useState<KPI[]>([
    { label: 'Total de Pedidos', value: '0', change: '0%', trend: 'neutral', icon: 'inventory_2', colorClass: 'text-primary bg-primary/10' },
    { label: 'Pedidos Abertos', value: '0', change: '0%', trend: 'neutral', icon: 'list_alt', colorClass: 'text-blue-600 bg-blue-100' },
    { label: 'Em Andamento', value: '0', change: '0%', trend: 'neutral', icon: 'pending_actions', colorClass: 'text-amber-600 bg-amber-100' },
    { label: 'Finalizados', value: '0', change: '0%', trend: 'neutral', icon: 'check_circle', colorClass: 'text-emerald-600 bg-emerald-100' },
    { label: 'Em Atraso', value: '0', change: '0%', trend: 'neutral', icon: 'warning', colorClass: 'text-red-600 bg-red-100' },
  ]);

  useEffect(() => {
    if (orders.length === 0) return;

    const total = orders.length;
    const open = orders.filter(o => o.status === OrderStatus.OPEN).length;
    const inProgress = orders.filter(o => o.status === OrderStatus.IN_PROGRESS || o.status === OrderStatus.READY_TO_PICK).length;
    const completed = orders.filter(o => o.status === OrderStatus.COMPLETED).length;
    const delayed = orders.filter(o => o.status === OrderStatus.DELAYED).length;

    // Time-based stats (Current Month vs Last Month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const currentMonthOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const lastMonthOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    const calculateTrend = (current: number, previous: number): { change: string, trend: 'up' | 'down' | 'neutral' } => {
        if (previous === 0) return { change: current > 0 ? '+100%' : '0%', trend: 'neutral' };
        const percent = ((current - previous) / previous) * 100;
        return {
            change: `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`,
            trend: percent > 0 ? 'up' : (percent < 0 ? 'down' : 'neutral')
        };
    };

    const totalTrend = calculateTrend(currentMonthOrders, lastMonthOrders);

    setKpis([
        { label: 'Total de Pedidos', value: total.toString(), change: totalTrend.change, trend: totalTrend.trend, icon: 'inventory_2', colorClass: 'text-primary bg-primary/10' },
        { label: 'Pedidos Abertos', value: open.toString(), change: 'Atual', trend: 'neutral', icon: 'list_alt', colorClass: 'text-blue-600 bg-blue-100' },
        { label: 'Em Andamento', value: inProgress.toString(), change: 'Atual', trend: 'neutral', icon: 'pending_actions', colorClass: 'text-amber-600 bg-amber-100' },
        { label: 'Finalizados', value: completed.toString(), change: 'Total', trend: 'up', icon: 'check_circle', colorClass: 'text-emerald-600 bg-emerald-100' },
        { label: 'Em Atraso', value: delayed.toString(), change: 'Atenção', trend: delayed > 0 ? 'down' : 'neutral', icon: 'warning', colorClass: 'text-red-600 bg-red-100' },
    ]);

  }, [orders]);

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.OPEN: return 'bg-blue-100 text-blue-700';
      case OrderStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700';
      case OrderStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700';
      case OrderStatus.DELAYED: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Operacional</h2>
          <p className="text-slate-500 text-sm mt-1">Visão geral em tempo real das entregas e montagens.</p>
        </div>
        <button 
            onClick={() => navigate('/new-order')}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Pedido
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`size-10 rounded-lg flex items-center justify-center ${kpi.colorClass}`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${kpi.trend === 'down' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                {kpi.change}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{kpi.label}</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Pedidos Recentes</h3>
          <button onClick={() => navigate('/orders')} className="text-primary text-sm font-semibold hover:underline">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Pedido #</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-primary">{order.orderNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col cursor-pointer" onClick={() => openDetail(order)}>
                        <span className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">{order.customerName}</span>
                        <span className="text-xs text-slate-500">{order.customerLocation}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="material-symbols-outlined text-lg">
                            {order.type === 'Loja' ? 'store' : 'language'}
                        </span>
                        <span className="text-sm font-medium">{order.type}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openDetail(order)} className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailModal 
         isOpen={isDetailModalOpen}
         order={selectedOrder}
         onClose={() => { setIsDetailModalOpen(false); setSelectedOrder(null); }}
      />
    </div>
  );
};