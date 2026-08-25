'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Route, Car, User, MapPin, Calendar, Search, Filter, Download, ArrowUpRight, CheckCircle2, Clock, Navigation, Eye, X } from 'lucide-react';
import { supabase, isSupabaseConfigured, Viatura, RegistoMarcha, HistoricoGps } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_MARCHAS, MOCK_GPS } from '@/lib/mock-data';
import { getStoredMarchas } from '@/lib/utils/cookies';

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

export default function MovimentosViaturasPage() {
  const [marchas, setMarchas] = useState<RegistoMarcha[]>([]);
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal Map state
  const [selectedMarchaForMap, setSelectedMarchaForMap] = useState<RegistoMarcha | null>(null);
  const [marchaGpsPoints, setMarchaGpsPoints] = useState<HistoricoGps[]>([]);

  // Filters
  const [selectedViaturaId, setSelectedViaturaId] = useState<string>('TODAS');
  const [searchUtilizador, setSearchUtilizador] = useState<string>('');
  const [searchDestino, setSearchDestino] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'EM_CURSO' | 'CONCLUIDAS'>('TODOS');

  useEffect(() => {
    async function loadData() {
      try {
        const storedMarchas = getStoredMarchas();
        let remoteMarchas: any[] = [];
        let remoteViaturas: any[] = [];

        if (isSupabaseConfigured()) {
          try {
            const { data: vData } = await supabase.from('viaturas').select('*').order('matricula', { ascending: true });
            if (vData && vData.length > 0) remoteViaturas = vData;

            const { data: mData } = await supabase.from('registos_marcha').select('*').order('data_saida', { ascending: false });
            if (mData && mData.length > 0) remoteMarchas = mData;
          } catch (netErr: any) {
            console.warn('Erro de rede ao carregar movimentos do Supabase:', netErr);
          }
        }

        const combinedViaturas = remoteViaturas.length > 0 ? remoteViaturas : MOCK_VIATURAS;
        setViaturas(combinedViaturas);

        // Merge remote and local marchas without duplicates
        const map = new Map<string, any>();
        [...storedMarchas, ...remoteMarchas, ...MOCK_MARCHAS].forEach((m) => {
          if (m && m.id) map.set(m.id, m);
        });

        const mergedMarchas = Array.from(map.values()).sort((a, b) => {
          return new Date(b.data_saida || 0).getTime() - new Date(a.data_saida || 0).getTime();
        });

        setMarchas(mergedMarchas);
      } catch (err) {
        console.warn('Erro ao carregar movimentos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleOpenMapModal = async (m: RegistoMarcha) => {
    setSelectedMarchaForMap(m);

    try {
      if (isSupabaseConfigured()) {
        const { data: gData } = await supabase
          .from('historico_posicoes_gps')
          .select('*')
          .eq('registo_marcha_id', m.id)
          .order('registado_at', { ascending: true });

        if (gData && gData.length > 0) {
          setMarchaGpsPoints(gData);
          return;
        }
      }

      // Filter MOCK_GPS points or generate realistic route points for this march
      const points = MOCK_GPS.filter((g) => g.viatura_id === m.viatura_id || g.registo_marcha_id === m.id);
      if (points.length > 0) {
        setMarchaGpsPoints(points);
      } else {
        // Fallback synthetic route points between Ota base [39.092, -8.968] and Sintra / Lisbon
        const startLat = m.latitude_inicio || 39.092;
        const startLng = m.longitude_inicio || -8.968;
        const endLat = m.latitude_fecho || startLat + 0.015;
        const endLng = m.longitude_fecho || startLng - 0.025;

        const synth: HistoricoGps[] = [
          {
            id: `p1-${m.id}`,
            viatura_id: m.viatura_id,
            registo_marcha_id: m.id,
            nip_operador: m.nip_inicio,
            latitude: startLat,
            longitude: startLng,
            tipo_evento: 'INICIO_MARCHA',
            registado_at: m.data_saida || new Date().toISOString()
          },
          {
            id: `p2-${m.id}`,
            viatura_id: m.viatura_id,
            registo_marcha_id: m.id,
            nip_operador: m.nip_inicio,
            latitude: (startLat + endLat) / 2,
            longitude: (startLng + endLng) / 2,
            tipo_evento: 'PING_PERCURSO',
            registado_at: m.data_saida || new Date().toISOString()
          },
          {
            id: `p3-${m.id}`,
            viatura_id: m.viatura_id,
            registo_marcha_id: m.id,
            nip_operador: m.nip_fim || m.nip_inicio,
            latitude: endLat,
            longitude: endLng,
            tipo_evento: m.data_chegada ? 'FIM_MARCHA' : 'PING_PERCURSO',
            registado_at: m.data_chegada || new Date().toISOString()
          }
        ];
        setMarchaGpsPoints(synth);
      }
    } catch (err) {
      console.error('Erro ao carregar posições GPS:', err);
    }
  };

  // Map viatura_id to Viatura object
  const getViaturaInfo = (viaturaId: string) => {
    return viaturas.find((v) => v.id === viaturaId) || { matricula: 'AM-96-12', modelo: 'Nissan Navara 4x4' };
  };

  // Filtered movements list
  const marchasFiltradas = marchas.filter((m) => {
    if (selectedViaturaId !== 'TODAS' && m.viatura_id !== selectedViaturaId) return false;

    if (searchUtilizador.trim()) {
      const q = searchUtilizador.toLowerCase();
      const matchNipInicio = m.nip_inicio?.toLowerCase().includes(q);
      const matchNipFim = m.nip_fim?.toLowerCase().includes(q);
      const matchCondInicio = m.trigrama_ou_condutor_inicio?.toLowerCase().includes(q);
      const matchCondFim = m.trigrama_ou_condutor_fim?.toLowerCase().includes(q);

      if (!matchNipInicio && !matchNipFim && !matchCondInicio && !matchCondFim) return false;
    }

    if (searchDestino.trim()) {
      const q = searchDestino.toLowerCase();
      const matchDestino = m.destino_funcao?.toLowerCase().includes(q);
      if (!matchDestino) return false;
    }

    if (filtroEstado === 'EM_CURSO' && m.data_chegada) return false;
    if (filtroEstado === 'CONCLUIDAS' && !m.data_chegada) return false;

    return true;
  });

  // Calculate statistics
  const totalMarchas = marchasFiltradas.length;
  const emCurso = marchasFiltradas.filter((m) => !m.data_chegada).length;
  const kmTotais = marchasFiltradas.reduce((acc, m) => {
    if (m.km_final && m.km_inicial && m.km_final >= m.km_inicial) {
      return acc + (m.km_final - m.km_inicial);
    }
    return acc;
  }, 0);

  // Export to CSV
  const handleExportCSV = () => {
    if (marchasFiltradas.length === 0) return;

    const headers = [
      'ID Marcha',
      'Matrícula',
      'Modelo',
      'NIP Início',
      'Condutor Início (Trigrama/Posto Nome)',
      'Destino / Função',
      'Km Inicial',
      'Data/Hora Saída',
      'NIP Fim',
      'Condutor Fim',
      'Km Final',
      'Km Percorridos',
      'Combustível',
      'Data/Hora Chegada',
      'Estado'
    ];

    const rows = marchasFiltradas.map((m) => {
      const v = getViaturaInfo(m.viatura_id);
      const kmPercorridos = m.km_final && m.km_inicial ? m.km_final - m.km_inicial : 0;
      const estadoStr = m.data_chegada ? 'Concluída' : 'Em Curso';

      return [
        m.id,
        v.matricula,
        `"${v.modelo}"`,
        m.nip_inicio,
        `"${m.trigrama_ou_condutor_inicio || ''}"`,
        `"${m.destino_funcao || ''}"`,
        m.km_inicial,
        m.data_saida ? new Date(m.data_saida).toLocaleString() : '',
        m.nip_fim || '',
        `"${m.trigrama_ou_condutor_fim || ''}"`,
        m.km_final || '',
        kmPercorridos,
        m.nivel_combustivel || '',
        m.data_chegada ? new Date(m.data_chegada).toLocaleString() : '',
        estadoStr
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `movimentos_viaturas_eq991_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <Route className="w-5 h-5 text-emerald-400" />
            <span>Movimentos de Viaturas & Histórico de Marchas</span>
          </h1>
          <p className="text-xs text-slate-400">
            Esquadra 991. Consulta detalhada de levantamentos, entregas, condutores, odómetros e destinos das viaturas.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-950 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-mono block">TOTAL DE MARCHAS REGISTADAS</span>
            <span className="text-2xl font-black text-white font-mono">{totalMarchas}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Route className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-mono block">MARCHAS EM CURSO</span>
            <span className="text-2xl font-black text-blue-400 font-mono">{emCurso}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-mono block">KM TOTAIS PERCORRIDOS</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{kmTotais.toLocaleString()} KM</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Navigation className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Filtros de Pesquisa de Movimentos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filter Viatura */}
          <div>
            <label className="block text-slate-400 mb-1 font-mono">Viatura:</label>
            <select
              value={selectedViaturaId}
              onChange={(e) => setSelectedViaturaId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Viaturas</option>
              {viaturas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.matricula} ({v.modelo})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Utilizador */}
          <div>
            <label className="block text-slate-400 mb-1 font-mono">Utilizador / NIP / Trigrama:</label>
            <div className="relative">
              <input
                type="text"
                value={searchUtilizador}
                onChange={(e) => setSearchUtilizador(e.target.value)}
                placeholder="Ex: OLV, Tenente, 134890"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold placeholder:text-slate-600"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Filter Destino / Função */}
          <div>
            <label className="block text-slate-400 mb-1 font-mono">Destino / Função da Missão:</label>
            <div className="relative">
              <input
                type="text"
                value={searchDestino}
                onChange={(e) => setSearchDestino(e.target.value)}
                placeholder="Ex: BA1 Sintra, Tático"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold placeholder:text-slate-600"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Filter Estado */}
          <div>
            <label className="block text-slate-400 mb-1 font-mono">Estado da Marcha:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todas as Marchas</option>
              <option value="EM_CURSO">Em Curso (Ativas)</option>
              <option value="CONCLUIDAS">Concluídas (Entregues)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movements Data Table / List */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Registos de Movimento ({marchasFiltradas.length})
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400">
            A carregar histórico de movimentos da frota...
          </div>
        ) : marchasFiltradas.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
            Nenhum registo de marcha encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {marchasFiltradas.map((m) => {
              const v = getViaturaInfo(m.viatura_id);
              const isEmCurso = !m.data_chegada;
              const kmPercorridos = m.km_final && m.km_inicial ? m.km_final - m.km_inicial : 0;

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl bg-slate-900/90 border transition-all ${
                    isEmCurso ? 'border-blue-500/50 shadow-lg shadow-blue-950/20' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          isEmCurso
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-lg text-white tracking-wider">{v.matricula}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isEmCurso
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isEmCurso ? '🚗 EM CURSO' : '✓ CONCLUÍDA'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold">{v.modelo}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">ODÓMETRO INICIAL</span>
                          <span className="text-slate-200 font-bold">{m.km_inicial?.toLocaleString()} KM</span>
                        </div>
                        {m.km_final && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">ODÓMETRO FINAL</span>
                            <span className="text-emerald-400 font-bold">{m.km_final?.toLocaleString()} KM</span>
                          </div>
                        )}
                        {m.km_final && (
                          <div className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-right">
                            <span className="text-slate-500 block text-[10px]">DISTÂNCIA</span>
                            <span className="text-amber-400 font-bold">+{kmPercorridos} KM</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenMapModal(m)}
                        className="px-3 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
                        title="Ver percurso GPS completo em Imagem de Satélite"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ver Percurso 🛰️</span>
                      </button>
                    </div>
                  </div>

                  {/* Driver and Mission Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs font-mono">
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-[10px] block uppercase">Condutor de Início (Levantamento)</span>
                      <div className="text-slate-100 font-bold text-sm">
                        {m.trigrama_ou_condutor_inicio || m.nip_inicio || 'N/D'}
                      </div>
                      <div className="text-slate-400 text-[11px]">NIP: {m.nip_inicio}</div>
                      <div className="text-slate-500 text-[10px]">
                        Saída: {m.data_saida ? new Date(m.data_saida).toLocaleString() : 'N/D'}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-[10px] block uppercase">Destino / Função da Missão</span>
                      <div className="text-emerald-300 font-bold text-sm">
                        {m.destino_funcao || 'Serviço Geral'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Chaveiro Início: {m.localizacao_chave || 'Chaveiro 991'}
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Parque Início: {m.localizacao_viatura || 'Telheiro 991'}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-[10px] block uppercase">Condutor de Devolução (Entrega)</span>
                      {m.data_chegada ? (
                        <>
                          <div className="text-slate-100 font-bold text-sm">
                            {m.trigrama_ou_condutor_fim || m.nip_fim || 'N/D'}
                          </div>
                          <div className="text-slate-400 text-[11px]">NIP: {m.nip_fim || 'N/D'}</div>
                          <div className="text-slate-500 text-[10px]">
                            Chegada: {new Date(m.data_chegada).toLocaleString()}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1 pt-0.5">
                          <div className="text-blue-400 font-bold text-xs flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 animate-spin text-blue-400" />
                            <span>Em utilização ativa no terreno</span>
                          </div>
                          <div className="text-emerald-300 font-black text-sm pt-1">
                            Condutor: {m.trigrama_ou_condutor_inicio || m.nip_inicio}
                          </div>
                          <div className="text-slate-300 text-[11px]">
                            NIP: <strong className="text-white">{m.nip_inicio}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SATELLITE GPS ROUTE MAP MODAL */}
      {selectedMarchaForMap && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-lg text-white">
                    Percurso em Satélite - {getViaturaInfo(selectedMarchaForMap.viatura_id).matricula}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Destino / Missão: {selectedMarchaForMap.destino_funcao || 'Serviço Geral'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMarchaForMap(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* March Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">CONDUTOR</span>
                <span className="text-slate-100 font-bold">
                  {selectedMarchaForMap.trigrama_ou_condutor_inicio || selectedMarchaForMap.nip_inicio}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">NIP</span>
                <span className="text-slate-300 font-bold">{selectedMarchaForMap.nip_inicio}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">KM INICIAL / FINAL</span>
                <span className="text-amber-400 font-bold">
                  {selectedMarchaForMap.km_inicial} KM {selectedMarchaForMap.km_final ? `➔ ${selectedMarchaForMap.km_final} KM` : '(Em curso)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">IMAGEM DE MAPA</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span>🛰️ Satélite HD</span>
                </span>
              </div>
            </div>

            {/* Interactive Route Map Container */}
            <div className="rounded-xl overflow-hidden border border-slate-800">
              <RouteMap pontosGps={marchaGpsPoints} />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMarchaForMap(null)}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Fechar Mapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
