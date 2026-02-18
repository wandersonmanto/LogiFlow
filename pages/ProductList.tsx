import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import { Product } from '../types';
import * as XLSX from 'xlsx';

export const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const PAGESIZE = 20;

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, count } = await dbService.getProducts(page, PAGESIZE, search);
            setProducts(data);
            setTotalCount(count);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, search]);

    const handleValueChange = async (id: string, newValue: string) => {
        const val = parseFloat(newValue);
        if (isNaN(val)) return;

        try {
            await dbService.updateProduct(id, { assemblyValue: val });
            // Optimistic update
            setProducts(prev => prev.map(p => p.id === id ? { ...p, assemblyValue: val } : p));
        } catch (error) {
            console.error("Failed to update value", error);
        }
    };

    const BulkUpdateModal = () => {
        const [file, setFile] = useState<File | null>(null);
        const [status, setStatus] = useState<string>('');
        const [processing, setProcessing] = useState(false);

        const handleBulkUpdate = async () => {
            if (!file) return;
            setProcessing(true);
            setStatus('Lendo arquivo...');
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = e.target?.result;
                try {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(sheet);
                    
                    let updated = 0;
                    let errors = 0;

                    for (const row of jsonData as any[]) {
                        const productRaw = row['Produto'] as string; // "SKU - DESC"
                        const value = parseFloat(row['Valor']);

                        if (!productRaw || isNaN(value)) {
                            errors++;
                            continue;
                        }

                        const sku = productRaw.split(' - ')[0].trim();
                        
                        // Find ID by SKU
                        const product = await dbService.getProductBySku(sku);
                        if (product) {
                            await dbService.updateProduct(product.id, { assemblyValue: value });
                            updated++;
                        } else {
                            errors++;
                        }
                    }

                    setStatus(`Concluído! Atualizados: ${updated}, Ignorados/Erro: ${errors}`);
                    fetchProducts(); // Refresh list

                } catch (err) {
                    setStatus('Erro ao processar arquivo.');
                    console.error(err);
                } finally {
                    setProcessing(false);
                }
            };
            reader.readAsBinaryString(file);
        };

        if (!isBulkModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Atualizar Valores em Massa</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Envie uma planilha com as colunas: <strong>Produto</strong> e <strong>Valor</strong>.
                    </p>
                    
                    <input 
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-500 mb-4
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary/10 file:text-primary
                            hover:file:bg-primary/20
                        "
                    />

                    {status && <div className="p-2 bg-slate-100 rounded text-sm text-slate-700 mb-4 font-mono">{status}</div>}

                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Fechar</button>
                        <button 
                            onClick={handleBulkUpdate} 
                            disabled={!file || processing}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                        >
                            {processing ? 'Processando...' : 'Atualizar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Lista de Produtos</h2>
                    <p className="text-slate-500 text-sm mt-1">Gerencie os valores de montagem unitários.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar SKU ou Nome..." 
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary focus:border-primary"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">publish</span>
                        Atualizar em Massa
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col shadow-sm">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 border-b border-slate-200">SKU</th>
                                <th className="px-6 py-3 border-b border-slate-200">Descrição</th>
                                <th className="px-6 py-3 border-b border-slate-200">Cód. Barras</th>
                                <th className="px-6 py-3 border-b border-slate-200 w-48 text-right">Valor Montagem (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && products.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Carregando...</td></tr>
                            ) : products.map(product => (
                                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-3 font-mono text-xs text-slate-600 font-bold">{product.sku}</td>
                                    <td className="px-6 py-3 text-sm text-slate-900">{product.description}</td>
                                    <td className="px-6 py-3 text-sm text-slate-500">{product.barcode || '-'}</td>
                                    <td className="px-6 py-2 text-right">
                                        <input 
                                            type="number"
                                            step="0.01"
                                            className="w-24 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                            defaultValue={product.assemblyValue}
                                            onBlur={(e) => handleValueChange(product.id, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {!loading && products.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum produto encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-500">
                        Mostrando {products.length} de {totalCount} resultados
                    </span>
                    <div className="flex gap-1">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded text-sm font-medium text-slate-700">{page}</span>
                        <button 
                            disabled={page * PAGESIZE >= totalCount}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {BulkUpdateModal()}
        </div>
    );
};
