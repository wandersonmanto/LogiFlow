import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, LogisticsStatus } from '../types';
import { useNavigate } from 'react-router-dom';

export const AssemblyList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      const data = await dbService.getOrders();
      // Filter only orders that require assembly AND are delivered (Completed)
      setOrders(data.filter(o => o.hasAssembly && o.logisticsStatus === LogisticsStatus.COMPLETED));
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const getAssemblyStatusBadge = (status?: string) => {
      const s = status || 'Pendente';
      switch(s) {
          case 'Concluído': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase">Concluído</span>;
          case 'Agendado': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase">Agendado</span>;
          case 'Atribuído': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 uppercase">Atribuído</span>;
          default: return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 uppercase">Pendente</span>;
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
            <span className="opacity-70">LogiFlow</span>
            <span>/</span>
            <span className="text-slate-900">Montagem</span>
           </nav>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Montagens</h2>
           <p className="text-slate-500 text-sm mt-1">Pedidos entregues aguardando montagem e conferência.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
             <div className="p-12 text-center text-slate-500">Carregando montagens...</div>
        ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Pedido</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Cliente</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Prazo Montagem</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Status</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.length > 0 ? (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5 font-bold text-slate-900 text-sm">{order.orderNumber}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-800">{order.customerName}</span>
                                            <span className="text-xs text-slate-400">{order.customerLocation}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-slate-600 font-mono">
                                        {order.assemblyDate || '-'}
                                    </td>
                                    <td className="px-6 py-5">
                                        {getAssemblyStatusBadge(order.assemblyStatus)}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={() => navigate(`/assembly/${order.id}`)}
                                            className="bg-white border border-slate-200 hover:border-primary hover:text-primary text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                                        >
                                            Gerenciar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    Nenhum pedido entregue aguardando montagem.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
      </div>
    </div>
  );
};