'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, FileText, User, Mail, Shield, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { getStoredMilitaryProfile, saveMilitaryProfile, MilitaryProfile, POSTOS_FORCA_AEREA, saveStoredPedido } from '@/lib/utils/cookies';
import { supabase, Pedido } from '@/lib/supabase/client';

export default function PedidoPage() {
  const [profile, setProfile] = useState<MilitaryProfile>({
    nip: '',
    nome: '',
    posto: 'Tenente',
    email: ''
  });

  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [necessitaReboque, setNecessitaReboque] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const stored = getStoredMilitaryProfile();
    setProfile(stored);

    // Set default dates (Now -> Now + 1 hour)
    const now = new Date();
    const future = new Date(now.getTime() + 1 * 3600000);
    setDataInicio(now.toISOString().slice(0, 16));
    setDataFim(future.toISOString().slice(0, 16));
  }, []);

  const handleDataInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDataInicio(val);

    if (val) {
      const startDate = new Date(val);
      if (!isNaN(startDate.getTime())) {
        const autoEnd = new Date(startDate.getTime() + 1 * 3600000);
        setDataFim(autoEnd.toISOString().slice(0, 16));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (!profile.nip || !profile.nome || !profile.email || !destino || !motivo) {
      setErrorMessage('Por favor preencha todos os campos obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    // 1. Update stored profile cookie
    saveMilitaryProfile(profile);

    // 2. Insert request into Supabase Database and Local Storage
    try {
      const payload = {
        nome_utilizador: profile.nome,
        nip: profile.nip,
        posto: profile.posto,
        email: profile.email,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        destino,
        motivo,
        necessita_reboque: necessitaReboque,
        estado_pedido: 'PENDENTE'
      };

      const { data, error } = await supabase.from('pedidos').insert([payload]).select();

      const createdPedido = data && data.length > 0 ? data[0] : {
        id: `ped-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString()
      };

      // Save into local storage for immediate persistence
      saveStoredPedido(createdPedido);

      // 3. Trigger confirmation email via API Route
      try {
        await fetch('/api/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'CONFIRMACAO_PEDIDO',
            emailDestinatario: profile.email,
            nip: profile.nip,
            nome: profile.nome,
            destino,
            dataInicio,
            dataFim,
            necessitaReboque
          })
        });
      } catch (emailErr) {
        console.warn('Aviso ao enviar email:', emailErr);
      }

      setSubmittedSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao submeter o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wider">
            Pedido de Viatura Submetido com Sucesso
          </h1>
          <p className="text-slate-300 text-sm max-w-lg mx-auto">
            O pedido da Esquadra 991 deu entrada no sistema com estado <span className="font-bold text-amber-400">PENDENTE</span>.
            Foi enviado um email de confirmação para <span className="text-emerald-400 font-mono">{profile.email}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800 text-left text-xs font-mono space-y-2 max-w-md mx-auto">
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-400">Requerente:</span>
            <span className="text-slate-200">{profile.posto} {profile.nome} [{profile.nip}]</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-400">Destino:</span>
            <span className="text-slate-200">{destino}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-400">Necessita Reboque:</span>
            <span className={necessitaReboque ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              {necessitaReboque ? 'SIM' : 'NÃO'}
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`mailto:${profile.email || 'logistica.eq991@emfa.pt'}?subject=${encodeURIComponent(
              `Esquadra 991 - Confirmação de Reserva [${destino}]`
            )}&body=${encodeURIComponent(
              `Exmo. Militar ${profile.posto} ${profile.nome} [NIP ${profile.nip}],\n\nConfirmamos a entrada do seu pedido de reserva para o destino ${destino} com o estado PENDENTE.\n\nPeríodo: ${new Date(dataInicio).toLocaleString()} até ${new Date(dataFim).toLocaleString()}\nMotivo: ${motivo}\n\nLogística Esquadra 991`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Abrir / Enviar Email no Seu Cliente</span>
          </a>

          <button
            onClick={() => setSubmittedSuccess(false)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
          >
            Submeter Novo Pedido
          </button>
          <a
            href="/recomendada"
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950 transition-colors"
          >
            Ver Frota Disponível
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Pedido de Viatura / Reboque
            </h1>
            <p className="text-xs text-slate-400">
              Formulário público sem necessidade de login. Os seus dados ficam guardados no dispositivo.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Military Identification */}
        <div className="p-5 rounded-xl glass-panel space-y-4">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Identificação do Militar Condutor</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">NIP *</label>
              <input
                type="text"
                required
                value={profile.nip}
                onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ex: 134890-A"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Clique para selecionar e editar se for outro militar.</p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-xs">Posto / Graduação *</label>
              <select
                value={profile.posto}
                onChange={(e) => setProfile({ ...profile, posto: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              >
                {POSTOS_FORCA_AEREA.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={profile.nome}
                onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ex: Manuel Silva"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Email Institucional *</label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ex: silva@emfa.pt"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Service Details */}
        <div className="p-5 rounded-xl glass-panel space-y-4">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Datas e Detalhes do Serviço</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Saída Prevista *</label>
              <input
                type="datetime-local"
                required
                value={dataInicio}
                onChange={handleDataInicioChange}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Regresso Previsto *</label>
              <input
                type="datetime-local"
                required
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Destino *</label>
              <input
                type="text"
                required
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ex: Base Aérea Nº 1 - Sintra / Hangar de Manutenção"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Motivo do Serviço *</label>
              <textarea
                required
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva resumidamente a missão ou tarefa logística..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Trailer Option & Requirements */}
        <div className="p-5 rounded-xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase">Necessita de Reboque?</h2>
                <p className="text-xs text-slate-400">
                  Ao ativar, será notificada automaticamente a equipa de manutenção de reboques.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNecessitaReboque(!necessitaReboque)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                necessitaReboque
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {necessitaReboque ? 'SIM (REBOQUE ATIVO)' : 'NÃO'}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wider uppercase shadow-xl shadow-emerald-950 flex items-center justify-center space-x-2 transition-all"
        >
          <Shield className="w-5 h-5" />
          <span>{isSubmitting ? 'A submeter pedido...' : 'Submeter Pedido de Viatura'}</span>
        </button>
      </form>
    </div>
  );
}
