'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Mail, Send, AlertTriangle, CheckCircle2, Shield, Car, Calendar } from 'lucide-react';
import { supabase, Viatura, RegistoMarcha } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_MARCHAS } from '@/lib/mock-data';

export default function UltimoUtilizadorPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViaturaId, setSelectedViaturaId] = useState<string>('');
  const [ultimoRegisto, setUltimoRegisto] = useState<RegistoMarcha | null>(null);

  // Email Notification Form
  const [emailDest, setEmailDest] = useState<string>('');
  const [nipDest, setNipDest] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('Inconformidade de Limpeza / Estado da Viatura');
  const [mensagem, setMensagem] = useState<string>(
    'Exmo. Militar,\n\nSolicita-se a comparência imediata no Gabinete da Logística da EQ991 ou a regularização do estado de limpeza da viatura após a utilização efetuada.\n\nCom os melhores cumprimentos,\nEquipa de Logística EQ991'
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*');
        const vList = vData && vData.length > 0 ? vData : MOCK_VIATURAS;
        setViaturas(vList);
        if (vList.length > 0) {
          setSelectedViaturaId(vList[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function fetchLastDriver() {
      if (!selectedViaturaId) return;

      try {
        const { data: mData } = await supabase
          .from('registos_marcha')
          .select('*')
          .eq('viatura_id', selectedViaturaId)
          .order('data_saida', { ascending: false })
          .limit(1);

        if (mData && mData.length > 0) {
          setUltimoRegisto(mData[0]);
          setNipDest(mData[0].nip_fim || mData[0].nip_inicio);
          setEmailDest(`${mData[0].nip_fim || mData[0].nip_inicio}@emfa.gov.pt`);
        } else {
          setUltimoRegisto(MOCK_MARCHAS[0]);
          setNipDest(MOCK_MARCHAS[0].nip_fim || MOCK_MARCHAS[0].nip_inicio);
          setEmailDest('militar@emfa.gov.pt');
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchLastDriver();
  }, [selectedViaturaId]);

  const handleEnviarNotificacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSuccessMsg('');

    try {
      // 1. Log notification in database
      await supabase.from('notificacoes_utilizadores').insert([
        {
          viatura_id: selectedViaturaId,
          registo_marcha_id: ultimoRegisto?.id,
          nip_destinatario: nipDest,
          email_destinatario: emailDest,
          motivo,
          mensagem,
          enviado_por_admin: true
        }
      ]);

      // 2. Dispatch email API
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'INCONFORMIDADE_LIMPEZA',
          emailDestinatario: emailDest,
          nip: nipDest,
          motivo,
          mensagem
        })
      });

      setSuccessMsg(`Notificação formal enviada com sucesso para o militar [NIP ${nipDest}] (${emailDest}).`);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const vSel = viaturas.find((v) => v.id === selectedViaturaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Auditoria do Último Utilizador & Notificações
            </h1>
            <p className="text-xs text-slate-400">
              Consulte quem conduziu a viatura e notifique diretamente por inconformidades ou falta de limpeza.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Select Vehicle Card */}
      <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Selecionar Viatura da Frota</label>
          <select
            value={selectedViaturaId}
            onChange={(e) => setSelectedViaturaId(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm"
          >
            {viaturas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.matricula} - {v.modelo} {v.necessita_limpeza ? '⚠️ (Limpeza Pendente)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Driver Card Info */}
        {vSel && ultimoRegisto && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">ÚLTIMO MILITAR CONDUTOR</span>
                <h3 className="text-lg font-mono font-bold text-emerald-400">
                  NIP: {ultimoRegisto.nip_fim || ultimoRegisto.nip_inicio}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  vSel.necessita_limpeza ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {vSel.necessita_limpeza ? '⚠️ LIMPEZA PENDENTE' : 'LIMPEZA EM DIA'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">SAÍDA</span>
                <span className="text-slate-200">{new Date(ultimoRegisto.data_saida).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">DEVOLUÇÃO</span>
                <span className="text-slate-200">
                  {ultimoRegisto.data_chegada ? new Date(ultimoRegisto.data_chegada).toLocaleString() : 'Em curso'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">KM PERCORRIDOS</span>
                <span className="text-slate-200">
                  {ultimoRegisto.km_final ? `${ultimoRegisto.km_final - ultimoRegisto.km_inicial} km` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">COMBUSTÍVEL FECHO</span>
                <span className="text-amber-400 font-bold">{ultimoRegisto.nivel_combustivel || 'N/D'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Direct Notification Dispatch Form */}
      <form onSubmit={handleEnviarNotificacao} className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
          <Mail className="w-4 h-4" />
          <span>Enviar Notificação Formal por Inconformidade ao Último Utilizador</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">NIP do Destinatário *</label>
            <input
              type="text"
              required
              value={nipDest}
              onChange={(e) => setNipDest(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Email do Destinatário *</label>
            <input
              type="email"
              required
              value={emailDest}
              onChange={(e) => setEmailDest(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-400 mb-1">Assunto / Motivo *</label>
            <input
              type="text"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-400 mb-1">Mensagem Formal de Responsabilidade *</label>
            <textarea
              required
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSending}
            className="flex-1 py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950 flex items-center justify-center space-x-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'A registar notificação...' : 'Registar Notificação no Sistema'}</span>
          </button>

          <a
            href={`mailto:${emailDest || 'militar@emfa.gov.pt'}?subject=${encodeURIComponent(motivo)}&body=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-950 flex items-center justify-center space-x-2 transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>Abrir Cliente de Email (@emfa.gov.pt) ✉️</span>
          </a>
        </div>
      </form>
    </div>
  );
}
