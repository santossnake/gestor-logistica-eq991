'use client';

import React, { useState, useEffect } from 'react';
import { Car, Plus, Trash2, Edit2, Shield, Truck, CheckCircle2, AlertTriangle, Sparkles, Key } from 'lucide-react';
import { supabase, Viatura } from '@/lib/supabase/client';
import { MOCK_VIATURAS } from '@/lib/mock-data';

export default function GestaoViaturasPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states for NEW / EDIT vehicle
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [matricula, setMatricula] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [numLugares, setNumLugares] = useState<number>(5);
  const [temGanchoReboque, setTemGanchoReboque] = useState<boolean>(false);
  const [kmAtuais, setKmAtuais] = useState<number>(0);
  const [estado, setEstado] = useState<'DISPONIVEL' | 'EM_USO' | 'EMPRESTADA_EXTERNO' | 'MANUTENCAO'>('DISPONIVEL');
  const [qrToken, setQrToken] = useState<string>('');
  const [isForcadaRecomendada, setIsForcadaRecomendada] = useState<boolean>(false);
  const [kmProximaRevisao, setKmProximaRevisao] = useState<number>(100000);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadFleet();
  }, []);

  async function loadFleet() {
    try {
      const { data } = await supabase.from('viaturas').select('*').order('created_at', { ascending: true });
      const list = data && data.length > 0 ? data : MOCK_VIATURAS;
      setViaturas(list);
    } catch (err) {
      console.error(err);
      setViaturas(MOCK_VIATURAS);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setMatricula('');
    setModelo('');
    setNumLugares(5);
    setTemGanchoReboque(false);
    setKmAtuais(0);
    setEstado('DISPONIVEL');
    setQrToken(`VTR-991-0${viaturas.length + 1}`);
    setIsForcadaRecomendada(false);
    setKmProximaRevisao(50000);
    setErrorMsg('');
  };

  const handleEditClick = (v: Viatura) => {
    setIsEditing(true);
    setEditingId(v.id);
    setMatricula(v.matricula);
    setModelo(v.modelo);
    setNumLugares(v.num_lugares);
    setTemGanchoReboque(v.tem_gancho_reboque);
    setKmAtuais(v.km_atuais);
    setEstado(v.estado);
    setQrToken(v.qr_code_token);
    setIsForcadaRecomendada(v.is_forcada_recomendada || false);
    setKmProximaRevisao(v.km_proxima_revisao || 100000);
  };

  const handleSalvarViatura = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!matricula || !modelo || !qrToken) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios (Matrícula, Modelo, Token NFC).');
      return;
    }

    try {
      // If forcing recommendation, unforce recommendation on all other vehicles
      if (isForcadaRecomendada) {
        await supabase.from('viaturas').update({ is_forcada_recomendada: false }).neq('id', editingId || '');
      }

      if (isEditing && editingId) {
        // UPDATE existing vehicle
        const payload = {
          matricula,
          modelo,
          num_lugares: numLugares,
          tem_gancho_reboque: temGanchoReboque,
          km_atuais: kmAtuais,
          estado,
          qr_code_token: qrToken,
          is_forcada_recomendada: isForcadaRecomendada,
          km_proxima_revisao: kmProximaRevisao
        };

        const { error } = await supabase.from('viaturas').update(payload).eq('id', editingId);
        if (error) console.warn('Fallback local update:', error.message);

        setViaturas(
          viaturas.map((v) =>
            v.id === editingId
              ? { ...v, ...payload }
              : isForcadaRecomendada
              ? { ...v, is_forcada_recomendada: false }
              : v
          )
        );
        setSuccessMsg(`Viatura ${matricula} atualizada com sucesso!`);
      } else {
        // CREATE new vehicle
        const newPayload = {
          matricula,
          modelo,
          num_lugares: numLugares,
          tem_gancho_reboque: temGanchoReboque,
          km_atuais: kmAtuais,
          estado,
          localizacao_atual_viatura: 'Parque Principal EQ991',
          localizacao_atual_chave: 'Chaveiro Principal - Armário A',
          qr_code_token: qrToken,
          is_forcada_recomendada: isForcadaRecomendada,
          km_proxima_revisao: kmProximaRevisao
        };

        const { data, error } = await supabase.from('viaturas').insert([newPayload]).select();
        const createdV: Viatura = data && data.length > 0 ? data[0] : { id: `vtr-${Date.now()}`, ...newPayload };

        setViaturas([
          ...viaturas.map((v) => (isForcadaRecomendada ? { ...v, is_forcada_recomendada: false } : v)),
          createdV
        ]);
        setSuccessMsg(`Nova viatura ${matricula} adicionada à frota da Esquadra 991!`);
      }

      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao guardar viatura.');
    }
  };

  const handleApagarViatura = async (id: string, mat: string) => {
    if (!confirm(`Tem a certeza que deseja APAGAR definitivamente a viatura ${mat} da frota?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('viaturas').delete().eq('id', id);
      if (error) console.warn('Fallback delete local:', error.message);

      setViaturas(viaturas.filter((v) => v.id !== id));
      setSuccessMsg(`Viatura ${mat} apagada do sistema.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao apagar viatura.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Gestão de Frota: Criar, Editar e Apagar Viaturas
            </h1>
            <p className="text-xs text-slate-400">
              Adicione novas viaturas à Esquadra 991, configure tokens de NFC/QR Code e retire viaturas abate.
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

      {/* Form: Add / Edit Vehicle */}
      <form onSubmit={handleSalvarViatura} className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>{isEditing ? `Editar Viatura [${matricula}]` : 'Adicionar Nova Viatura à Frota'}</span>
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
            <label className="block text-slate-400 mb-1">Matrícula (FAP / Civil) *</label>
            <input
              type="text"
              required
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex: 69-FA-99"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Modelo da Viatura *</label>
            <input
              type="text"
              required
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ex: Toyota Hilux 4x4 D-Cab"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Token NFC / QR Code *</label>
            <input
              type="text"
              required
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Ex: VTR-991-05"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Nº de Lugares *</label>
            <input
              type="number"
              required
              min={1}
              max={60}
              value={numLugares}
              onChange={(e) => setNumLugares(parseInt(e.target.value, 10) || 5)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Odómetro Atual (KM) *</label>
            <input
              type="number"
              required
              value={kmAtuais}
              onChange={(e) => setKmAtuais(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">KM Próxima Revisão *</label>
            <input
              type="number"
              required
              value={kmProximaRevisao}
              onChange={(e) => setKmProximaRevisao(parseInt(e.target.value, 10) || 100000)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Estado Operacional *</label>
            <select
              value={estado}
              onChange={(e: any) => setEstado(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            >
              <option value="DISPONIVEL">DISPONIVEL</option>
              <option value="EM_USO">EM_USO</option>
              <option value="EMPRESTADA_EXTERNO">EMPRESTADA_EXTERNO</option>
              <option value="MANUTENCAO">MANUTENCAO</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-5">
            <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={temGanchoReboque}
                onChange={(e) => setTemGanchoReboque(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 w-4 h-4"
              />
              <span className="font-semibold text-xs">Tem Gancho de Reboque</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-5">
            <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isForcadaRecomendada}
                onChange={(e) => setIsForcadaRecomendada(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 w-4 h-4"
              />
              <span className="font-semibold text-xs text-emerald-400">Forçar Recomendada Prioritária</span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 transition-colors"
          >
            {isEditing ? 'Guardar Alterações da Viatura' : 'Adicionar Viatura à Frota'}
          </button>
        </div>
      </form>

      {/* Fleet Inventory Cards List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Inventário Atual de Viaturas ({viaturas.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {viaturas.map((v) => (
            <div key={v.id} className="p-4 rounded-xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-lg text-white">{v.matricula}</span>
                  {v.is_forcada_recomendada && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 font-bold">
                      <Sparkles className="w-3 h-3" />
                      <span>PRIORITÁRIA</span>
                    </span>
                  )}
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    v.estado === 'DISPONIVEL'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : v.estado === 'EM_USO'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {v.estado}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-300">{v.modelo}</p>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800">
                <div>
                  <span className="text-slate-500 block">KM ATUAIS</span>
                  <span className="text-emerald-400 font-bold">{v.km_atuais.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">LUGARES</span>
                  <span className="text-slate-200">{v.num_lugares}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">REBOQUE</span>
                  <span className={v.tem_gancho_reboque ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                    {v.tem_gancho_reboque ? 'SIM' : 'NÃO'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="font-mono text-[11px] text-slate-400">Token NFC: {v.qr_code_token}</span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditClick(v)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleApagarViatura(v.id, v.matricula)}
                    className="px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs flex items-center space-x-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
