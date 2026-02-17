import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { AssemblerStats, KPI } from '../types';

export const Reports: React.FC = () => {
  const [stats, setStats] = useState<AssemblerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await dbService.getAssemblerStats(period);
      setStats(data);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const filteredStats = stats.filter(assembler => 
    assembler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembler.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aggregate Top Level KPIs based on the fetched stats
  const totalAssemblies = stats.reduce((acc, curr) => acc + curr.totalAssemblies, 0);
  const totalValue = stats.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalBonus = stats.reduce((acc, curr) => acc + curr.bonusTotal, 0);
  const avgOnTime = stats.length > 0 ? (stats.reduce((acc, curr) => acc + curr.onTimeRate, 0) / stats.length).toFixed(1) : '0';

  const kpis: KPI[] = [
    { label: 'Total de Montagens', value: totalAssemblies.toString(), change: period === 'month' ? '+12%' : '+2%', trend: 'up', icon: 'build', colorClass: 'text-primary bg-primary/10' },
    { label: 'Valor Total Gerado', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, change: '+8%', trend: 'up', icon: 'payments', colorClass: 'text-emerald-600 bg-emerald-100' },
    { label: 'Pontualidade Média', value: `${avgOnTime}%`, change: '-1%', trend: 'neutral', icon: 'alarm_on', colorClass: 'text-blue-600 bg-blue-100' },
    { label: 'Bônus Distribuídos', value: `R$ ${totalBonus.toLocaleString('pt-BR')}`, change: '+15%', trend: 'up', icon: 'stars', colorClass: 'text-amber-600 bg-amber-100' },
  ];

  const getProgressColor = (current: number, goal: number) => {
    const percentage = (current / goal) * 100;
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 70) return 'bg-primary';
    if (percentage >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <nav className="flex text-xs font-medium text-primary gap-2 mb-2">
            <span className="opacity-70">LogiFlow</span>
            <span>/</span>
            <span className="text-slate-900">Relatórios</span>
           </nav>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Produtividade de Montagem</h2>
           <p className="text-slate-500 text-sm mt-1">Análise de desempenho da equipe de montadores.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
             <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input 
                    type="text" 
                    placeholder="Buscar montador..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary shadow-sm"
                />
             </div>
             <div className="bg-white rounded-lg border border-slate-200 p-1 flex text-xs font-bold shadow-sm">
                <button 
                    onClick={() => setPeriod('week')}
                    className={`px-4 py-1.5 rounded-md transition-all ${period === 'week' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Semana
                </button>
                <button 
                    onClick={() => setPeriod('month')}
                    className={`px-4 py-1.5 rounded-md transition-all ${period === 'month' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Mês
                </button>
             </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`size-10 rounded-lg flex items-center justify-center ${kpi.colorClass}`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${kpi.trend === 'down' ? 'text-red-600 bg-red-50' : kpi.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>
                {kpi.change}
                {kpi.trend === 'up' && <span className="material-symbols-outlined text-xs">trending_up</span>}
                {kpi.trend === 'down' && <span className="material-symbols-outlined text-xs">trending_down</span>}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{kpi.label}</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
                <h3 className="font-bold text-slate-900 text-lg">Ranking de Performance</h3>
                <p className="text-xs text-slate-500 mt-1">Comparativo de montadores ordenado por valor gerado.</p>
            </div>
            <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-lg">download</span>
                Exportar CSV
            </button>
         </div>

         {loading ? (
             <div className="p-12 text-center text-slate-500">Carregando dados...</div>
         ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">Rank</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Montador</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Montagens</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Tempo Médio</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Pontualidade</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Valor Gerado</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Meta Individual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStats.map((assembler, index) => {
                            const progress = Math.min((assembler.totalValue / assembler.goal) * 100, 100);
                            return (
                                <tr key={assembler.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${index < 3 ? 'bg-primary text-white shadow-primary/30 shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border border-white shadow-sm">
                                                {assembler.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{assembler.name}</p>
                                                <p className="text-xs text-slate-400">ID: {assembler.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="font-bold text-slate-700">{assembler.totalAssemblies}</span>
                                    </td>
                                    <td className="px-6 py-5 text-center text-sm text-slate-600 font-mono">
                                        {assembler.avgTime}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                         <span className={`px-2 py-1 rounded text-xs font-bold ${assembler.onTimeRate >= 95 ? 'bg-emerald-100 text-emerald-700' : assembler.onTimeRate >= 90 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {assembler.onTimeRate}%
                                         </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-slate-900">R$ {assembler.totalValue.toLocaleString('pt-BR')}</span>
                                            <span className="text-[10px] text-emerald-600 font-medium">+ R$ {assembler.bonusTotal} bônus</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold text-slate-500">R$ {assembler.totalValue} / {assembler.goal}</span>
                                            <span className="text-[10px] font-bold text-slate-900">{Math.round((assembler.totalValue / assembler.goal) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(assembler.totalValue, assembler.goal)}`} 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredStats.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    Nenhum montador encontrado com os filtros atuais.
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