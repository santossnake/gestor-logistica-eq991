'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Calendar, Clock, User, FileText, Download } from 'lucide-react';
import { getStoredAuditLogs, AuditLogItem } from '@/lib/utils/cookies';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODAS');

  useEffect(() => {
    setLogs(getStoredAuditLogs());
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedCategoria !== 'TODAS' && log.categoria !== selectedCategoria) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAcao = log.acao.toLowerCase().includes(q);
      const matchDetalhes = log.detalhes.toLowerCase().includes(q);
      const matchNome = log.nome.toLowerCase().includes(q);
      const matchTrigrama = log.trigrama.toLowerCase().includes(q);
      return matchAcao || matchDetalhes || matchNome || matchTrigrama;
    }

    return true;
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['ID', 'Data/Hora', 'Trigrama/NIP', 'Militar', 'Posto', 'Categoria', 'Ação', 'Detalhes'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      l.trigrama,
      l.nome,
      l.posto,
      l.categoria,
      l.acao,
      `"${l.detalhes.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_logistica_eq991_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearLogs = () => {
    if (confirm('Tem a certeza que deseja limpar todo o histórico de auditoria do sistema?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eq991_audit_logs_v1');
      }
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Log de Auditoria & Segurança Logística
            </h1>
            <p className="text-xs text-slate-400">
              Registo cronológico e rastreabilidade integral de todas as ações executadas no sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearLogs}
            className="px-3 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <span>Limpar Histórico</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-950 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por ação, militar ou detalhes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {['TODAS', 'RESERVAS', 'VIATURAS', 'LOCAIS', 'ANOMALIAS', 'EMPRESTIMOS', 'UTILIZADORES'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoria(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-colors ${
                selectedCategoria === cat
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Registos Encontrados: {filteredLogs.length}</span>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-12 text-center border border-dashed border-slate-800 rounded-2xl">
            Nenhum registo de auditoria encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-xs font-mono space-y-2"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/40">
                      [{log.trigrama}]
                    </span>
                    <span className="font-bold text-slate-200">
                      {log.posto} {log.nome}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold text-[10px]">
                      {log.categoria}
                    </span>
                    <span className="text-slate-500 text-[11px] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-emerald-300 block">{log.acao}</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{log.detalhes}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
