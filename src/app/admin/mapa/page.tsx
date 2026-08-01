'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Map, Calendar, Car, Download, Filter } from 'lucide-react';
import { supabase, Viatura, HistoricoGps } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_GPS } from '@/lib/mock-data';

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

export default function MapaHistoricoPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViaturaId, setSelectedViaturaId] = useState<string>('');
  const [selectedData, setSelectedData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [pontosGps, setPontosGps] = useState<HistoricoGps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadInitial() {
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
    loadInitial();
  }, []);

  useEffect(() => {
    async function fetchGpsTrack() {
      if (!selectedViaturaId) return;

      try {
        const { data: gpsData } = await supabase
          .from('historico_posicoes_gps')
          .select('*')
          .eq('viatura_id', selectedViaturaId)
          .order('registado_at', { ascending: true });

        if (gpsData && gpsData.length > 0) {
          setPontosGps(gpsData);
        } else {
          // Fallback to mock GPS data
          setPontosGps(MOCK_GPS.filter((g) => g.viatura_id === selectedViaturaId || true));
        }
      } catch (err) {
        console.error(err);
        setPontosGps(MOCK_GPS);
      }
    }

    fetchGpsTrack();
  }, [selectedViaturaId, selectedData]);

  const handleExportCSV = () => {
    const headers = 'ID,ViaturaID,NIP_Operador,Latitude,Longitude,Evento,DataHora\n';
    const rows = pontosGps
      .map((p) => `${p.id},${p.viatura_id},${p.nip_operador},${p.latitude},${p.longitude},${p.tipo_evento},${p.registado_at}`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetria_vtr_${selectedViaturaId}_${selectedData}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Telemetria & Histórico de Percursos por Dia
            </h1>
            <p className="text-xs text-slate-400">
              Visualização contínua em mapa do trajeto percorrido e auditoria de pings de GPS.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto text-xs font-mono">
          <div className="w-full sm:w-auto">
            <label className="block text-slate-500 text-[10px] mb-1">Selecionar Viatura</label>
            <select
              value={selectedViaturaId}
              onChange={(e) => setSelectedViaturaId(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            >
              {viaturas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.matricula} ({v.modelo})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-slate-500 text-[10px] mb-1">Data do Percurso</label>
            <input
              type="date"
              value={selectedData}
              onChange={(e) => setSelectedData(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold font-mono flex items-center justify-center space-x-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Telemetria CSV</span>
        </button>
      </div>

      {/* Route Map */}
      <div className="p-5 rounded-2xl glass-panel space-y-3">
        <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
          <Map className="w-4 h-4" />
          <span>Linha de Percurso GPS Registada ({pontosGps.length} marcadores)</span>
        </h2>
        <RouteMap pontosGps={pontosGps} />
      </div>

      {/* GPS Audit Table */}
      <div className="p-5 rounded-2xl glass-panel space-y-3">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Tabela de Auditoria de Pings GPS
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-2.5">Data/Hora</th>
                <th className="p-2.5">NIP Operador</th>
                <th className="p-2.5">Coordenadas</th>
                <th className="p-2.5">Precisão</th>
                <th className="p-2.5">Tipo de Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {pontosGps.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50">
                  <td className="p-2.5 text-slate-300">{new Date(p.registado_at).toLocaleString()}</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{p.nip_operador}</td>
                  <td className="p-2.5 text-slate-300">
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  </td>
                  <td className="p-2.5 text-slate-400">±{p.precisao_metros || 5}m</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                      {p.tipo_evento}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
