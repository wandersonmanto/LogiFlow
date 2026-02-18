import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { dbService } from '../services/db';

interface ImportStats {
    totalRead: number;
    imported: number;
    skippedDept: number;
    skippedExisting: number;
    errors: number;
}

export const ProductImport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const ALLOWED_DEPARTMENTS = [60, 3, 16, 30, 61];

    const [activeTab, setActiveTab] = useState<'import' | 'manual'>('import');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
            setLogs([]);
        }
    };

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const handleImport = async () => {
        if (!file) return;

        setIsLoading(true);
        setStats({ totalRead: 0, imported: 0, skippedDept: 0, skippedExisting: 0, errors: 0 });
        setLogs([]);
        addLog("Iniciando leitura do arquivo...");

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            try {
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                addLog(`Arquivo lido. Total de linhas: ${jsonData.length}`);
                
                let currentStats: ImportStats = { totalRead: jsonData.length, imported: 0, skippedDept: 0, skippedExisting: 0, errors: 0 };

                for (const row of jsonData as any[]) {
                    // 1. Check Department
                    const dept = parseInt(row['Departamento']);
                    if (!ALLOWED_DEPARTMENTS.includes(dept)) {
                        currentStats.skippedDept++;
                        continue;
                    }

                    // 2. Parse Product (SKU - Description)
                    const productRaw = row['Produto'];
                    if (!productRaw || typeof productRaw !== 'string') {
                         currentStats.errors++;
                         addLog(`Erro ao ler produto na linha: ${JSON.stringify(row)}`);
                         continue;
                    }

                    const parts = productRaw.split(' - ');
                    if (parts.length < 2) {
                        currentStats.errors++;
                        addLog(`Formato de produto inválido: ${productRaw}`);
                        continue;
                    }
                    
                    const sku = parts[0].trim();
                    const description = parts.slice(1).join(' - ').trim(); // Rejoin just in case description has hyphens
                    const barcode = row['Prod. C/ Estoque'] ? String(row['Prod. C/ Estoque']).trim() : undefined;

                    // 3. Check Duplicate
                    try {
                        const existing = await dbService.getProductBySku(sku);
                        if (existing) {
                            currentStats.skippedExisting++;
                            continue;
                        }

                        // 4. Create Product
                        await dbService.createProduct({
                            sku,
                            description,
                            assemblyValue: 0,
                            barcode
                        });
                        
                        // Add to "New Products" list
                        await dbService.createNewProductEntry({ sku, description });
                        
                        currentStats.imported++;

                        // Update stats in real-time every 10 items to show progress
                        if (currentStats.imported % 10 === 0) {
                             setStats({...currentStats}); 
                        }

                    } catch (err) {
                        console.error(err);
                        currentStats.errors++;
                        addLog(`Erro ao importar ${sku}: ${err}`);
                    }
                }

                setStats(currentStats);
                addLog("Importação finalizada!");

            } catch (error) {
                console.error("Error parsing Excel", error);
                addLog("Erro crítico ao processar arquivo Excel.");
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };
    
    // Manual Form State
    const [manualForm, setManualForm] = useState({
        sku: '',
        description: '',
        barcode: '',
        assemblyValue: 0
    });
    const [manualLoading, setManualLoading] = useState(false);
    const [manualMessage, setManualMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setManualLoading(true);
        setManualMessage(null);

        try {
            // Check duplicate
            const existing = await dbService.getProductBySku(manualForm.sku);
            if (existing) {
                setManualMessage({ type: 'error', text: 'Já existe um produto com este SKU.' });
                setManualLoading(false);
                return;
            }

            await dbService.createProduct({
                sku: manualForm.sku,
                description: manualForm.description,
                barcode: manualForm.barcode,
                assemblyValue: Number(manualForm.assemblyValue)
            });

            // Add to "New Products" list
            await dbService.createNewProductEntry({ sku: manualForm.sku, description: manualForm.description });

            setManualMessage({ type: 'success', text: 'Produto cadastrado com sucesso!' });
            setManualForm({ sku: '', description: '', barcode: '', assemblyValue: 0 });

        } catch (error) {
            console.error(error);
            setManualMessage({ type: 'error', text: 'Erro ao cadastrar produto.' });
        } finally {
            setManualLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Gestão de Produtos</h2>
                <p className="text-slate-500 text-sm mt-1">Importe produtos via Excel ou cadastre manualmente.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('import')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'import' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Importação em Massa
                </button>
                <button 
                    onClick={() => setActiveTab('manual')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'manual' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Cadastro Manual
                </button>
            </div>

            {activeTab === 'import' ? (
                <>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-4">
                             <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-2">
                                <strong>Regras de Importação:</strong>
                                <ul className="list-disc ml-5 mt-1 space-y-1">
                                    <li>Departamentos permitidos: 60, 3, 16, 30, 61.</li>
                                    <li>Coluna "Produto" deve estar no formato "SKU - DESCRIÇÃO".</li>
                                    <li>Produtos com SKU já existente serão pulados.</li>
                                </ul>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">upload_file</span>
                                <p className="text-slate-600 font-medium mb-4">Arraste seu arquivo aqui ou clique para selecionar</p>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls" 
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-primary/10 file:text-primary
                                        hover:file:bg-primary/20 cursor-pointer
                                    "
                                />
                            </div>

                            {file && (
                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-600">description</span>
                                        <span className="font-medium text-slate-700">{file.name}</span>
                                    </div>
                                    <button 
                                        onClick={handleImport} 
                                        disabled={isLoading}
                                        className={`px-4 py-2 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                                                Iniciar Importação
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-500 font-bold uppercase">Lidos</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.totalRead}</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 shadow-sm">
                                <p className="text-xs text-emerald-600 font-bold uppercase">Importados</p>
                                <p className="text-2xl font-bold text-emerald-700">{stats.imported}</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 shadow-sm">
                                <p className="text-xs text-amber-600 font-bold uppercase">Pular (Depto)</p>
                                <p className="text-2xl font-bold text-amber-700">{stats.skippedDept}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                                <p className="text-xs text-blue-600 font-bold uppercase">Pular (Já Existe)</p>
                                <p className="text-2xl font-bold text-blue-700">{stats.skippedExisting}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
                                <p className="text-xs text-red-600 font-bold uppercase">Erros</p>
                                <p className="text-2xl font-bold text-red-700">{stats.errors}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto">
                        <p className="text-slate-500 mb-2 border-b border-slate-700 pb-1">Logs de Processamento:</p>
                        {logs.length === 0 ? (
                            <p className="text-slate-600 italic">Aguardando início...</p>
                        ) : (
                            logs.map((log, i) => <p key={i}>{log}</p>)
                        )}
                    </div>
                </>
            ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl">
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                    value={manualForm.sku}
                                    onChange={e => setManualForm({...manualForm, sku: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                    value={manualForm.barcode}
                                    onChange={e => setManualForm({...manualForm, barcode: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Produto *</label>
                            <input 
                                required
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                value={manualForm.description}
                                onChange={e => setManualForm({...manualForm, description: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor de Montagem (R$)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                value={manualForm.assemblyValue}
                                onChange={e => setManualForm({...manualForm, assemblyValue: Number(e.target.value)})}
                            />
                        </div>

                        {manualMessage && (
                            <div className={`p-3 rounded-lg text-sm ${manualMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {manualMessage.text}
                            </div>
                        )}

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={manualLoading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {manualLoading ? 'Salvando...' : 'Cadastrar Produto'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
