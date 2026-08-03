'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Car,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Fuel,
  Wrench,
  Building,
  Check,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  MapPin,
  Sparkles
} from 'lucide-react';
import { supabase, Viatura, Pedido } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_PEDIDOS } from '@/lib/mock-data';
import { getStoredPedidos, saveFleetOverride, saveStoredPedido, updateStoredPedido, deleteStoredPedido } from '@/lib/utils/cookies';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function AdminDashboardPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>(MOCK_VIATURAS);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Approval Modal state
  const [approvingPedido, setApprovingPedido] = useState<Pedido | null>(null);
  const [selectedViaturaIdForApproval, setSelectedViaturaIdForApproval] = useState<string>('');

  // Calendar & Reservations view filter tabs: 'HOJE' | 'CALENDARIO' | 'PASSADAS' | 'TODAS'
  const [reservasTab, setReservasTab] = useState<'HOJE' | 'CALENDARIO' | 'PASSADAS' | 'TODAS'>('HOJE');

  // Calendar month selection state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*');
        const { data: pData } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });

        const localStored = getStoredPedidos();
        const dbPedidos: Pedido[] = pData || [];

        // Merge Supabase requests with local stored requests without duplicates
        const combined = [...dbPedidos];
        for (const loc of localStored) {
          if (!combined.some((p) => p.id === loc.id || (p.nip === loc.nip && p.created_at === loc.created_at))) {
            combined.push(loc);
          }
        }

        const fleet = vData && vData.length > 0 ? vData : MOCK_VIATURAS;
        setViaturas(fleet);
        setPedidos(combined);

        if (fleet.length > 0) {
          setSelectedViaturaIdForApproval(fleet[0].id);
        }
      } catch (err) {
        console.error(err);
        setViaturas(MOCK_VIATURAS);
        setPedidos(getStoredPedidos());
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Open Approval Modal
  const handleOpenApprovalModal = (p: Pedido) => {
    setApprovingPedido(p);
    // Auto-select first available vehicle or forced recommendation
    const rec = viaturas.find((v) => v.estado === 'DISPONIVEL') || viaturas[0];
    if (rec) setSelectedViaturaIdForApproval(rec.id);
  };

  // Confirm Approval: Assign Vehicle & Change State to RESERVADA
  const handleConfirmApproval = async () => {
    if (!approvingPedido || !selectedViaturaIdForApproval) return;

    const assignedVtr = viaturas.find((v) => v.id === selectedViaturaIdForApproval);
    const updatedPedido = {
      ...approvingPedido,
      estado_pedido: 'APROVADO' as const,
      viatura_id: selectedViaturaIdForApproval
    };

    try {
      // 1. Update request status and assigned vehicle in Supabase
      await supabase
        .from('pedidos')
        .update({
          estado_pedido: 'APROVADO',
          viatura_id: selectedViaturaIdForApproval
        })
        .eq('id', approvingPedido.id);

      // 2. Change vehicle state to RESERVADA for the booking period
      await supabase
        .from('viaturas')
        .update({
          estado: 'RESERVADA'
        })
        .eq('id', selectedViaturaIdForApproval);

      saveFleetOverride(selectedViaturaIdForApproval, { estado: 'RESERVADA' });

      // Update local storage pedido
      updateStoredPedido(approvingPedido.id, {
        estado_pedido: 'APROVADO',
        viatura_id: selectedViaturaIdForApproval
      });

      // Update state locally
      setPedidos((prev) => prev.map((p) => (p.id === approvingPedido.id ? updatedPedido : p)));
      setViaturas((prev) =>
        prev.map((v) => (v.id === selectedViaturaIdForApproval ? { ...v, estado: 'RESERVADA' } : v))
      );

      // 3. Dispatch Email notification to applicant
      fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'APROVACAO_PEDIDO',
          emailDestinatario: approvingPedido.email,
          nome: approvingPedido.nome_utilizador,
          destino: approvingPedido.destino,
          matricula: assignedVtr?.matricula || 'Nissan Navara 4x4'
        })
      }).catch(console.error);

      alert(`Pedido aprovado com sucesso! Viatura ${assignedVtr?.matricula} atribuída e estado alterado para RESERVADA.`);
      setApprovingPedido(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejeitarPedido = async (id: string) => {
    try {
      await supabase.from('pedidos').update({ estado_pedido: 'REJEITADO' }).eq('id', id);
      updateStoredPedido(id, { estado_pedido: 'REJEITADO' });
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado_pedido: 'REJEITADO' } : p)));
    } catch (err) {
      console.error(err);
      updateStoredPedido(id, { estado_pedido: 'REJEITADO' });
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado_pedido: 'REJEITADO' } : p)));
    }
  };

  // Metrics
  const totalDisponiveis = viaturas.filter((v) => v.estado === 'DISPONIVEL').length;
  const totalReservadas = viaturas.filter((v) => v.estado === 'RESERVADA').length;
  const totalEmUso = viaturas.filter((v) => v.estado === 'EM_USO').length;
  const totalEmprestadas = viaturas.filter((v) => v.estado === 'EMPRESTADA_EXTERNO').length;
  const totalManutencao = viaturas.filter((v) => v.estado === 'MANUTENCAO').length;

  const pedidosPendentes = pedidos.filter((p) => p.estado_pedido === 'PENDENTE');

  // Date Filtering for Agenda & History
  const todayIso = new Date().toISOString().split('T')[0];

  const reservasHoje = pedidos.filter((p) => {
    if (p.estado_pedido !== 'APROVADO' && p.estado_pedido !== 'CONCLUIDO') return false;
    const startStr = p.data_inicio.split('T')[0];
    const endStr = p.data_fim.split('T')[0];
    return startStr === todayIso || endStr === todayIso;
  });

  const reservasPassadas = pedidos.filter((p) => {
    const endStr = p.data_fim.split('T')[0];
    return endStr < todayIso || p.estado_pedido === 'CONCLUIDO' || p.estado_pedido === 'REJEITADO';
  });

  // Calendar Calculations
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth(); // 0-indexed
  const monthName = currentCalendarDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl glass-card border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-mono font-bold uppercase">Disponíveis</span>
            <Car className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{totalDisponiveis}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-amber-500/30">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-mono font-bold uppercase">Reservadas</span>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{totalReservadas}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-blue-500/30">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[11px] font-mono font-bold uppercase">Em Uso (Marcha)</span>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{totalEmUso}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-purple-500/30">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-mono font-bold uppercase">Empréstimos</span>
            <Building className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{totalEmprestadas}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-rose-500/30 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-mono font-bold uppercase">Manutenção</span>
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{totalManutencao}</span>
        </div>
      </div>

      {/* Realtime GPS Fleet Map */}
      <div className="p-5 rounded-2xl glass-panel space-y-3 border border-slate-800">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Car className="w-4 h-4 text-emerald-400" />
          <span>Localização GPS da Frota em Tempo Real</span>
        </h2>
        <MapView viaturas={viaturas} />
      </div>

      {/* PENDING REQUESTS SECTION */}
      <div className="p-5 rounded-2xl glass-panel space-y-4 border-2 border-amber-500/40 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Pedidos de Viatura Pendentes de Validação ({pedidosPendentes.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ao aprovar um pedido, atribua a viatura ao utilizador e o estado passará automaticamente para RESERVADA.
            </p>
          </div>
        </div>

        {pedidosPendentes.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-4 text-center">Nenhum pedido pendente de aprovação no momento.</p>
        ) : (
          <div className="space-y-3">
            {pedidosPendentes.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100">{p.posto} {p.nome_utilizador}</span>
                    <span className="font-mono text-emerald-400">[{p.nip}]</span>
                    {p.necessita_reboque && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 font-bold border border-amber-500/40">
                        REBOQUE SOLICITADO
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300"><span className="text-slate-500">Destino:</span> {p.destino}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Motivo:</span> {p.motivo}</p>
                  <p className="text-amber-300 font-mono">
                    Período: {new Date(p.data_inicio).toLocaleString()} ➔ {new Date(p.data_fim).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenApprovalModal(p)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-md shadow-emerald-950"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar & Atribuir Viatura</span>
                  </button>

                  <button
                    onClick={() => handleRejeitarPedido(p.id)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rejeitar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AGENDA, CALENDAR & RESERVATIONS HISTORY SECTION */}
      <div className="p-5 rounded-2xl glass-panel space-y-5 border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              <span>Agenda de Reservas & Calendário Operacional</span>
            </h2>
            <p className="text-xs text-slate-400">
              Consulte as reservas ativas para hoje, navegue no calendário mensal e aceda ao histórico completo.
            </p>
          </div>

          {/* View Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setReservasTab('HOJE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reservasTab === 'HOJE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hoje ({reservasHoje.length})
            </button>

            <button
              onClick={() => setReservasTab('CALENDARIO')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reservasTab === 'CALENDARIO' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Calendário Mensal
            </button>

            <button
              onClick={() => setReservasTab('PASSADAS')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reservasTab === 'PASSADAS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reservas Passadas ({reservasPassadas.length})
            </button>

            <button
              onClick={() => setReservasTab('TODAS')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reservasTab === 'TODAS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({pedidos.length})
            </button>
          </div>
        </div>

        {/* TAB 1: RESERVAS DE HOJE */}
        {reservasTab === 'HOJE' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>📅 Data Atual: <strong className="text-emerald-400">{new Date().toLocaleDateString('pt-PT')}</strong></span>
              <span>Total de reservas hoje: <strong className="text-emerald-400">{reservasHoje.length}</strong></span>
            </div>

            {reservasHoje.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-6 text-center border border-dashed border-slate-800 rounded-xl">
                Sem reservas de viatura agendadas para o dia de hoje.
              </p>
            ) : (
              <div className="space-y-3">
                {reservasHoje.map((res) => {
                  const assignedVtr = viaturas.find((v) => v.id === res.viatura_id);

                  return (
                    <div key={res.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-100 text-sm">{res.posto} {res.nome_utilizador}</span>
                          <span className="font-mono text-emerald-400 text-xs">[{res.nip}]</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {res.estado_pedido}
                          </span>
                        </div>

                        {assignedVtr && (
                          <div className="flex items-center space-x-1 font-mono text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-700">
                            <Car className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-slate-400">Viatura:</span>
                            <strong className="text-white">{assignedVtr.matricula} ({assignedVtr.modelo})</strong>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
                        <div>
                          <span className="text-slate-500">Destino:</span> <strong className="text-white">{res.destino}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Horário:</span>{' '}
                          <strong className="text-amber-300">
                            {new Date(res.data_inicio).toLocaleTimeString().slice(0, 5)} ➔ {new Date(res.data_fim).toLocaleTimeString().slice(0, 5)}
                          </strong>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">Motivo:</span> <span className="text-slate-400">{res.motivo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CALENDÁRIO MENSIAL DE RESERVAS */}
        {reservasTab === 'CALENDARIO' && (
          <div className="space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                {monthName}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-slate-400">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 text-xs font-mono">
              {/* Empty slots for month padding */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-20 bg-slate-950/40 rounded-lg opacity-30" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = dateIso === todayIso;

                // Find requests on this day
                const dayRequests = pedidos.filter((p) => {
                  const s = p.data_inicio.split('T')[0];
                  const e = p.data_fim.split('T')[0];
                  return s <= dateIso && dateIso <= e;
                });

                return (
                  <div
                    key={dateIso}
                    onClick={() => setSelectedDayFilter(dateIso)}
                    className={`h-24 p-1.5 rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                      selectedDayFilter === dateIso
                        ? 'border-2 border-emerald-400 bg-slate-800/90 shadow-md'
                        : isToday
                        ? 'border-emerald-500/50 bg-slate-900'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {dayNum}
                      </span>
                      {dayRequests.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {dayRequests.length} res
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 overflow-hidden">
                      {dayRequests.slice(0, 2).map((r) => (
                        <div key={r.id} className="text-[9px] truncate px-1 rounded bg-slate-800 text-slate-200">
                          {r.nome_utilizador.split(' ')[0]} ({r.destino})
                        </div>
                      ))}
                      {dayRequests.length > 2 && (
                        <span className="text-[9px] text-slate-500 block">+{dayRequests.length - 2} mais...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Day Agenda Detail */}
            {selectedDayFilter && (
              <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-2 mt-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono">
                  Reservas Agendadas para o Dia {selectedDayFilter}
                </h4>

                {pedidos.filter((p) => p.data_inicio.split('T')[0] <= selectedDayFilter && selectedDayFilter <= p.data_fim.split('T')[0]).length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-2">Sem reservas agendadas para esta data.</p>
                ) : (
                  <div className="space-y-2">
                    {pedidos
                      .filter((p) => p.data_inicio.split('T')[0] <= selectedDayFilter && selectedDayFilter <= p.data_fim.split('T')[0])
                      .map((r) => (
                        <div key={r.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="font-bold text-white">{r.posto} {r.nome_utilizador}</span> [{r.nip}] ➔ Destino: <strong className="text-emerald-400">{r.destino}</strong>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {r.estado_pedido}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RESERVAS PASSADAS */}
        {reservasTab === 'PASSADAS' && (
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-slate-400 uppercase">
              Histórico de Reservas Concluídas / Passadas ({reservasPassadas.length})
            </h3>

            {reservasPassadas.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-6 text-center border border-dashed border-slate-800 rounded-xl">
                Sem histórico de reservas passadas.
              </p>
            ) : (
              <div className="space-y-2">
                {reservasPassadas.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                    <div>
                      <span className="font-bold text-slate-200">{r.posto} {r.nome_utilizador}</span> [{r.nip}] ➔ {r.destino}
                      <span className="text-slate-500 block text-[11px]">{new Date(r.data_inicio).toLocaleString()} ➔ {new Date(r.data_fim).toLocaleString()}</span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        r.estado_pedido === 'CONCLUIDO' || r.estado_pedido === 'APROVADO'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {r.estado_pedido}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TODAS AS RESERVAS */}
        {reservasTab === 'TODAS' && (
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-slate-400 uppercase">
              Listagem Completa de Todos os Pedidos ({pedidos.length})
            </h3>

            {pedidos.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-6 text-center border border-dashed border-slate-800 rounded-xl">
                Sem registos de reservas.
              </p>
            ) : (
              <div className="space-y-2">
                {pedidos.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                    <div>
                      <span className="font-bold text-slate-200">{r.posto} {r.nome_utilizador}</span> [{r.nip}] ➔ {r.destino}
                      <span className="text-slate-500 block text-[11px]">{new Date(r.data_inicio).toLocaleString()} ➔ {new Date(r.data_fim).toLocaleString()}</span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        r.estado_pedido === 'APROVADO'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : r.estado_pedido === 'PENDENTE'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {r.estado_pedido}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* APPROVAL & VEHICLE ASSIGNMENT MODAL */}
      {approvingPedido && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border-2 border-emerald-500/60 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider text-sm">
                <Check className="w-5 h-5" />
                <span>Aprovar Pedido & Atribuir Viatura</span>
              </div>
              <button onClick={() => setApprovingPedido(null)} className="text-slate-400 hover:text-white text-xs font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono block">REQUERENTE</span>
                <span className="text-sm font-bold text-white block">{approvingPedido.posto} {approvingPedido.nome_utilizador} [{approvingPedido.nip}]</span>
                <span className="text-slate-300 block">Destino: {approvingPedido.destino}</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Selecionar Viatura a Atribuir ao Militar *</label>
                <select
                  value={selectedViaturaIdForApproval}
                  onChange={(e) => setSelectedViaturaIdForApproval(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs font-bold"
                >
                  {viaturas.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.matricula} - {v.modelo} ({v.km_atuais.toLocaleString()} KM) [{v.estado}]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-400 mt-1 font-mono">
                  * O estado da viatura passará para <strong>RESERVADA</strong> durante o período da reserva.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setApprovingPedido(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow-lg shadow-emerald-950 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar & Atribuir Viatura</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
