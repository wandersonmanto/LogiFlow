import React, { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/db';
import { Order, OrderStatus, OrderType, LogisticsStatus, DeliveryType } from '../types';
import { useNavigate } from 'react-router-dom';
import { OrderDetailModal } from '../components/OrderDetailModal';

export const Drafts: React.FC = () => {
  const [drafts, setDrafts] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch Logic
  const fetchDrafts = async () => {
    setLoading(true);
    const data = await dbService.getOrders();
    setDrafts(data.filter(o => o.status === OrderStatus.DRAFT));
    setLoading(false);
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleRecover = (order: Order) => {
      navigate('/new-order', { state: { draftOrder: order } });
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Tem certeza que deseja excluir este rascunho permanentemente?')) {
          await dbService.deleteOrder(id);
          fetchDrafts();
      }
  };

  const openDetail = (order: Order) => {
      setSelectedOrder(order);
      setIsDetailModalOpen(true);
  };

  // --- CSV IMPORT LOGIC ---

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const parseCSVLine = (text: string, separator: string) => {
    // Parser that handles quoted fields and dynamic separator
    const result = [];
    let cell = '';
    let quote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            quote = !quote;
        } else if (char === separator && !quote) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const reader = new FileReader();

      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) return;

          const lines = text.split(/\r\n|\n/);
          if (lines.length < 2) {
              alert('Arquivo vazio ou formato inválido.');
              setImporting(false);
              return;
          }

          // Auto-detect separator based on the header line
          const headerLine = lines[0];
          const separator = headerLine.includes(';') ? ';' : ',';

          // Headers mapping
          const headers = parseCSVLine(headerLine, separator);
          const getIdx = (name: string) => headers.findIndex(h => h.trim().toLowerCase().replace(/"/g, '') === name.toLowerCase());

          // Required Column Indices
          const colMap = {
             orderNumber: getIdx('Número do Pedido'),
             coupon: getIdx('Cupom de Desconto'),
             date: getIdx('Data'),
             customerName: getIdx('Nome do comprador'),
             cpf: getIdx('CPF / CNPJ'),
             phone: getIdx('Telefone para a entrega'),
             cep: getIdx('Código postal'),
             state: getIdx('Estado'),
             city: getIdx('Cidade'),
             neighborhood: getIdx('Bairro'),
             street: getIdx('Endereço'),
             number: getIdx('Número'),
             buyerNotes: getIdx('Anotações do Comprador'),
             sellerNotes: getIdx('Anotações do Vendedor'),
             paymentStatus: getIdx('Status do Pagamento')
          };

          // Check required columns (Payment status is crucial for filtering)
          if (colMap.paymentStatus === -1 || colMap.orderNumber === -1) {
              alert(`Colunas obrigatórias não encontradas.\nEsperado: "Número do Pedido" e "Status do Pagamento".\nDetectado separador: "${separator}"`);
              setImporting(false);
              return;
          }

          const existingOrders = await dbService.getOrders();
          const existingOrderNumbers = new Set(existingOrders.map(o => o.orderNumber));
          const newOrders: any[] = [];
          let skippedCount = 0;
          let duplicateCount = 0;

          // Process rows
          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const row = parseCSVLine(lines[i], separator);

              // 1. Filter: Payment Status must be "Confirmado"
              const paymentStatus = row[colMap.paymentStatus]?.replace(/"/g, '');
              if (paymentStatus !== 'Confirmado') {
                  skippedCount++;
                  continue;
              }

              // 2. Duplicate Check
              const orderNum = row[colMap.orderNumber]?.replace(/"/g, '');
              if (!orderNum || existingOrderNumbers.has(orderNum)) {
                  duplicateCount++;
                  continue;
              }

              // 3. Mapping
              // Formatting Date: Assuming format DD/MM/YYYY from CSV -> YYYY-MM-DD for System
              let saleDate = row[colMap.date]?.replace(/"/g, '') || '';
              if (saleDate.includes('/')) {
                 const parts = saleDate.split('/');
                 // Handle DD/MM/YYYY
                 if (parts.length === 3) {
                    const [day, month, year] = parts;
                    // Basic check to ensure year is the 4-digit part
                    if (year.length === 4) {
                        saleDate = `${year}-${month}-${day}`;
                    }
                 }
              }

              // Concatenate observations
              const obs1 = row[colMap.buyerNotes]?.replace(/"/g, '') || '';
              const obs2 = row[colMap.sellerNotes]?.replace(/"/g, '') || '';
              const fullObs = [obs1, obs2].filter(Boolean).join(' | ');

              const draftOrder = {
                  orderNumber: orderNum,
                  customerName: row[colMap.customerName]?.replace(/"/g, '') || 'Cliente Importado',
                  salesperson: row[colMap.coupon]?.replace(/"/g, '') || '', // "Cupom de Desconto" = Vendedor
                  date: saleDate || new Date().toISOString().split('T')[0],
                  status: OrderStatus.DRAFT,
                  logisticsStatus: LogisticsStatus.REGISTERED,
                  type: OrderType.ECOMMERCE, // Always E-commerce
                  items: 0, // CSV doesn't seem to have items details in this flat structure, defaulting to 0
                  itemsList: [],
                  deliveryType: DeliveryType.COMPLETE,
                  isFutureDelivery: false,
                  hasAssembly: false,
                  
                  // Draft Specific Data
                  draftStep: 2, // Set to step 2 so user reviews customer data
                  cpf: row[colMap.cpf]?.replace(/"/g, '') || '',
                  phone: row[colMap.phone]?.replace(/"/g, '') || '',
                  address: {
                      cep: row[colMap.cep]?.replace(/"/g, '') || '',
                      state: row[colMap.state]?.replace(/"/g, '') || '',
                      city: row[colMap.city]?.replace(/"/g, '') || '',
                      neighborhood: row[colMap.neighborhood]?.replace(/"/g, '') || '',
                      street: row[colMap.street]?.replace(/"/g, '') || '',
                      number: row[colMap.number]?.replace(/"/g, '') || '',
                      observation: fullObs
                  }
              };

              newOrders.push(draftOrder);
              existingOrderNumbers.add(orderNum); // Add to set to prevent duplicates within the same file
          }

          if (newOrders.length > 0) {
              await dbService.createOrdersBulk(newOrders);
              alert(`Importação Concluída!\n\n${newOrders.length} rascunhos criados.\n${duplicateCount} duplicados ignorados.\n${skippedCount} ignorados por status de pagamento.`);
              fetchDrafts();
          } else {
              alert(`Nenhum pedido importado.\n${duplicateCount} duplicados.\n${skippedCount} status inválido ou ignorado.`);
          }
          setImporting(false);
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
            <span className="opacity-70">LogiFlow</span>
            <span>/</span>
            <span className="text-slate-900">Rascunhos</span>
           </nav>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rascunhos de Pedidos</h2>
           <p className="text-slate-500 text-sm mt-1">Gerencie e finalize pedidos iniciados anteriormente.</p>
        </div>
        <div className="flex gap-2">
             {/* Hidden File Input */}
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
             />
             
             <button 
                onClick={handleImportClick}
                disabled={importing}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
             >
                {importing ? (
                    <span className="size-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                )}
                Importar CSV
             </button>

             <button 
                onClick={() => navigate('/new-order')}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-sm">add</span>
                Novo Pedido
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
             <div className="p-12 text-center text-slate-500">Carregando rascunhos...</div>
        ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Pedido Provisório</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Cliente</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Vendedor / Cupom</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Data Criação</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500">Etapa Salva</th>
                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {drafts.length > 0 ? (
                            drafts.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5 font-bold text-slate-700 text-sm">{order.orderNumber}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-800">{order.customerName || 'Não Informado'}</span>
                                            {order.type === OrderType.ECOMMERCE && (
                                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1 rounded w-fit mt-1">E-COMMERCE</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{order.salesperson || '-'}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{order.date}</td>
                                    <td className="px-6 py-5">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                                            Passo {order.draftStep || 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => openDetail(order)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <span className="material-symbols-outlined">visibility</span>
                                            </button>
                                            <button 
                                                onClick={() => handleRecover(order)}
                                                className="text-slate-400 hover:text-primary transition-colors"
                                                title="Recuperar / Editar"
                                            >
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(order.id)}
                                                className="text-slate-400 hover:text-red-600 transition-colors"
                                                title="Excluir Permanentemente"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    Nenhum rascunho encontrado.
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