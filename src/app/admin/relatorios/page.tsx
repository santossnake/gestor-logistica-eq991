'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, TrendingUp, Car, Fuel, Wrench } from 'lucide-react';
import { supabase, Viatura, RegistoMarcha } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_MARCHAS } from '@/lib/mock-data';

export default function RelatoriosPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [marchas, setMarchas] = useState<RegistoMarcha[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*');
        const { data: mData } = await supabase.from('registos_marcha').select('*');

        setViaturas(vData && vData.length > 0 ? vData : MOCK_VIATURAS);
        setMarchas(mData && mData.length > 0 ? mData : MOCK_MARCHAS);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalKmRodados = viaturas.reduce((acc, v) => acc + v.km_atuais, 0);
  const totalMarchas = marchas.length;
  const totalLitrosAbastecidos = marchas.reduce((acc, m) => acc + (m.litros_abastecidos || 0), 0);
  const totalValorCombustivel = marchas.reduce((acc, m) => acc + (m.valor_abastecido || 0), 0);

  const handleExportRelatorioCSV = () => {
    const headers = 'Matricula,Modelo,KmAtuais,Estado,NecessitaLimpeza,LocalViatura,LocalChave\n';
    const rows = viaturas
      .map((v) => `${v.matricula},${v.modelo},${v.km_atuais},${v.estado},${v.necessita_limpeza},${v.localizacao_atual_viatura},${v.localizacao_atual_chave}`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_frota_eq991_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Relatórios Operacionais & Estatísticas de Frota
            </h1>
            <p className="text-xs text-slate-400">
              Resumo executivo de utilização, consumos de combustível e termos de responsabilidade.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card border border-emerald-500/30 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">Total KM Frota</span>
          <span className="text-2xl font-black text-white font-mono block">{totalKmRodados.toLocaleString()} KM</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-blue-500/30 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">Total de Marchas</span>
          <span className="text-2xl font-black text-white font-mono block">{totalMarchas}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-amber-500/30 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">Litros Abastecidos</span>
          <span className="text-2xl font-black text-white font-mono block">{totalLitrosAbastecidos} L</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-purple-500/30 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">Despesa Combustível</span>
          <span className="text-2xl font-black text-white font-mono block">{totalValorCombustivel.toFixed(2)} €</span>
        </div>
      </div>

      {/* Export Action Card */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase">Exportação Geral de Dados em CSV</h2>
          <p className="text-xs text-slate-400">Descarregue o relatório completo do estado da frota e odómetros.</p>
        </div>

        <button
          onClick={handleExportRelatorioCSV}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center space-x-2 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório Geral CSV</span>
        </button>
      </div>
    </div>
  );
}
