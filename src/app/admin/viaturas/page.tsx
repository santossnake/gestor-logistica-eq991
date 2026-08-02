'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Car,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  MapPin,
  Calendar,
  Filter,
  Route,
  Navigation,
  Clock,
  User
} from 'lucide-react';
import { supabase, Viatura, HistoricoGps } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_GPS } from '@/lib/mock-data';

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

export default function AdminViaturasPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>(MOCK_VIATURAS);
  const [todosPontosGps, setTodosPontosGps] = useState<HistoricoGps[]>(MOCK_GPS);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Filters for Route Map
  const [selectedViaturaId, setSelectedViaturaId] = useState<string>('TODAS');
  const [filtroData, setFiltroData] = useState<string>('HOJE'); // HOJE, 7DIAS, 30DIAS, CUSTOM
  const [customData, setCustomData] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form Modal for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingViatura, setEditingViatura] = useState<Viatura | null>(null);

  const [matricula, setMatricula] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [numLugares, setNumLugares] = useState<number>(5);
  const [temGancho, setTemGancho] = useState<boolean>(true);
  const [kmAtuais, setKmAtuais] = useState<number>(40000);
  const [localViatura, setLocalViatura] = useState<string>('Parque Principal EQ991 (Ota)');
  const [localChave, setLocalChave] = useState<string>('Chaveiro Principal - Armário A');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*').order('matricula', { ascending: true });
        if (vData && vData.length > 0) setViaturas(vData);

        const { data: gData } = await supabase.from('historico_posicoes_gps').select('*').order('registado_at', { ascending: false });
        if (gData && gData.length > 0) setTodosPontosGps(gData);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  // Filter GPS Points based on vehicle and date filters
  const pontosGpsFiltrados = todosPontosGps.filter((p) => {
    // 1. Vehicle Filter
    if (selectedViaturaId !== 'TODAS' && p.viatura_id !== selectedViaturaId) {
      return false;
    }

    // 2. Date Filter
    const pDate = new Date(p.registado_at);
    const now = new Date();

    if (filtroData === 'HOJE') {
      return pDate.toDateString() === now.toDateString();
    } else if (filtroData === '7DIAS') {
      const diffTime = now.getTime() - pDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays <= 7;
    } else if (filtroData === '30DIAS') {
      const diffTime = now.getTime() - pDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays <= 30;
    } else if (filtroData === 'CUSTOM' && customData) {
      const targetDateStr = new Date(customData).toDateString();
      return pDate.toDateString() === targetDateStr;
    }

    return true;
  });

  const handleCopyLink = (qrToken: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/chave/${qrToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(qrToken);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleToggleForcada = async (v: Viatura) => {
    const newStatus = !v.is_forcada_recomendada;
    try {
      if (newStatus) {
        // Reset all others to false
        await supabase.from('viaturas').update({ is_forcada_recomendada: false }).neq('id', v.id);
      }
      await supabase.from('viaturas').update({ is_forcada_recomendada: newStatus }).eq('id', v.id);

      setViaturas((prev) =>
        prev.map((item) => {
          if (item.id === v.id) return { ...item, is_forcada_recomendada: newStatus };
          if (newStatus) return { ...item, is_forcada_recomendada: false };
          return item;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteViatura = async (id: string) => {
    if (!confirm('Tem a certeza que deseja apagar esta viatura da frota?')) return;
    try {
      await supabase.from('viaturas').delete().eq('id', id);
      setViaturas((prev) => prev.filter((v) => v.id !== id));
      if (selectedViaturaId === id) setSelectedViaturaId('TODAS');
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingViatura(null);
    setMatricula('');
    setModelo('Nissan Navara 4x4');
    setNumLugares(5);
    setTemGancho(true);
    setKmAtuais(40000);
    setLocalViatura('Parque Principal EQ991 (Ota)');
    setLocalChave('Chaveiro Principal - Armário A');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Viatura) => {
    setEditingViatura(v);
    setMatricula(v.matricula);
    setModelo(v.modelo);
    setNumLugares(v.num_lugares);
    setTemGancho(v.tem_gancho_reboque);
    setKmAtuais(v.km_atuais);
    setLocalViatura(v.localizacao_atual_viatura);
    setLocalChave(v.localizacao_atual_chave);
    setIsModalOpen(true);
  };

  const handleSaveViatura = async (e: React.FormEvent) => {
    e.preventDefault();
    const newToken = `VTR-991-${Math.floor(10 + Math.random() * 90)}`;

    const vData = {
      matricula,
      modelo,
      num_lugares: numLugares,
      tem_gancho_reboque: temGancho,
      km_atuais: kmAtuais,
      localizacao_atual_viatura: localViatura,
      localizacao_atual_chave: localChave,
      latitude_atual: 39.1090,
      longitude_atual: -8.9735
    };

    try {
      if (editingViatura) {
        await supabase.from('viaturas').update(vData).eq('id', editingViatura.id);
        setViaturas((prev) => prev.map((v) => (v.id === editingViatura.id ? { ...v, ...vData } : v)));
      } else {
        const newRecord = {
          ...vData,
          estado: 'DISPONIVEL',
          necessita_limpeza: false,
          qr_code_token: newToken,
          is_forcada_recomendada: false,
          km_proxima_revisao: kmAtuais + 10000
        };
        const { data } = await supabase.from('viaturas').insert([newRecord]).select();
        const created = data && data.length > 0 ? data[0] : { id: `vtr-${Date.now()}`, ...newRecord };
        setViaturas((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <Car className="w-5 h-5 text-emerald-400" />
            <span>Gestão de Frota & Percursos das Viaturas</span>
          </h1>
          <p className="text-xs text-slate-400">
            Esquadra 991. Gestão de viaturas, recomendação manual, atalhos de chave e histórico de percursos no mapa.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Viatura</span>
        </button>
      </div>

      {/* DYNAMIC GPS ROUTE MAP SECTION WITH FILTERS */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Mapa de Movimentos & Percursos GPS (Ota)
              </h2>
              <p className="text-[11px] text-slate-400">
                Visualize os percursos e registos de marcha por viatura e intervalo de datas.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Vehicle Selector */}
            <div className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <Car className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-mono text-[11px]">Viatura:</span>
              <select
                value={selectedViaturaId}
                onChange={(e) => setSelectedViaturaId(e.target.value)}
                className="bg-transparent text-slate-100 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="TODAS" className="bg-slate-900 text-slate-100">Todas as Viaturas</option>
                {viaturas.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                    {v.matricula} ({v.modelo})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Quick Selector */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-700 font-mono">
              <button
                onClick={() => setFiltroData('HOJE')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  filtroData === 'HOJE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setFiltroData('7DIAS')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  filtroData === '7DIAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setFiltroData('30DIAS')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  filtroData === '30DIAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setFiltroData('CUSTOM')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  filtroData === 'CUSTOM' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Data
              </button>
            </div>

            {filtroData === 'CUSTOM' && (
              <input
                type="date"
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs px-2.5 py-1 rounded-lg font-mono"
              />
            )}
          </div>
        </div>

        {/* Route Map */}
        <div className="rounded-xl overflow-hidden border border-slate-800">
          <RouteMap pontosGps={pontosGpsFiltrados} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
          <span>
            📍 Movimentos encontrados:{' '}
            <strong className="text-emerald-400">{pontosGpsFiltrados.length}</strong> registos GPS
          </span>
          {selectedViaturaId !== 'TODAS' && (
            <button
              onClick={() => setSelectedViaturaId('TODAS')}
              className="text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Limpar Filtro de Viatura</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <Car className="w-4 h-4 text-emerald-400" />
          <span>Frota de Viaturas Registadas ({viaturas.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {viaturas.map((v) => {
            const isSelectedForMap = selectedViaturaId === v.id;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedViaturaId(v.id)}
                className={`p-5 rounded-2xl glass-card border transition-all space-y-4 cursor-pointer ${
                  isSelectedForMap
                    ? 'border-2 border-emerald-500 bg-slate-800/90 shadow-xl'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Matricula + Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">FORÇA AÉREA</span>
                    <h3 className="text-2xl font-black text-white font-mono tracking-widest">{v.matricula}</h3>
                    <p className="text-xs font-semibold text-slate-300">{v.modelo}</p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
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

                {/* Info List */}
                <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Odómetro:</span>
                    <span className="font-bold text-slate-100">{v.km_atuais.toLocaleString()} KM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reboque:</span>
                    <span className={v.tem_gancho_reboque ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {v.tem_gancho_reboque ? 'Sim (Com Gancho)' : 'Não'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Local Viatura:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{v.localizacao_atual_viatura}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chaveiro:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{v.localizacao_atual_chave}</span>
                  </div>
                </div>

                {/* Forced recommendation toggle button */}
                <div className="pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleForcada(v);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold font-mono flex items-center justify-center space-x-2 border transition-all ${
                      v.is_forcada_recomendada
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {v.is_forcada_recomendada ? '★ RECOMENDAÇÃO FORÇADA ATIVA' : 'Definir Recomendação Forçada'}
                    </span>
                  </button>
                </div>

                {/* Direct Link & Action buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(v.qr_code_token);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 flex items-center space-x-1 border border-slate-700 transition-colors"
                    title="Copiar link direto para programar Tag NFC ou QR Code"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{copiedToken === v.qr_code_token ? 'Link Copiado!' : 'Copiar Link NFC'}</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(v);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                      title="Editar Viatura"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteViatura(v.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800"
                      title="Apagar Viatura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              {editingViatura ? 'Editar Viatura' : 'Adicionar Nova Viatura à Frota'}
            </h2>

            <form onSubmit={handleSaveViatura} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Matrícula *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: AM-96-14"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Modelo da Viatura *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nissan Navara 4x4"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nº Lugares</label>
                  <input
                    type="number"
                    value={numLugares}
                    onChange={(e) => setNumLugares(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Odómetro (KM)</label>
                  <input
                    type="number"
                    value={kmAtuais}
                    onChange={(e) => setKmAtuais(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temGancho}
                    onChange={(e) => setTemGancho(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Possui Gancho de Reboque</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Localização da Viatura</label>
                <input
                  type="text"
                  value={localViatura}
                  onChange={(e) => setLocalViatura(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Localização do Chaveiro</label>
                <input
                  type="text"
                  value={localChave}
                  onChange={(e) => setLocalChave(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                />
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
