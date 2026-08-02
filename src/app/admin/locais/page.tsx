'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Key, Plus, CheckCircle2, Shield, Trash2, Edit2, Sparkles, AlertCircle } from 'lucide-react';
import { supabase, LocalItem } from '@/lib/supabase/client';
import { MOCK_LOCAIS } from '@/lib/mock-data';

export default function LocaisAdminPage() {
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states for Add / Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeInput, setNomeInput] = useState<string>('');
  const [tipoInput, setTipoInput] = useState<'VIATURA' | 'CHAVE'>('VIATURA');
  const [isPredefinidoInput, setIsPredefinidoInput] = useState<boolean>(false);

  // Modal open status
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    async function fetchLocais() {
      try {
        const { data } = await supabase.from('locais').select('*').order('created_at', { ascending: true });
        setLocais(data && data.length > 0 ? data : MOCK_LOCAIS);
      } catch (err) {
        console.error(err);
        setLocais(MOCK_LOCAIS);
      } finally {
        setLoading(false);
      }
    }
    fetchLocais();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNomeInput('');
    setTipoInput('VIATURA');
    setIsPredefinidoInput(false);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: LocalItem) => {
    setEditingId(item.id);
    setNomeInput(item.nome);
    setTipoInput(item.tipo);
    setIsPredefinidoInput(item.is_predefinido || false);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeInput.trim()) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      // If setting as predefinido, unset on other items of same type
      if (isPredefinidoInput) {
        await supabase.from('locais').update({ is_predefinido: false }).eq('tipo', tipoInput);
      }

      if (editingId) {
        // EDIT existing location
        const payload = {
          nome: nomeInput.trim(),
          tipo: tipoInput,
          is_predefinido: isPredefinidoInput
        };

        await supabase.from('locais').update(payload).eq('id', editingId);

        setLocais((prev) =>
          prev.map((l) => {
            if (l.id === editingId) {
              return { ...l, ...payload };
            }
            if (isPredefinidoInput && l.tipo === tipoInput) {
              return { ...l, is_predefinido: false };
            }
            return l;
          })
        );

        setSuccessMsg(`Local "${nomeInput}" atualizado com sucesso!`);
      } else {
        // CREATE new location
        const payload = {
          nome: nomeInput.trim(),
          tipo: tipoInput,
          is_predefinido: isPredefinidoInput,
          is_ativo: true
        };

        const { data } = await supabase.from('locais').insert([payload]).select();
        const created = data && data.length > 0 ? data[0] : { id: `loc-${Date.now()}`, ...payload };

        setLocais((prev) => [
          ...prev.map((l) => (isPredefinidoInput && l.tipo === tipoInput ? { ...l, is_predefinido: false } : l)),
          created
        ]);

        setSuccessMsg(`Novo local "${nomeInput}" adicionado com sucesso!`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao guardar local.');
    }
  };

  const handleApagarLocal = async (id: string, nome: string) => {
    if (!confirm(`Tem a certeza que deseja apagar o local "${nome}"?`)) return;

    try {
      await supabase.from('locais').delete().eq('id', id);
      setLocais((prev) => prev.filter((l) => l.id !== id));
      setSuccessMsg(`Local "${nome}" removido com sucesso.`);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAtivo = async (id: string, currentAtivo: boolean) => {
    try {
      await supabase.from('locais').update({ is_ativo: !currentAtivo }).eq('id', id);
      setLocais((prev) => prev.map((l) => (l.id === id ? { ...l, is_ativo: !currentAtivo } : l)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Gestão de Locais (Estacionamento & Chaveiros)
            </h1>
            <p className="text-xs text-slate-400">
              Adicione, edite ou remova os locais de parqueamento e depósitos de chaves da Esquadra 991.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Local</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Locations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PARKING LOCATIONS */}
        <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Locais de Estacionamento ({locais.filter((l) => l.tipo === 'VIATURA').length})</span>
            </h2>
          </div>

          <div className="space-y-2.5">
            {locais
              .filter((l) => l.tipo === 'VIATURA')
              .map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono transition-all hover:border-slate-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-100 font-bold">{l.nome}</span>
                      {l.is_predefinido && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          PREDEFINIDO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleAtivo(l.id, l.is_ativo)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                        l.is_ativo ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {l.is_ativo ? 'ATIVO' : 'INATIVO'}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(l)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                      title="Editar Local"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleApagarLocal(l.id, l.nome)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800"
                      title="Apagar Local"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* KEY CABINET LOCATIONS */}
        <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Chaveiros e Depósitos ({locais.filter((l) => l.tipo === 'CHAVE').length})</span>
            </h2>
          </div>

          <div className="space-y-2.5">
            {locais
              .filter((l) => l.tipo === 'CHAVE')
              .map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono transition-all hover:border-slate-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-100 font-bold">{l.nome}</span>
                      {l.is_predefinido && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                          PREDEFINIDO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleAtivo(l.id, l.is_ativo)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                        l.is_ativo ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {l.is_ativo ? 'ATIVO' : 'INATIVO'}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(l)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                      title="Editar Local"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleApagarLocal(l.id, l.nome)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800"
                      title="Apagar Local"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              {editingId ? 'Editar Local' : 'Adicionar Novo Local'}
            </h2>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveLocal} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nome do Local *</label>
                <input
                  type="text"
                  required
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  placeholder="Ex: Hangar 6, Oficial de Dia, Telheiro 991"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tipo de Local *</label>
                <select
                  value={tipoInput}
                  onChange={(e: any) => setTipoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
                >
                  <option value="VIATURA">Estacionamento de Viatura</option>
                  <option value="CHAVE">Depósito / Chaveiro de Chave</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <label className="flex items-center space-x-2 text-slate-200 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={isPredefinidoInput}
                    onChange={(e) => setIsPredefinidoInput(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Definir como Local Predefinido</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase"
                >
                  Guardar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
