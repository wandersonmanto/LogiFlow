import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order } from '../types';
import * as XLSX from 'xlsx';

export const AssemblyManifest: React.FC = () => {
    const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAssembler, setFilterAssembler] = useState<string>('Todos');

    const assemblers = ['Ricardo Oliveira', 'João Silva', 'Marcos Santos', 'Felipe Costa']; // Could come from DB in future

    const fetchOrders = async () => {
        setLoading(true);
        const data = await dbService.getAssembliesByStatus('Atribuído');
        setAssignedOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = filterAssembler === 'Todos' 
        ? assignedOrders 
        : assignedOrders.filter(o => o.assembler === filterAssembler);

    // Group items by assembler for display if 'Todos' is selected, otherwise just list
    const ordersByAssembler = filteredOrders.reduce((acc, order) => {
        const assembler = order.assembler || 'Não Definido';
        if (!acc[assembler]) acc[assembler] = [];
        acc[assembler].push(order);
        return acc;
    }, {} as Record<string, Order[]>);

    const handleExport = () => {
        const dataToExport = filteredOrders.map(order => ({
            'Montador': order.assembler,
            'Pedido': order.orderNumber,
            'Cliente': order.customerName,
            'Endereço': `${order.address?.street}, ${order.address?.number} - ${order.address?.neighborhood}`,
            'Cidade': order.customerLocation,
            'Contato': order.phone || order.phoneOptional || 'N/A',
            'Itens': order.itemsList?.filter(i => i.toAssemble).map(i => `${i.quantity}x ${i.description}`).join('; '),
            'Valor Montagem': order.itemsList?.reduce((acc, i) => i.toAssemble ? acc + (i.assemblyValue * i.quantity) : acc, 0).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Romaneio");
        XLSX.writeFile(wb, `Romaneio_Montagem_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleReassign = async (orderId: string, currentAssembler: string) => {
        const newAssembler = prompt("Digite o nome do novo montador:", currentAssembler);
        if (newAssembler && newAssembler !== currentAssembler) {
            await dbService.updateAssemblyStatus(orderId, 'Atribuído', { assembler: newAssembler });
            fetchOrders();
        }
    };

    const handleCancelAssignment = async (orderId: string) => {
        if (window.confirm("Deseja cancelar a atribuição e voltar para Pendente?")) {
             await dbService.updateAssemblyStatus(orderId, 'Pendente', { assembler: '' }); // Clear assembler
             fetchOrders();
        }
    };

    return (
        <div className="space-y-6 pb-12">
             <div className="flex justify-between items-end">
                <div>
                    <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
                        <span className="opacity-70">LogiFlow</span>
                        <span>/</span>
                        <span className="text-slate-900">Montagem</span>
                    </nav>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Romaneio de Montagem</h2>
                    <p className="text-slate-500 text-sm mt-1">Gerencie e exporte as montagens atribuídas.</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={filterAssembler}
                        onChange={(e) => setFilterAssembler(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg text-sm px-4 py-2 font-medium focus:ring-primary focus:border-primary"
                    >
                        <option value="Todos">Todos os Montadores</option>
                        {assemblers.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    
                    <button 
                        onClick={handleExport}
                        disabled={filteredOrders.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">file_download</span>
                        Exportar Romaneio
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-500">Carregando romaneio...</div>
            ) : Object.keys(ordersByAssembler).length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment_late</span>
                    <p className="text-slate-500 font-medium">Nenhuma montagem atribuída encontrada.</p>
                    <p className="text-xs text-slate-400 mt-1">Vá para a Gestão de Montagens para atribuir pedidos.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(ordersByAssembler).map(([assembler, orders]) => (
                        <div key={assembler} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-600">person</span>
                                    {assembler}
                                </h3>
                                <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
                                    {orders.length} Pedidos
                                </span>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {orders.map(order => (
                                    <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-700">{order.orderNumber}</span>
                                                    <span className="text-sm font-bold text-slate-900">{order.customerName}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {order.address?.street}, {order.address?.number} - {order.address?.neighborhood}, {order.customerLocation}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[10px]">call</span>
                                                    {order.phone || order.phoneOptional || 'Sem telefone'}
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <button 
                                                    onClick={() => handleReassign(order.id, order.assembler || '')}
                                                    className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                                                >
                                                    Reatribuir
                                                </button>
                                                <button 
                                                    onClick={() => handleCancelAssignment(order.id)}
                                                    className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded p-3 text-xs border border-slate-100">
                                            <p className="font-bold text-slate-600 mb-1 uppercase text-[10px]">Itens para Montar:</p>
                                            <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                                {order.itemsList?.filter(i => i.toAssemble).map(item => (
                                                    <li key={item.id}>
                                                        <span className="font-bold">{item.quantity}x</span> {item.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
