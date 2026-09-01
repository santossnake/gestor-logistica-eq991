'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, Sparkles, CheckCircle2, ShieldAlert, Wrench, Sparkle, ArrowRight, Truck, Info, Wifi, Building } from 'lucide-react';
import { supabase, Viatura, Anomalia, EmprestimoExterno } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_ANOMALIAS } from '@/lib/mock-data';
import { getFleetOverrides, getStoredEmprestimos } from '@/lib/utils/cookies';
import { NfcScanner } from '@/components/NfcScanner';

export default function RecomendadaPage() {
  // Synchronous calculation of top recommended vehicle on initial render
  // Helper to ensure real odometers > 90k KM
  const sanitizeViaturaKm = (v: Viatura): Viatura => {
    if (v.matricula === 'AM-96-11' && v.km_atuais < 98620) return { ...v, km_atuais: 98620 };
    if (v.matricula === 'AM-96-12' && v.km_atuais < 105888) return { ...v, km_atuais: 105888 };
    if (v.matricula === 'AM-96-13' && v.km_atuais < 102614) return { ...v, km_atuais: 102614 };
    return v;
  };

  const overrides = typeof window !== 'undefined' ? getFleetOverrides() : {};
  const initialFleet = MOCK_VIATURAS.map((v) => sanitizeViaturaKm(overrides[v.id] ? { ...v, ...overrides[v.id] } : v));
  const initialAnomalies = MOCK_ANOMALIAS;
  const initialForced = initialFleet.find((v) => v.is_forcada_recomendada && v.estado === 'DISPONIVEL');
  const initialRec = initialForced || initialFleet.find((v) => v.estado === 'DISPONIVEL') || initialFleet[0];

  const [viaturas, setViaturas] = useState<Viatura[]>(initialFleet);
  const [anomalias, setAnomalias] = useState<Anomalia[]>(initialAnomalies);
  const [emprestimos, setEmprestimos] = useState<EmprestimoExterno[]>([]);
  const [recomendada, setRecomendada] = useState<Viatura | null>(initialRec);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(initialRec);
  const [showNfcScanner, setShowNfcScanner] = useState<boolean>(false);

  useEffect(() => {
    async function loadFleet() {
      try {
        const localOverrides = getFleetOverrides();

        const { data: vData } = await supabase.from('viaturas').select('*');
        const { data: aData } = await supabase.from('anomalias').select('*');
        const { data: pData } = await supabase.from('pedidos').select('*');
        const { data: eData } = await supabase.from('emprestimos_externos').select('*').order('created_at', { ascending: false });

        const dbPedidos = pData || [];
        const remoteEmp = eData || [];
        const localEmp = getStoredEmprestimos();
        const empMap = new Map<string, EmprestimoExterno>();
        remoteEmp.forEach((emp) => empMap.set(emp.id, emp));
        localEmp.forEach((emp) => {
          if (!empMap.has(emp.id)) empMap.set(emp.id, emp);
        });
        const mergedEmp = Array.from(empMap.values());
        setEmprestimos(mergedEmp);

        let fleet: Viatura[] = vData && vData.length > 0 ? vData : MOCK_VIATURAS;
        fleet = fleet.map((v) => {
          const sanitized = sanitizeViaturaKm(localOverrides[v.id] ? { ...v, ...localOverrides[v.id] } : v);

          const activeEmp = mergedEmp.find(
            (e) => e.viatura_id === v.id && (e.estado === 'ATIVO' || (e as any).estado === 'ATIVO') && !e.data_devolucao_real
          );

          if (activeEmp) {
            const isOverdue = new Date() > new Date(activeEmp.data_fim_prevista);
            return {
              ...sanitized,
              estado: 'EMPRESTADA_EXTERNO',
              _activeLoan: activeEmp,
              _isLoanOverdue: isOverdue
            } as any;
          }

          const hasApprovedBooking = dbPedidos.some(
            (p: any) => p.viatura_id === v.id && p.estado_pedido === 'APROVADO'
          );
          if (hasApprovedBooking && sanitized.estado === 'DISPONIVEL') {
            return { ...sanitized, estado: 'RESERVADA' };
          }
          return sanitized;
        });

        const anomalies: Anomalia[] = aData && aData.length > 0 ? aData : MOCK_ANOMALIAS;

        setViaturas(fleet);
        setAnomalias(anomalies);

        // Intelligent Recommendation Logic:
        const forced = fleet.find((v) => v.is_forcada_recomendada && v.estado === 'DISPONIVEL');
        if (forced) {
          setRecomendada(forced);
          setSelectedViatura(forced);
        } else {
          const available = fleet.filter((v) => {
            if (v.estado !== 'DISPONIVEL') return false;
            if (v.necessita_limpeza) return false;

            const hasSevereDefect = anomalies.some(
              (a) => a.viatura_id === v.id && a.gravidade === 'GRAVE' && a.estado_anomalia !== 'RESOLVIDO'
            );
            if (hasSevereDefect) return false;

            return true;
          });

          if (available.length > 0) {
            available.sort((a, b) => a.km_atuais - b.km_atuais);
            setRecomendada(available[0]);
            setSelectedViatura(available[0]);
          } else if (fleet.length > 0) {
            setRecomendada(fleet[0]);
            setSelectedViatura(fleet[0]);
          }
        }
      } catch (err) {
        console.error('Carregamento assíncrono em segundo plano:', err);
      }
    }

    loadFleet();
  }, []);

  const activeViatura = selectedViatura || recomendada;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>ATRIBUIÇÃO INTELIGENTE DE FROTA</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wider mt-1">
            Viatura Recomendada
          </h1>
          <p className="text-xs text-slate-400">
            Painel Geral da Esquadra 991. Escolha a viatura recomendada ou selecione qualquer outra viatura disponível.
          </p>
        </div>

        <button
          onClick={() => setShowNfcScanner(!showNfcScanner)}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center space-x-2 transition-colors"
        >
          <Wifi className="w-4 h-4" />
          <span>{showNfcScanner ? 'Ocultar Leitor NFC' : 'Ler Tag NFC do Porta-Chaves'}</span>
        </button>
      </div>

      {showNfcScanner && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <NfcScanner />
        </div>
      )}

      {/* Recommended Spotlight Card */}
      {activeViatura && (
        <div className="p-6 rounded-2xl glass-panel border-2 border-emerald-500/40 relative overflow-hidden shadow-2xl space-y-6">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-bl-xl flex items-center space-x-1">
            <Sparkle className="w-3.5 h-3.5 fill-slate-950" />
            <span>
              {activeViatura.id === recomendada?.id ? 'Recomendação Algorítmica' : 'Viatura Selecionada'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold">MATRÍCULA DA FORÇA AÉREA</span>
              <h2 className="text-3xl font-black text-white tracking-widest font-mono">
                {activeViatura.matricula}
              </h2>
              <p className="text-lg font-semibold text-slate-300">{activeViatura.modelo}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                👤 {activeViatura.num_lugares} Lugares
              </span>
              {activeViatura.tem_gancho_reboque && (
                <span className="px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Gancho de Reboque</span>
                </span>
              )}
              {activeViatura.necessita_limpeza && (
                <span className="px-3 py-1 rounded-lg bg-amber-950 border border-amber-500/50 text-xs font-mono text-amber-300 font-bold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>🧼 Necessita Limpeza</span>
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
            <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              O QR Code do painel e as Tags NFC no porta-chaves são atalhos diretos para aceder à viatura. Pode iniciar marcha diretamente aqui.
            </span>
          </div>

          {/* ACTIVE EXTERNAL LOAN WARNING BANNER IN SPOTLIGHT */}
          {(activeViatura.estado === 'EMPRESTADA_EXTERNO' || (activeViatura as any)._activeLoan) && (() => {
            const emp = (activeViatura as any)._activeLoan;
            const isOverdue = (activeViatura as any)._isLoanOverdue || (emp && new Date() > new Date(emp.data_fim_prevista));

            return (
              <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 shadow-lg ${
                isOverdue
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-200 animate-pulse'
                  : 'bg-purple-950/90 border-purple-500/60 text-purple-200'
              }`}>
                <div className="flex items-center justify-between font-bold border-b pb-1.5 border-purple-800">
                  <span className="flex items-center space-x-1.5 text-sm">
                    <Building className="w-4 h-4 text-purple-400" />
                    <span>{isOverdue ? '🚨 CEDÊNCIA EXTERNA EM ATRASO!' : '🏢 VIATURA EM CEDÊNCIA EXTERNA'}</span>
                  </span>
                  {emp?.data_fim_prevista && (
                    <span className={`text-[11px] ${isOverdue ? 'text-rose-300 font-bold' : 'text-purple-300'}`}>
                      Prazo: {new Date(emp.data_fim_prevista).toLocaleString('pt-PT')}
                    </span>
                  )}
                </div>
                {emp && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ENTIDADE RECETORA:</span>
                      <strong className="text-white">{emp.entidade_externa}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">RESPONSÁVEL:</span>
                      <span className="text-slate-200">{emp.nome_responsavel} ({emp.contacto_responsavel})</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">ODÓMETRO ATUAL</span>
              <span className="text-slate-200 font-bold text-sm">
                {activeViatura.km_atuais.toLocaleString()} KM
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">ESTADO DA FROTA</span>
              <span className={`font-bold text-sm flex items-center space-x-1 ${
                activeViatura.estado === 'EMPRESTADA_EXTERNO'
                  ? (activeViatura as any)._isLoanOverdue ? 'text-rose-400' : 'text-purple-400'
                  : 'text-emerald-400'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {activeViatura.estado === 'EMPRESTADA_EXTERNO'
                    ? (activeViatura as any)._isLoanOverdue ? 'EMPRESTADA (EM ATRASO)' : 'CEDÊNCIA EXTERNA'
                    : activeViatura.estado}
                </span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">PARQUEAMENTO</span>
              <span className="text-slate-200 text-xs truncate block" title={activeViatura.localizacao_atual_viatura}>
                {activeViatura.localizacao_atual_viatura}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">LOCAL CHAVE</span>
              <span className="text-slate-200 text-xs truncate block" title={activeViatura.localizacao_atual_chave}>
                {activeViatura.localizacao_atual_chave}
              </span>
            </div>
          </div>

          {/* Direct Action Button */}
          <div className="pt-2">
            <Link
              href={`/chave/${activeViatura.qr_code_token}`}
              className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base tracking-wider uppercase shadow-xl shadow-emerald-950/80 flex items-center justify-center space-x-3 transition-all group"
            >
              <Car className="w-6 h-6" />
              <span>Abrir Página da Viatura & Iniciar Marcha</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {/* Fleet Selection List */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Car className="w-4 h-4 text-emerald-400" />
            <span>Toda a Frota de Viaturas da Esquadra 991</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">{viaturas.length} viaturas registadas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {viaturas.map((v) => {
            const isSelected = activeViatura?.id === v.id;
            const isRec = recomendada?.id === v.id;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedViatura(v)}
                className={`p-4 rounded-xl glass-card transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-emerald-500 bg-slate-800/90 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-100 text-base">{v.matricula}</span>
                    {isRec && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        RECOMENDADA
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      v.estado === 'DISPONIVEL'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : v.estado === 'RESERVADA'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : v.estado === 'EM_USO'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : v.estado === 'EMPRESTADA_EXTERNO'
                        ? (v as any)._isLoanOverdue
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {v.estado === 'EMPRESTADA_EXTERNO'
                      ? (v as any)._isLoanOverdue
                        ? 'EMPRESTADA (EM ATRASO)'
                        : 'CEDÊNCIA EXTERNA'
                      : v.estado}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-300">{v.modelo}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-800/80">
                  <span>{v.km_atuais.toLocaleString()} KM</span>
                  <span>{v.num_lugares} Lugares</span>
                  {v.tem_gancho_reboque && <span className="text-amber-400">Reboque ✓</span>}
                  {v.necessita_limpeza && <span className="text-amber-400 font-bold">🧼 Limpeza ✓</span>}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">Token: {v.qr_code_token}</span>
                  <Link
                    href={`/chave/${v.qr_code_token}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <span>Abrir Chave</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
