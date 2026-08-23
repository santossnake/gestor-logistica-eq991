'use client';

import React, { useState, useEffect } from 'react';
import { User, Shield, Mail, KeyRound, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Badge } from 'lucide-react';
import { supabase, isSupabaseConfigured, UtilizadorLogistica } from '@/lib/supabase/client';
import { MOCK_UTILIZADORES_LOGISTICA } from '@/lib/mock-data';
import { POSTOS_FORCA_AEREA, getStoredUtilizadores, saveStoredUtilizadores, logAuditAction } from '@/lib/utils/cookies';

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
  const [password, setPassword] = useState<string>('123456');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('utilizadores_logistica').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          setUtilizadores(data);
          saveStoredUtilizadores(data);
          return;
        }
      }
      const stored = getStoredUtilizadores();
      setUtilizadores(stored);
    } catch (err) {
      console.warn('Supabase não disponível, a carregar utilizadores guardados:', err);
      const stored = getStoredUtilizadores();
      setUtilizadores(stored);
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
    setPassword('123456');
    setErrorMsg('');
  };

  const handleEditClick = (u: UtilizadorLogistica) => {
    setIsEditing(true);
    setEditingId(u.id);
    setNome(u.nome);
    setPosto(u.posto || 'Tenente');
    setEspecialidade(u.especialidade || 'MELECA');
    setEmail(u.email);
    setTrigrama(u.trigrama);
    setPassword(u.password || '123456');
    setErrorMsg('');
    setSuccessMsg('');
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

    const userPass = password.trim() || '123456';
    setIsSubmitting(true);

    try {
      let updatedList: UtilizadorLogistica[] = [];

      if (isEditing && editingId) {
        const payloadWithPass = {
          nome,
          posto,
          especialidade,
          email,
          trigrama: triClean,
          password: userPass
        };

        const payloadNoPass = {
          nome,
          posto,
          especialidade,
          email,
          trigrama: triClean
        };

        if (isSupabaseConfigured()) {
          try {
            let { error } = await supabase.from('utilizadores_logistica').update(payloadWithPass).eq('id', editingId);
            if (error && error.message.includes('password')) {
              await supabase.from('utilizadores_logistica').update(payloadNoPass).eq('id', editingId);
            }
          } catch (netErr: any) {
            console.warn('Erro de rede ao comunicar com Supabase:', netErr);
          }
        }

        updatedList = utilizadores.map((u) => (u.id === editingId ? { ...u, ...payloadWithPass } : u));
        setSuccessMsg(`Utilizador ${nome} [Trigrama: ${triClean}] atualizado com sucesso!`);

        logAuditAction(
          'UTILIZADORES',
          'Alteração de Palavra-Passe / Perfil',
          `Alterou os dados/palavra-passe do gestor de logística [${triClean}] ${nome}.`
        );
      } else {
        const newPayloadWithPass = {
          nome,
          posto,
          especialidade,
          email,
          trigrama: triClean,
          password: userPass,
          is_ativo: true
        };

        const newPayloadNoPass = {
          nome,
          posto,
          especialidade,
          email,
          trigrama: triClean,
          is_ativo: true
        };

        let createdItemFromDb: any = null;

        if (isSupabaseConfigured()) {
          try {
            let { data, error } = await supabase.from('utilizadores_logistica').insert([newPayloadWithPass]).select();
            if (error && error.message.includes('password')) {
              const retry = await supabase.from('utilizadores_logistica').insert([newPayloadNoPass]).select();
              data = retry.data;
            }
            if (data && data.length > 0) createdItemFromDb = data[0];
          } catch (netErr: any) {
            console.warn('Erro de rede ao comunicar com Supabase:', netErr);
          }
        }

        const createdU: UtilizadorLogistica = createdItemFromDb || { id: `user-${Date.now()}`, ...newPayloadWithPass };
        updatedList = [...utilizadores.filter((u) => u.id !== createdU.id), createdU];
        setSuccessMsg(`Novo utilizador de logística ${nome} [Trigrama: ${triClean}] criado com sucesso!`);

        logAuditAction(
          'UTILIZADORES',
          'Criação de Gestor de Logística',
          `Criou o utilizador [${triClean}] ${nome} com a palavra-passe "${userPass}".`
        );
      }

      setUtilizadores(updatedList);
      saveStoredUtilizadores(updatedList);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao guardar utilizador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApagarUtilizador = async (id: string, name: string, tri: string) => {
    if (!confirm(`Tem a certeza que deseja APAGAR o gestor de logística ${name} [${tri}]?`)) {
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('utilizadores_logistica').delete().eq('id', id);
        } catch (netErr: any) {
          console.warn('Erro de rede ao apagar no Supabase:', netErr);
        }
      }

      const updatedList = utilizadores.filter((u) => u.id !== id);
      setUtilizadores(updatedList);
      saveStoredUtilizadores(updatedList);
      setSuccessMsg(`Utilizador [${tri}] apagado com sucesso.`);

      logAuditAction(
        'UTILIZADORES',
        'Eliminação de Gestor de Logística',
        `Eliminou permanentemente o utilizador [${tri}] ${name}.`
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const toggleStatus = async (u: UtilizadorLogistica) => {
    try {
      const newStatus = !u.is_ativo;

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('utilizadores_logistica').update({ is_ativo: newStatus }).eq('id', u.id);
        } catch (netErr: any) {
          console.warn('Erro de rede ao atualizar estado no Supabase:', netErr);
        }
      }

      const updatedList = utilizadores.map((item) => (item.id === u.id ? { ...item, is_ativo: newStatus } : item));
      setUtilizadores(updatedList);
      saveStoredUtilizadores(updatedList);

      logAuditAction(
        'UTILIZADORES',
        'Alteração de Estado de Acesso',
        `${newStatus ? 'Ativou' : 'Desativou'} o acesso do utilizador [${u.trigrama}] ${u.nome}.`
      );
    } catch (err: any) {
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
              Gestão de Utilizadores da Logística & Palavras-passe
            </h1>
            <p className="text-xs text-slate-400">
              Gerir gestores de logística, Trigramas e alterar palavras-passe (Password por defeito: 123456).
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
            <span>{isEditing ? `Editar Utilizador [${trigrama}] & Alterar Password` : 'Registar Novo Gestor de Logística'}</span>
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
            <label className="block text-slate-400 mb-1">Trigrama (Username) *</label>
            <input
              type="text"
              required
              maxLength={3}
              value={trigrama}
              onChange={(e) => setTrigrama(e.target.value.toUpperCase())}
              placeholder="Ex: OLV"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-500/50 text-emerald-400 font-mono font-black text-sm uppercase"
            />
          </div>

          <div>
            <label className="block text-amber-300 font-semibold mb-1">Palavra-passe de Acesso *</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/60 text-amber-300 font-mono font-bold text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-1">Por defeito é 123456. Editável por qualquer gestor.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all"
        >
          <User className="w-4 h-4" />
          <span>{isEditing ? 'Guardar Alterações & Nova Password' : 'Registar Utilizador & Palavra-passe'}</span>
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

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleEditClick(u)}
                  className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center space-x-1 font-bold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar / Mudar Password</span>
                </button>

                <button
                  onClick={() => handleApagarUtilizador(u.id, u.nome, u.trigrama)}
                  className="text-rose-400 hover:text-rose-300 font-mono flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Apagar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
