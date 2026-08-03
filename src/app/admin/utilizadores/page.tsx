'use client';

import React, { useState, useEffect } from 'react';
import { User, Shield, Mail, KeyRound, Plus, Edit2, Trash2, Send, CheckCircle2, AlertTriangle, RefreshCw, Badge } from 'lucide-react';
import { supabase, UtilizadorLogistica } from '@/lib/supabase/client';
import { MOCK_UTILIZADORES_LOGISTICA } from '@/lib/mock-data';
import { POSTOS_FORCA_AEREA, getStoredUtilizadores, saveStoredUtilizadores } from '@/lib/utils/cookies';

export default function GestaoUtilizadoresPage() {
  const [utilizadores, setUtilizadores] = useState<UtilizadorLogistica[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome, setNome] = useState<string>('');
  const [posto, setPosto] = useState<string>('Tenente');
  const [especialidade, setEspecialidade] = useState<string>('MELECA');
  const [email, setEmail] = useState<string>('');
  const [trigrama, setTrigrama] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const stored = getStoredUtilizadores();
      if (stored && stored.length > 0) {
        setUtilizadores(stored);
      } else {
        const { data } = await supabase.from('utilizadores_logistica').select('*').order('created_at', { ascending: true });
        const list = data && data.length > 0 ? data : MOCK_UTILIZADORES_LOGISTICA;
        setUtilizadores(list);
        saveStoredUtilizadores(list);
      }
    } catch (err) {
      console.error(err);
      const stored = getStoredUtilizadores();
      setUtilizadores(stored.length > 0 ? stored : MOCK_UTILIZADORES_LOGISTICA);
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate 3-letter uppercase trigram from Name
  const handleNomeChange = (val: string) => {
    setNome(val);
    if (!isEditing && val) {
      const parts = val.trim().split(' ');
      if (parts.length >= 2) {
        const tri = (parts[0][0] + parts[1].slice(0, 2)).toUpperCase();
        setTrigrama(tri);
      } else if (val.length >= 3) {
        setTrigrama(val.slice(0, 3).toUpperCase());
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setNome('');
    setPosto('Tenente');
    setEspecialidade('MELECA');
    setEmail('');
    setTrigrama('');
    setErrorMsg('');
  };

  const handleEditClick = (u: UtilizadorLogistica) => {
    setIsEditing(true);
    setEditingId(u.id);
    setNome(u.nome);
    setPosto(u.posto);
    setEspecialidade(u.especialidade);
    setEmail(u.email);
    setTrigrama(u.trigrama);
  };

  const handleSalvarUtilizador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nome || !email || !trigrama) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios (Nome, Email, Trigrama).');
      return;
    }

    const triClean = trigrama.trim().toUpperCase();

    if (triClean.length !== 3) {
      setErrorMsg('O Trigrama deve ter exatamente 3 letras (Ex: OLV, SIL, FER).');
      return;
    }

    setIsSubmitting(true);

    try {
      let updatedList: UtilizadorLogistica[] = [];

      if (isEditing && editingId) {
        const payload = {
          nome,
          posto,
          especialidade,
          email,
          trigrama: triClean
        };

        const { error } = await supabase.from('utilizadores_logistica').update(payload).eq('id', editingId);
        if (error) console.warn('Fallback update:', error.message);

        updatedList = utilizadores.map((u) => (u.id === editingId ? { ...u, ...payload } : u));
        setSuccessMsg(`Utilizador ${nome} [Trigrama: ${triClean}] atualizado com sucesso!`);
      } else {
        const newPayload = {
          nome,
          posto,
          especialidade,
          email,
          trigrama: triClean,
          is_ativo: true
        };

        const { data, error } = await supabase.from('utilizadores_logistica').insert([newPayload]).select();
        const createdU: UtilizadorLogistica = data && data.length > 0 ? data[0] : { id: `user-${Date.now()}`, ...newPayload };

        updatedList = [...utilizadores, createdU];
        setSuccessMsg(`Novo utilizador de logística ${nome} [Trigrama: ${triClean}] criado com sucesso!`);
      }

      setUtilizadores(updatedList);
      saveStoredUtilizadores(updatedList);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao guardar utilizador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnviarResetPassword = async (u: UtilizadorLogistica) => {
    setSendingResetId(u.id);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'RESET_PASSWORD_TRIGRAMA',
          emailDestinatario: u.email,
          nome: u.nome,
          posto: u.posto,
          trigrama: u.trigrama
        })
      });

      setSuccessMsg(`Email de redefinição de palavra-passe enviado para ${u.email} (Trigrama: ${u.trigrama}).`);
    } catch (err: any) {
      setErrorMsg('Erro ao enviar email de reset de palavra-passe.');
    } finally {
      setSendingResetId(null);
    }
  };

  const handleApagarUtilizador = async (id: string, name: string, tri: string) => {
    if (!confirm(`Tem a certeza que deseja APAGAR o gestor de logística ${name} [${tri}]?`)) {
      return;
    }

    try {
      await supabase.from('utilizadores_logistica').delete().eq('id', id);
      const updatedList = utilizadores.filter((u) => u.id !== id);
      setUtilizadores(updatedList);
      saveStoredUtilizadores(updatedList);
      setSuccessMsg(`Utilizador [${tri}] apagado com sucesso.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Gestão de Utilizadores da Logística (Trigramas)
            </h1>
            <p className="text-xs text-slate-400">
              Registe administradores com Nome, Posto, Especialidade, Email e Trigrama (Username de Login).
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form: Create/Edit Logistics User */}
      <form onSubmit={handleSalvarUtilizador} className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>{isEditing ? `Editar Utilizador [${trigrama}]` : 'Registar Novo Gestor de Logística'}</span>
          </h2>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white font-mono underline"
            >
              Cancelar Edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => handleNomeChange(e.target.value)}
              placeholder="Ex: Manuel Oliveira"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Posto / Graduação *</label>
                  <select
                    value={posto}
                    onChange={(e) => setPosto(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                  >
                    {POSTOS_FORCA_AEREA.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

          <div>
            <label className="block text-slate-400 mb-1">Especialidade *</label>
            <input
              type="text"
              required
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value.toUpperCase())}
              placeholder="Ex: MELECA / MELIA / LOGISTICA"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Email Institucional *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: oliveira@emfa.pt"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Trigrama (Username de Login) *</label>
            <input
              type="text"
              required
              maxLength={3}
              value={trigrama}
              onChange={(e) => setTrigrama(e.target.value.toUpperCase())}
              placeholder="Ex: OLV"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-500/50 text-emerald-400 font-mono font-black text-sm uppercase"
            />
            <p className="text-[10px] text-slate-500 mt-1">Código de 3 letras utilizado como nome de utilizador para login.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all"
        >
          <User className="w-4 h-4" />
          <span>{isEditing ? 'Guardar Alterações do Utilizador' : 'Registar Utilizador de Logística'}</span>
        </button>
      </form>

      {/* Users Inventory List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Utilizadores Registados na Logística ({utilizadores.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {utilizadores.map((u) => (
            <div key={u.id} className="p-4 rounded-xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 font-mono font-black text-sm border border-emerald-500/40">
                    [{u.trigrama}]
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono font-bold">
                    {u.especialidade}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">● ATIVO</span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100">{u.posto} {u.nome}</h4>
                <p className="text-xs font-mono text-slate-400">{u.email}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <button
                  onClick={() => handleEnviarResetPassword(u)}
                  disabled={sendingResetId === u.id}
                  className="w-full py-1.5 px-3 rounded bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingResetId === u.id ? 'A enviar reset...' : '📧 Enviar Reset de Palavra-passe'}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => handleEditClick(u)}
                    className="text-slate-400 hover:text-white font-mono flex items-center space-x-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleApagarUtilizador(u.id, u.nome, u.trigrama)}
                    className="text-rose-400 hover:text-rose-300 font-mono flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Apagar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
