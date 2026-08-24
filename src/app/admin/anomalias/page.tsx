'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wrench, CheckCircle2, Shield, Image, MapPin } from 'lucide-react';
import { supabase, Anomalia, Viatura } from '@/lib/supabase/client';
import { MOCK_ANOMALIAS, MOCK_VIATURAS } from '@/lib/mock-data';
import { getStoredAnomalias, saveStoredAnomalias } from '@/lib/utils/cookies';

export default function AnomaliasPage() {
  const [anomalias, setAnomalias] = useState<Anomalia[]>([]);
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [filterGravidade, setFilterGravidade] = useState<string>('TODAS');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: aData } = await supabase.from('anomalias').select('*').order('created_at', { ascending: false });
        const { data: vData } = await supabase.from('viaturas').select('*').order('matricula', { ascending: true });

        const localAnomalias = getStoredAnomalias();
        const baseAnomalias = localAnomalias.length > 0 ? localAnomalias : (aData && aData.length > 0 ? aData : MOCK_ANOMALIAS);

        setAnomalias(baseAnomalias);
        setViaturas(vData && vData.length > 0 ? vData : MOCK_VIATURAS);
      } catch (err) {
        console.error(err);
        const localAnomalias = getStoredAnomalias();
        setAnomalias(localAnomalias.length > 0 ? localAnomalias : MOCK_ANOMALIAS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const updateEstadoAnomalia = async (id: string, novoEstado: 'PENDENTE' | 'EM_RESOLUCAO' | 'RESOLVIDO') => {
    try {
      await supabase.from('anomalias').update({ estado_anomalia: novoEstado }).eq('id', id);
      const updated = anomalias.map((a) => (a.id === id ? { ...a, estado_anomalia: novoEstado } : a));
      setAnomalias(updated);
      saveStoredAnomalias(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filterGravidade === 'TODAS' ? anomalias : anomalias.filter((a) => a.gravidade === filterGravidade);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Painel de Anomalias & Avarias da Frota
            </h1>
            <p className="text-xs text-slate-400">
              Controlo de gravidade de incidentes (Leve, Moderada, Grave/Impeditiva) e notas de manutenção.
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono text-slate-400">Filtrar por Gravidade:</span>
        {(['TODAS', 'LEVE', 'MODERADA', 'GRAVE'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setFilterGravidade(g)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              filterGravidade === g ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Anomalies Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-6 text-center">Nenhuma anomalia registada para o filtro selecionado.</p>
        ) : (
          filtered.map((a) => {
            const v = viaturas.find((item) => item.id === a.viatura_id || item.matricula === a.viatura_id) || MOCK_VIATURAS.find((item) => item.id === a.viatura_id || item.matricula === a.viatura_id) || viaturas[0];

            return (
              <div key={a.id} className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-black text-lg text-emerald-400 font-bold">{v?.matricula || 'AM-96-12'}</span>
                    <span className="text-xs text-slate-400 font-semibold">{v?.modelo || 'Nissan Navara 4x4'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        a.gravidade === 'GRAVE'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : a.gravidade === 'MODERADA'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      GRAVIDADE: {a.gravidade}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        a.estado_anomalia === 'RESOLVIDO'
                          ? 'bg-emerald-950 text-emerald-300'
                          : a.estado_anomalia === 'EM_RESOLUCAO'
                          ? 'bg-blue-950 text-blue-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {a.estado_anomalia}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 font-medium">{a.descricao}</p>

                {a.foto_url && (
                  <div className="pt-1">
                    <img src={a.foto_url} alt="Foto Anomalia" className="w-32 h-20 object-cover rounded-lg border border-slate-700" />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
                  <span className="text-slate-500">Registado em: {new Date(a.created_at).toLocaleString()}</span>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <a
                      href={`mailto:manutencao.eq991@emfa.gov.pt?subject=${encodeURIComponent(
                        `Esquadra 991 - ALERTA DE ANOMALIA (${v?.matricula || 'AM-96-12'}): ${a.gravidade}`
                      )}&body=${encodeURIComponent(
                        `À Equipa de Manutenção da Esquadra 991,\n\nFoi registada uma anomalia na viatura com a matrícula ${v?.matricula || 'AM-96-12'} (${v?.modelo || 'Nissan Navara'}).\n\n- GRAVIDADE: ${a.gravidade}\n- ESTADO: ${a.estado_anomalia}\n- DATA REGISTO: ${new Date(a.created_at).toLocaleString()}\n\nDESCRIÇÃO DO INCIDENTE:\n${a.descricao}\n\nFavor proceder à verificação técnica do veículo.\n\nCumprimentos,\nLogística Esquadra 991`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-[11px] font-bold border border-amber-800 flex items-center space-x-1.5 transition-colors"
                      title="Abrir cliente de email nativo pré-preenchido para a Manutenção (@emfa.gov.pt)"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Notificar Manutenção ✉️</span>
                    </a>

                    <button
                      onClick={() => updateEstadoAnomalia(a.id, 'EM_RESOLUCAO')}
                      className="px-3 py-1.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 text-[11px] font-bold border border-blue-800"
                    >
                      Em Resolução
                    </button>
                    <button
                      onClick={() => updateEstadoAnomalia(a.id, 'RESOLVIDO')}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                    >
                      Marcar Resolvido
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
