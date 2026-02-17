import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { dbService } from '../services/db';
import { Product, OrderItem, DeliveryType, LogisticsStatus, OrderStatus, OrderType, Order } from '../types';

export const NewOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- FORM DATA STATES ---
  // Step 1: Order Data
  const [orderNumber, setOrderNumber] = useState('');
  const [orderType, setOrderType] = useState<OrderType>(OrderType.STORE);
  const [customerName, setCustomerName] = useState('');
  const [salesperson, setSalesperson] = useState('');
  
  // Extra fields for draft/detailed saving
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneOptional, setPhoneOptional] = useState('');
  const [address, setAddress] = useState({ cep: '', state: '', city: '', neighborhood: '', street: '', number: '', observation: '' });
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [couponNumber, setCouponNumber] = useState('');
  const [saleDate, setSaleDate] = useState('');

  // Step 3: Product Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Step 4: Delivery & Assembly State
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DeliveryType.COMPLETE);
  const [isFutureDelivery, setIsFutureDelivery] = useState(false);
  const [futureDeliveryDate, setFutureDeliveryDate] = useState('');
  const [hasAssembly, setHasAssembly] = useState(false);
  const [assemblyDate, setAssemblyDate] = useState('');

  // --- DRAFT RECOVERY LOGIC ---
  useEffect(() => {
    if (location.state && location.state.draftOrder) {
        const draft: Order = location.state.draftOrder;
        setEditingId(draft.id);
        
        // Restore state
        setOrderNumber(draft.orderNumber);
        setCustomerName(draft.customerName);
        setOrderType(draft.type);
        if (draft.itemsList) setSelectedItems(draft.itemsList);
        
        // Restore complex objects if they exist in draft (Requires types update to store these, assuming they are added to Order interface)
        if (draft.salesperson) setSalesperson(draft.salesperson);
        if (draft.cpf) setCpf(draft.cpf);
        if (draft.phone) setPhone(draft.phone);
        if (draft.phoneOptional) setPhoneOptional(draft.phoneOptional);
        if (draft.address) setAddress(draft.address);
        if (draft.invoiceNumber) setInvoiceNumber(draft.invoiceNumber);
        if (draft.couponNumber) setCouponNumber(draft.couponNumber);
        if (draft.date) setSaleDate(draft.date);
        
        // Step 4 stuff
        setDeliveryType(draft.deliveryType);
        setIsFutureDelivery(draft.isFutureDelivery);
        if (draft.futureDeliveryDate) setFutureDeliveryDate(draft.futureDeliveryDate);
        setHasAssembly(draft.hasAssembly);
        if (draft.assemblyDate) setAssemblyDate(draft.assemblyDate);

        // Go to saved step if available, else 1
        if (draft.draftStep) setStep(draft.draftStep);
    }
  }, [location.state]);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // --- LOGIC: PRODUCTS ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const results = await dbService.searchProducts(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const addProductToOrder = (product: Product) => {
    setSelectedItems(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
            return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        // Initialize with delivery true and assemble true if it has value
        return [...prev, { 
            ...product, 
            quantity: 1, 
            toDeliver: true, 
            toAssemble: product.assemblyValue > 0 
        }];
    });
    setSearchQuery(''); 
    setSearchResults([]);
  };

  const removeProduct = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedItems(prev => prev.map(item => {
        if (item.id === id) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
        }
        return item;
    }));
  };

  const toggleItemDelivery = (id: string) => {
    setSelectedItems(prev => prev.map(item => 
        item.id === id ? { ...item, toDeliver: !item.toDeliver } : item
    ));
  };

  const toggleItemAssembly = (id: string) => {
    setSelectedItems(prev => prev.map(item => 
        item.id === id ? { ...item, toAssemble: !item.toAssemble } : item
    ));
  };

  // Helper to build order object
  const buildOrderObject = (status: OrderStatus) => {
      return {
        orderNumber: orderNumber || `RASC-${Math.floor(Math.random() * 10000)}`,
        customerName: customerName || 'Cliente (Rascunho)',
        customerLocation: address.city ? `${address.city}, ${address.state}` : 'Local Pendente',
        neighborhood: address.neighborhood,
        date: saleDate || new Date().toISOString().split('T')[0],
        status: status,
        logisticsStatus: status === OrderStatus.DRAFT ? LogisticsStatus.REGISTERED : LogisticsStatus.REGISTERED, // Mock
        type: orderType,
        items: selectedItems.length,
        itemsList: selectedItems,
        deliveryType,
        isFutureDelivery,
        futureDeliveryDate: isFutureDelivery ? futureDeliveryDate : undefined,
        hasAssembly,
        assemblyDate: hasAssembly ? assemblyDate : undefined,
        assemblyStatus: hasAssembly ? 'Pendente' : undefined,
        deliveryDate: isFutureDelivery ? futureDeliveryDate : new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        
        // Extra data for draft restoring
        salesperson,
        draftStep: step,
        cpf,
        phone,
        phoneOptional,
        address,
        invoiceNumber,
        couponNumber,
      };
  };

  // --- ACTIONS ---
  const handleSaveDraft = async () => {
      const orderData = buildOrderObject(OrderStatus.DRAFT);
      
      if (editingId) {
          // Update existing draft
          await dbService.updateOrder(editingId, orderData as any);
      } else {
          // Create new draft
          await dbService.createOrder(orderData as any);
      }
      navigate('/drafts');
  };

  const handleFinalizeOrder = async () => {
    const orderData = buildOrderObject(OrderStatus.OPEN);

    if (editingId) {
        // Update draft to Open Order
        await dbService.updateOrder(editingId, orderData as any);
    } else {
        // Create new
        // @ts-ignore
        await dbService.createOrder(orderData);
    }
    navigate('/orders');
  };

  // Calculations
  const totalItems = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalAssembly = selectedItems.reduce((acc, item) => acc + (item.assemblyValue * item.quantity), 0);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{editingId ? 'Editar Pedido / Rascunho' : 'Novo Pedido'}</h2>
          <p className="text-slate-500 text-sm mt-1">Preencha as informações básicas para iniciar o processo.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900 mb-1">Status do formulário: <span className="text-primary">{step * 25}% Completo</span></p>
          <div className="w-48 bg-primary/20 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${step * 25}%` }}></div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Stepper */}
        <div className="flex border-b border-slate-200">
          {[1, 2, 3, 4].map((s) => (
             <div 
                key={s} 
                className={`flex-1 px-6 py-4 flex items-center gap-3 border-b-2 transition-colors ${step === s ? 'bg-primary/5 border-primary' : 'border-transparent opacity-60'}`}
             >
                <span className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {s}
                </span>
                <span className={`text-sm font-bold leading-tight ${step === s ? 'text-primary' : 'text-slate-500'}`}>
                    {s === 1 ? 'Dados do Pedido' : s === 2 ? 'Dados do Cliente' : s === 3 ? 'Produtos' : 'Entrega'}
                </span>
             </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-8 flex-1">
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Nº Pedido</span>
                                <input 
                                    type="text" 
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                    placeholder="Ex: 8942-A" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Vendedor</span>
                                <input 
                                    type="text" 
                                    placeholder="Nome"
                                    value={salesperson}
                                    onChange={(e) => setSalesperson(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">Tipo de Pedido</span>
                            <div className="flex gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="type" 
                                        className="hidden peer" 
                                        checked={orderType === OrderType.STORE}
                                        onChange={() => setOrderType(OrderType.STORE)}
                                    />
                                    <div className="text-center py-2.5 rounded-lg border border-slate-200 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:text-primary font-medium text-sm transition-all">Loja Física</div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="type" 
                                        className="hidden peer"
                                        checked={orderType === OrderType.ECOMMERCE}
                                        onChange={() => setOrderType(OrderType.ECOMMERCE)}
                                    />
                                    <div className="text-center py-2.5 rounded-lg border border-slate-200 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:text-primary font-medium text-sm transition-all">E-commerce</div>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Nota Fiscal</span>
                                <input 
                                    type="text" 
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    placeholder="000.000" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                             <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Cupom Fiscal</span>
                                <input 
                                    type="text" 
                                    value={couponNumber}
                                    onChange={(e) => setCouponNumber(e.target.value)}
                                    placeholder="Código" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                        </div>
                         <label className="block">
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">Data da Venda</span>
                            <input 
                                type="date" 
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                            />
                        </label>
                    </div>

                    <div className="space-y-4">
                         <label className="block">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-bold text-slate-900">Data Estimada de Entrega</span>
                                <span className="material-symbols-outlined text-primary text-sm" title="Calculado automaticamente">info</span>
                            </div>
                            <input type="date" value="2023-11-25" readOnly className="w-full px-4 py-2.5 rounded-lg border-transparent bg-primary/5 text-primary font-medium cursor-not-allowed text-sm" />
                            <p className="text-[10px] text-primary/70 mt-1">* Calculada via roteirização automática.</p>
                        </label>
                    </div>
                </div>
            )}
            
            {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                     {/* Personal Info */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">Nome do Cliente</span>
                            <input 
                                type="text" 
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Nome Completo" 
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">CPF</span>
                            <input 
                                type="text" 
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                placeholder="000.000.000-00" 
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                            />
                        </label>
                     </div>

                     {/* Contact Info */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">Telefone de Contato</span>
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000" 
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">Telefone Opcional</span>
                            <input 
                                type="tel" 
                                value={phoneOptional}
                                onChange={(e) => setPhoneOptional(e.target.value)}
                                placeholder="(00) 00000-0000" 
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                            />
                        </label>
                     </div>

                     {/* Address Info */}
                     <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Endereço de Entrega</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">CEP</span>
                                <input 
                                    type="text" 
                                    value={address.cep}
                                    onChange={(e) => setAddress({...address, cep: e.target.value})}
                                    placeholder="00000-000" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Estado</span>
                                <input 
                                    type="text" 
                                    value={address.state}
                                    onChange={(e) => setAddress({...address, state: e.target.value})}
                                    placeholder="UF" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                             <label className="block md:col-span-2">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Cidade</span>
                                <input 
                                    type="text" 
                                    value={address.city}
                                    onChange={(e) => setAddress({...address, city: e.target.value})}
                                    placeholder="Nome da Cidade" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                             <label className="block md:col-span-1">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Bairro</span>
                                <input 
                                    type="text" 
                                    value={address.neighborhood}
                                    onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                                    placeholder="Bairro" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Rua</span>
                                <input 
                                    type="text" 
                                    value={address.street}
                                    onChange={(e) => setAddress({...address, street: e.target.value})}
                                    placeholder="Logradouro" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-slate-900 mb-1.5 block">Número</span>
                                <input 
                                    type="text" 
                                    value={address.number}
                                    onChange={(e) => setAddress({...address, number: e.target.value})}
                                    placeholder="Nº" 
                                    className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                />
                            </label>
                        </div>

                         <label className="block mt-6">
                            <span className="text-sm font-bold text-slate-900 mb-1.5 block">Observação</span>
                            <textarea 
                                value={address.observation}
                                onChange={(e) => setAddress({...address, observation: e.target.value})}
                                placeholder="Ponto de referência, instruções de entrega, etc..." 
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm resize-none" 
                            />
                        </label>
                     </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-fadeIn h-full flex flex-col">
                    {/* Search Bar */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar produto por SKU ou Descrição..." 
                            className="w-full pl-11 pr-4 py-3 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-3.5">
                                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-20">
                                {searchResults.map(product => (
                                    <button 
                                        key={product.id}
                                        onClick={() => addProductToOrder(product)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 group transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{product.description}</p>
                                            <p className="text-xs text-slate-500">SKU: <span className="font-mono">{product.sku}</span></p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-xs font-medium text-slate-600">Montagem: R$ {product.assemblyValue.toFixed(2)}</p>
                                            <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Products Table */}
                    <div className="flex-1 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm">Itens Selecionados</h3>
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                            </span>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-2">
                             {selectedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">shopping_cart_off</span>
                                    <p className="text-sm">Nenhum produto adicionado.</p>
                                </div>
                             ) : (
                                <table className="w-full text-left">
                                    <thead className="text-xs text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Produto</th>
                                            <th className="px-4 py-3 text-center">Qtd</th>
                                            <th className="px-4 py-3 text-right">Vl. Montagem</th>
                                            <th className="px-4 py-3 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {selectedItems.map(item => (
                                            <tr key={item.id} className="group">
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="size-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                        <button 
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="size-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-slate-600 font-medium">
                                                    R$ {(item.assemblyValue * item.quantity).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        onClick={() => removeProduct(item.id)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             )}
                        </div>
                        
                        {/* Totals Footer */}
                        {selectedItems.length > 0 && (
                            <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-8">
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Montagem</p>
                                    <p className="text-xl font-bold text-primary">R$ {totalAssembly.toFixed(2)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">local_shipping</span>
                                <h3 className="font-bold text-slate-900">1. Configuração de Entrega</h3>
                            </div>
                             <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                                <button 
                                    onClick={() => setDeliveryType(DeliveryType.COMPLETE)}
                                    className={`px-3 py-1.5 rounded-md transition-all ${deliveryType === DeliveryType.COMPLETE ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Completa
                                </button>
                                <button 
                                    onClick={() => setDeliveryType(DeliveryType.PARTIAL)}
                                    className={`px-3 py-1.5 rounded-md transition-all ${deliveryType === DeliveryType.PARTIAL ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Parcial
                                </button>
                            </div>
                        </div>

                         <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                             {selectedItems.length === 0 ? (
                                <p className="p-4 text-center text-sm text-slate-500">Nenhum item adicionado ao pedido.</p>
                             ) : (
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-slate-200">
                                        {selectedItems.map(item => (
                                            <tr key={item.id} className="bg-white">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                                            <span className="material-symbols-outlined text-xl">chair</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                                            <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                                    Qtd: {item.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {deliveryType === DeliveryType.PARTIAL ? (
                                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                className="rounded text-primary focus:ring-primary border-slate-300"
                                                                checked={item.toDeliver}
                                                                onChange={() => toggleItemDelivery(item.id)}
                                                            />
                                                            <span className="text-xs font-bold text-slate-600 uppercase">Entregar</span>
                                                        </label>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                            <span className="material-symbols-outlined text-sm">check</span>
                                                            ENTREGAR
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             )}
                        </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                             <span className="material-symbols-outlined text-primary">alt_route</span>
                             <h3 className="font-bold text-slate-900">2. Status do Fluxo Logístico (Inicial)</h3>
                        </div>
                        <div className="relative flex items-center justify-between px-4">
                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-10"></div>
                            
                            {[
                                { label: 'Registrado', icon: 'assignment', active: true },
                                { label: 'Separado', icon: 'inventory_2', active: false },
                                { label: 'Carregado', icon: 'local_shipping', active: false },
                                { label: 'Em Rota', icon: 'move_to_inbox', active: false },
                                { label: 'Concluído', icon: 'check_circle', active: false },
                            ].map((s, i) => (
                                <div key={i} className="flex flex-col items-center bg-white px-2">
                                    <div className={`size-10 rounded-full flex items-center justify-center mb-2 border-2 ${s.active ? 'bg-primary text-white border-primary' : 'bg-white text-slate-300 border-slate-200'}`}>
                                        <span className="material-symbols-outlined text-xl">{s.icon}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${s.active ? 'text-slate-900' : 'text-slate-300'}`}>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white border border-slate-200 rounded-xl p-6 h-full">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">notifications_active</span>
                                <h3 className="font-bold text-slate-900">3. Regras de Prazos</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <span className="material-symbols-outlined text-emerald-600">timer</span>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 uppercase">No Prazo</p>
                                        <p className="text-xs text-emerald-600">Até 48h após a criação.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                    <span className="material-symbols-outlined text-amber-600">warning</span>
                                    <div>
                                        <p className="text-xs font-bold text-amber-800 uppercase">Atrasado</p>
                                        <p className="text-xs text-amber-600">Acima de 3 dias do pedido.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                                    <span className="material-symbols-outlined text-red-600">history_toggle_off</span>
                                    <div>
                                        <p className="text-xs font-bold text-red-800 uppercase">Muito Atrasado (Crítico)</p>
                                        <p className="text-xs text-red-600">Acima de 7 dias do pedido.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="bg-white border border-slate-200 rounded-xl p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">event_upcoming</span>
                                    <h3 className="font-bold text-slate-900">4. Entrega Futura</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isFutureDelivery} onChange={(e) => setIsFutureDelivery(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                            
                            {isFutureDelivery ? (
                                <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                                    <p className="text-sm text-slate-500 mb-2">Selecione a data para agendamento:</p>
                                    <input 
                                        type="date" 
                                        value={futureDeliveryDate}
                                        onChange={(e) => setFutureDeliveryDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                    />
                                    <div className="mt-3 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex items-start gap-2">
                                        <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                                        <p>Este pedido será filtrado separadamente como "Entrega Futura".</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200 m-1">
                                    Entrega Imediata (Padrão)
                                </div>
                            )}
                         </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">build</span>
                                <h3 className="font-bold text-slate-900">5. Montagem de Móveis</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">Necessita Montagem?</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={hasAssembly} onChange={(e) => setHasAssembly(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        {hasAssembly && (
                            <div className="animate-fadeIn space-y-4">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex flex-col md:flex-row gap-6 mb-4">
                                        <div className="flex-1">
                                             <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Prazo Limite para Montagem</label>
                                             <input 
                                                type="date" 
                                                value={assemblyDate}
                                                onChange={(e) => setAssemblyDate(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                                            />
                                        </div>
                                        <div className="flex-1 flex items-end pb-2">
                                             <p className="text-xs text-slate-500">
                                                * O tempo de montagem será monitorado com as mesmas regras de atraso da entrega (3 e 7 dias).
                                             </p>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-slate-200 pt-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Itens para Montagem</p>
                                         <div className="space-y-2">
                                            {selectedItems.filter(i => i.assemblyValue > 0).length === 0 && (
                                                <p className="text-sm text-slate-400 italic">Nenhum item com valor de montagem detectado.</p>
                                            )}
                                            {selectedItems.filter(i => i.assemblyValue > 0).map(item => (
                                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                                                    <span className="text-sm font-medium text-slate-800">{item.description}</span>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded text-primary focus:ring-primary border-slate-300"
                                                            checked={item.toAssemble}
                                                            onChange={() => toggleItemAssembly(item.id)}
                                                        />
                                                        <span className="text-xs font-bold text-slate-600">MONTAR</span>
                                                    </label>
                                                </div>
                                            ))}
                                         </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center mt-auto">
            <button 
                onClick={() => step === 1 ? navigate('/') : prevStep()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-white transition-all"
            >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Voltar
            </button>
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleSaveDraft}
                    className="text-sm font-medium text-primary hover:underline"
                >
                    Salvar como Rascunho
                </button>
                <button 
                    onClick={step === 4 ? handleFinalizeOrder : nextStep}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all"
                >
                    {step === 4 ? 'Finalizar Pedido' : 'Próxima Etapa'}
                    <span className="material-symbols-outlined text-lg">{step === 4 ? 'check' : 'arrow_forward'}</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};