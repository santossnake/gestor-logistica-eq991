'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Key, Plus, CheckCircle2, Shield, Trash2 } from 'lucide-react';
import { supabase, LocalItem } from '@/lib/supabase/client';
import { MOCK_LOCAIS } from '@/lib/mock-data';

export default function LocaisAdminPage() {
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [novoNome, setNovoNome] = useState<string>('');
  const [novoTipo, setNovoTipo] = useState<'VIATURA' | 'CHAVE'>('VIATURA');
  const [isPredefinido, setIsPredefinido] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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

  const handleCriarLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome) return;

    try {
      // If marking as pre-defined, unset pre-defined on others of same type
      if (isPredefinido) {
        await supabase.from('locais').update({ is_predefinido: false }).eq('tipo', novoTipo);
      }

      const payload = {
        nome: novoNome,
        tipo: novoTipo,
        is_predefinido: isPredefinido,
        is_ativo: true
      };

      const { data } = await supabase.from('locais').insert([payload]).select();
      const newLoc = data && data.length > 0 ? data[0] : { id: `loc-${Date.now()}`, ...payload };

      setLocais([...locais.map((l) => (isPredefinido && l.tipo === novoTipo ? { ...l, is_predefinido: false } : l)), newLoc]);
      setNovoNome('');
      setIsPredefinido(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAtivo = async (id: string, currentAtivo: boolean) => {
    try {
      await supabase.from('locais').update({ is_ativo: !currentAtivo }).eq('id', id);
      setLocais(locais.map((l) => (l.id === id ? { ...l, is_ativo: !currentAtivo } : l)));
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
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Gestão Dinâmica de Locais (Estacionamento / Chaves)
            </h1>
            <p className="text-xs text-slate-400">
              Adicione e gira os locais de parqueamento e depósitos de chaves da Esquadra 991.
            </p>
          </div>
        </div>
      </div>

      {/* Form: Add New Location */}
      <form onSubmit={handleCriarLocal} className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Adicionar Novo Local</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Nome do Local *</label>
            <input
              type="text"
              required
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Hangar 3 / Chaveiro Oficinas"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Tipo de Local *</label>
            <select
              value={novoTipo}
              onChange={(e: any) => setNovoTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            >
              <option value="VIATURA">Estacionamento de Viatura</option>
              <option value="CHAVE">Depósito / Chaveiro de Chave</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isPredefinido}
                onChange={(e) => setIsPredefinido(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500"
              />
              <span>Definir como Local Pré-definido</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-950 transition-colors"
        >
          Adicionar Local
        </button>
      </form>

      {/* Locations List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Parking lots */}
        <div className="p-5 rounded-2xl glass-panel space-y-3 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Locais de Estacionamento de Viaturas</span>
          </h3>

          <div className="space-y-2">
            {locais
              .filter((l) => l.tipo === 'VIATURA')
              .map((l) => (
                <div key={l.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="space-x-2">
                    <span className="text-slate-100 font-bold">{l.nome}</span>
                    {l.is_predefinido && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                        PRÉ-DEFINIDO
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAtivo(l.id, l.is_ativo)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      l.is_ativo ? 'bg-emerald-600/30 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {l.is_ativo ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Key depositories */}
        <div className="p-5 rounded-2xl glass-panel space-y-3 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Chaveiros e Locais de Chaves</span>
          </h3>

          <div className="space-y-2">
            {locais
              .filter((l) => l.tipo === 'CHAVE')
              .map((l) => (
                <div key={l.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="space-x-2">
                    <span className="text-slate-100 font-bold">{l.nome}</span>
                    {l.is_predefinido && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                        PRÉ-DEFINIDO
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAtivo(l.id, l.is_ativo)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      l.is_ativo ? 'bg-emerald-600/30 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {l.is_ativo ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
