import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Order, OrderItem } from '../types';

export const AssemblyDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedAssembler, setSelectedAssembler] = useState('');
  const [bonusValue, setBonusValue] = useState(0);
  const [bonusDesc, setBonusDesc] = useState('');
  
  const assemblers = ['Ricardo Oliveira', 'João Silva', 'Marcos Santos', 'Felipe Costa'];

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      const data = await dbService.getOrderById(id);
      if (data) {
          setOrder(data);
          // Initialize state if data exists
          if (data.assembler) setSelectedAssembler(data.assembler);
          if (data.assemblyBonus) setBonusValue(data.assemblyBonus);
          if (data.assemblyBonusDescription) setBonusDesc(data.assemblyBonusDescription);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  const handleFinish = async () => {
      if (!order) return;
      await dbService.updateAssemblyData(order.id, {
          assembler: selectedAssembler,
          bonus: bonusValue,
          bonusDesc: bonusDesc
      });
      navigate('/assembly');
  };

  if (loading) return <div className="p-8 text-center">Carregando detalhes...</div>;
  if (!order) return <div className="p-8 text-center text-red-500">Pedido não encontrado.</div>;

  const assemblyItems = order.itemsList?.filter(i => i.toAssemble) || [];
  const subTotal = assemblyItems.reduce((acc, item) => acc + (item.assemblyValue * item.quantity), 0);
  const total = subTotal + Number(bonusValue);

  return (
    <div className="max-w-6xl mx-auto pb-12">
       {/* Breadcrumb & Header */}
       <div className="mb-8">
            <nav className="flex text-xs font-medium text-slate-500 gap-2 mb-3">
                <span onClick={() => navigate('/assembly')} className="cursor-pointer hover:text-primary">Gestão de Montagens</span>
                <span>/</span>
                <span className="text-slate-900 font-bold">Pedido {order.orderNumber}</span>
            </nav>
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Montagem</h1>
                    <p className="text-slate-500 text-sm mt-1">Pedido: <span className="font-mono font-bold text-slate-700">{order.orderNumber}</span> — Cliente: <span className="font-bold text-slate-700">{order.customerName}</span></p>
                </div>
                <button 
                    onClick={() => navigate('/assembly')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Voltar para Lista
                </button>
            </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Products List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-slate-800 text-lg">
                        <span className="material-symbols-outlined text-primary">inventory_2</span>
                        Produtos para Montagem
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{assemblyItems.length} ITENS ENCONTRADOS</span>
                </div>

                <div className="space-y-4">
                    {assemblyItems.map((item) => (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 shadow-sm">
                            {/* Product Image Placeholder */}
                            <div className="size-24 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-4xl text-slate-300">chair</span>
                            </div>
                            
                            {/* Details */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900 text-lg leading-tight">{item.description}</h4>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full">
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-mono mb-3">
                                    SKU: {item.sku} • <span className="text-slate-600 font-bold">Qtd: {item.quantity}</span>
                                </p>
                                <p className="text-sm font-bold text-primary">R$ {item.assemblyValue.toFixed(2)}</p>
                            </div>

                            {/* Per Item Note (Static for layout fidelity based on prompt visual) */}
                             <div className="w-full md:w-1/3 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 flex flex-col justify-center">
                                <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Observações do Item</p>
                                <div className="h-20 bg-slate-50 rounded-lg border border-slate-100 p-2 text-xs text-slate-500 italic">
                                    Nenhuma observação registrada para este item.
                                </div>
                             </div>
                        </div>
                    ))}
                    {assemblyItems.length === 0 && (
                        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            Nenhum item marcado para montagem neste pedido.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Finance & Actions */}
            <div className="space-y-6">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 text-lg">
                    <span className="material-symbols-outlined text-primary">payments</span>
                    Resumo Financeiro
                </h3>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                    {/* Status Display */}
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Status Atual</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            order.assemblyStatus === 'Concluído' ? 'bg-emerald-100 text-emerald-700' :
                            order.assemblyStatus === 'Atribuído' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                            {order.assemblyStatus || 'Pendente'}
                        </span>
                    </div>

                    {/* Logic for PENDING state (Assign) */}
                    {(!order.assemblyStatus || order.assemblyStatus === 'Pendente' || order.assemblyStatus === 'Agendado') && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Atribuir Montador</label>
                                <div className="relative">
                                     <select 
                                        value={selectedAssembler}
                                        onChange={(e) => setSelectedAssembler(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 pr-8 font-medium"
                                     >
                                        <option value="">Selecionar Montador</option>
                                        {assemblers.map(a => <option key={a} value={a}>{a}</option>)}
                                     </select>
                                     <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <button 
                                onClick={async () => {
                                    if (!selectedAssembler) return alert('Selecione um montador');
                                    await dbService.updateAssemblyStatus(order.id, 'Atribuído', { assembler: selectedAssembler });
                                    setOrder({ ...order, assemblyStatus: 'Atribuído', assembler: selectedAssembler }); // Optimistic update
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                Atribuir Montador
                            </button>
                        </>
                    )}

                    {/* Logic for ASSIGNED state (Complete) */}
                    {order.assemblyStatus === 'Atribuído' && (
                        <>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-2">
                                <p className="text-xs text-purple-800 font-bold mb-1">Montador Responsável</p>
                                <p className="text-sm font-medium text-purple-900">{order.assembler}</p>
                            </div>

                            <div className="h-px bg-slate-100"></div>

                            {/* Subtotal */}
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm font-medium">Subtotal de Montagem</span>
                                <span className="text-slate-900 font-bold">R$ {subTotal.toFixed(2)}</span>
                            </div>

                            {/* Bonus Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bônus (R$)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={bonusValue}
                                    onChange={(e) => setBonusValue(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-900 focus:ring-primary focus:border-primary"
                                />
                            </div>
                            
                            {/* Bonus Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição do Bônus</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: Agilidade na entrega"
                                    value={bonusDesc}
                                    onChange={(e) => setBonusDesc(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:ring-primary focus:border-primary"
                                />
                            </div>

                            {/* Total */}
                            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total da Montagem</p>
                                <p className="text-3xl font-black text-emerald-600">R$ {total.toFixed(2)}</p>
                            </div>

                            {/* Action */}
                            <button 
                                onClick={async () => {
                                    await dbService.updateAssemblyStatus(order.id, 'Concluído', { bonus: bonusValue, bonusDesc: bonusDesc });
                                    navigate('/assembly');
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Finalizar e Enviar para Pagamento
                            </button>
                        </>
                    )}

                    {/* Logic for COMPLETED state (View Only) */}
                    {order.assemblyStatus === 'Concluído' && (
                        <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">task_alt</span>
                            <p className="font-bold text-slate-900">Montagem Concluída</p>
                            <p className="text-sm text-slate-500 mt-1">
                                Realizada por {order.assembler}<br/>
                                Total Pago: R$ {(order.assemblyBonus || 0) + subTotal}
                            </p>
                        </div>
                    )}
                </div>
            </div>
       </div>
    </div>
  );
};