import React from 'react';
import { Order, LogisticsStatus } from '../types';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  // Helper to map current status to an index for the stepper
  const getStatusIndex = (status: LogisticsStatus) => {
      const flow = [
          LogisticsStatus.REGISTERED,
          LogisticsStatus.SEPARATED,
          LogisticsStatus.LOADED,
          LogisticsStatus.IN_TRANSIT,
          LogisticsStatus.COMPLETED
      ];
      const idx = flow.indexOf(status);
      if (idx === -1) {
          if (status === LogisticsStatus.NOT_DELIVERED || status === LogisticsStatus.ADDRESS_NOT_FOUND) return 3; // Stops at In Transit basically
          return 0;
      }
      return idx;
  };

  const currentStep = getStatusIndex(order.logisticsStatus);

  const steps = [
      { label: 'Registrado', icon: 'assignment' },
      { label: 'Separado', icon: 'inventory_2' },
      { label: 'Carregado', icon: 'local_shipping' },
      { label: 'Em Rota', icon: 'move_to_inbox' },
      { label: 'Concluído', icon: 'check_circle' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                  <h3 className="text-xl font-bold">Detalhes do Pedido</h3>
                  <p className="text-slate-400 text-sm">#{order.orderNumber} - {order.date}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Timeline */}
              <div className="relative">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-10"></div>
                  <div className="flex justify-between">
                      {steps.map((step, index) => {
                          const isCompleted = index <= currentStep;
                          const isCurrent = index === currentStep;
                          const isError = (order.logisticsStatus === LogisticsStatus.NOT_DELIVERED || order.logisticsStatus === LogisticsStatus.ADDRESS_NOT_FOUND) && index === 4;
                          
                          return (
                              <div key={index} className="flex flex-col items-center bg-white px-2">
                                  <div className={`size-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all
                                      ${isError ? 'bg-red-50 border-red-500 text-red-500' : 
                                        isCompleted ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                                      <span className="material-symbols-outlined text-lg">{isError ? 'warning' : step.icon}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase ${isCompleted ? 'text-slate-900' : 'text-slate-300'}`}>
                                      {isError ? 'Falha na Entrega' : step.label}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Informações do Cliente</h4>
                      <div className="space-y-3">
                          <div className="flex items-start gap-3">
                              <span className="material-symbols-outlined text-slate-400">person</span>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-bold">Nome</p>
                                  <p className="text-sm font-medium text-slate-900">{order.customerName}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <span className="material-symbols-outlined text-slate-400">location_on</span>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-bold">Endereço</p>
                                  <p className="text-sm font-medium text-slate-900">{order.customerLocation}</p>
                                  {order.neighborhood && <p className="text-xs text-slate-500">{order.neighborhood}</p>}
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-bold">Previsão de Entrega</p>
                                  <p className="text-sm font-medium text-slate-900">{order.deliveryDate || 'Não definido'}</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Dados Operacionais</h4>
                      <div className="space-y-3">
                           <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Tipo</p>
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{order.type}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Entrega</p>
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{order.deliveryType}</span>
                                </div>
                           </div>
                           
                           {/* Fleet Info if Available */}
                           {(order.driverName || order.vehiclePlate) && (
                               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                                   <div className="flex items-center gap-2 mb-2">
                                       <span className="material-symbols-outlined text-blue-600">local_shipping</span>
                                       <span className="text-xs font-bold text-blue-800 uppercase">Dados da Rota Atual</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2 text-xs">
                                       <div>
                                           <span className="text-blue-500 block">Motorista</span>
                                           <span className="font-bold text-blue-900">{order.driverName || '-'}</span>
                                       </div>
                                       <div>
                                           <span className="text-blue-500 block">Veículo</span>
                                           <span className="font-bold text-blue-900 uppercase">{order.vehiclePlate || '-'}</span>
                                       </div>
                                   </div>
                               </div>
                           )}

                           {/* Observation if Available */}
                           {order.deliveryObservation && (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                    <p className="text-xs font-bold text-amber-800 uppercase mb-1">Observação Atual</p>
                                    <p className="text-xs text-amber-700 italic">"{order.deliveryObservation}"</p>
                                </div>
                           )}
                      </div>
                  </div>
              </div>
              
              {/* DELIVERY HISTORY SECTION */}
              {order.deliveryHistory && order.deliveryHistory.length > 0 && (
                  <div>
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400">history</span>
                          Histórico de Tentativas
                      </h4>
                      <div className="space-y-3">
                          {order.deliveryHistory.map((attempt, idx) => (
                              <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${attempt.status === LogisticsStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                              {attempt.status}
                                          </span>
                                          <span className="text-xs text-slate-400">{attempt.timestamp}</span>
                                      </div>
                                      <div className="text-right">
                                           <p className="text-[10px] font-bold text-slate-700">{attempt.driverName || 'Motorista N/A'}</p>
                                           <p className="text-[10px] text-slate-500">{attempt.vehiclePlate || 'Veículo N/A'}</p>
                                      </div>
                                  </div>
                                  {attempt.observation && (
                                      <div className="bg-white p-2 rounded border border-slate-100 text-xs italic text-slate-600">
                                          "{attempt.observation}"
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Items List */}
              <div>
                   <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Itens do Pedido ({order.items})</h4>
                   <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                       <table className="w-full text-left">
                           <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                               <tr>
                                   <th className="px-4 py-2">Produto</th>
                                   <th className="px-4 py-2 text-center">Qtd</th>
                                   <th className="px-4 py-2 text-right">Montagem</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                               {order.itemsList && order.itemsList.length > 0 ? (
                                   order.itemsList.map((item, idx) => (
                                       <tr key={idx}>
                                           <td className="px-4 py-3">
                                               <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                               <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                                           </td>
                                           <td className="px-4 py-3 text-center text-sm font-medium">{item.quantity}</td>
                                           <td className="px-4 py-3 text-right">
                                               {item.toAssemble ? (
                                                   <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">SIM</span>
                                               ) : (
                                                   <span className="text-[10px] font-bold text-slate-400">NÃO</span>
                                               )}
                                           </td>
                                       </tr>
                                   ))
                               ) : (
                                   <tr>
                                       <td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-sm">
                                           Detalhes dos itens não disponíveis neste mock.
                                       </td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
              </div>
          </div>
          
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end shrink-0">
               <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                   Fechar
               </button>
          </div>
       </div>
    </div>
  );
};