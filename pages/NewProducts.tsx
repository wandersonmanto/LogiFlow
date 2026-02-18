import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { NewProduct } from '../types';

export const NewProducts: React.FC = () => {
    const [products, setProducts] = useState<NewProduct[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNewProducts = async () => {
        setLoading(true);
        try {
            const data = await dbService.getNewProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNewProducts();
    }, []);

    const handleClearList = async () => {
        if (!window.confirm('Tem certeza que deseja limpar a lista de novos produtos? Os produtos continuarão cadastrados no sistema.')) return;

        try {
            setLoading(true);
            await dbService.clearNewProducts();
            setProducts([]);
        } catch (error) {
            console.error(error);
            alert('Erro ao limpar lista.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Novos Produtos</h2>
                    <p className="text-slate-500 text-sm mt-1">Lista de produtos recém cadastrados.</p>
                </div>
                <button 
                    onClick={handleClearList}
                    disabled={loading || products.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    Limpar Lista
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-3 border-b border-slate-200">Data Cadastro</th>
                            <th className="px-6 py-3 border-b border-slate-200">SKU</th>
                            <th className="px-6 py-3 border-b border-slate-200">Descrição</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-400">Carregando...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhum novo produto cadastrado.</td></tr>
                        ) : products.map(product => (
                            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 text-sm text-slate-500">
                                    {new Date(product.createdAt).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-3 font-mono text-xs text-slate-600 font-bold">{product.sku}</td>
                                <td className="px-6 py-3 text-sm text-slate-900">{product.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
