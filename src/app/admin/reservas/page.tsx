'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  User,
  Search,
  Truck,
  Filter,
  Check,
  AlertCircle,
  FileText,
  Mail
} from 'lucide-react';
import { supabase, Pedido, Viatura } from '@/lib/supabase/client';
import { MOCK_VIATURAS } from '@/lib/mock-data';
import { getStoredPedidos, saveStoredPedido, POSTOS_FORCA_AEREA, saveFleetOverride, updateStoredPedido, deleteStoredPedido } from '@/lib/utils/cookies';

export default function AdminReservasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [viaturas, setViaturas] = useState<Viatura[]>(MOCK_VIATURAS);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Modal States (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);

  const [nomeUtilizador, setNomeUtilizador] = useState<string>('');
  const [nip, setNip] = useState<string>('');
  const [posto, setPosto] = useState<string>('TEN');
  const [email, setEmail] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [necessitaReboque, setNecessitaReboque] = useState<boolean>(false);
  const [viaturaIdSelected, setViaturaIdSelected] = useState<string>('');
  const [estadoPedido, setEstadoPedido] = useState<'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CONCLUIDO'>('APROVADO');

  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const sanitizeViaturaKm = (v: Viatura): Viatura => {
    let km = v.km_atuais;
    if (v.matricula === 'AM-96-11' && km < 98620) km = 98620;
    if (v.matricula === 'AM-96-12' && km < 105888) km = 105888;
    if (v.matricula === 'AM-96-13' && km < 102614) km = 102614;

    return { ...v, km_atuais: km };
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*');
        const { data: pData } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });

        let fleet = vData && vData.length > 0 ? vData : MOCK_VIATURAS;
        fleet = fleet.map(sanitizeViaturaKm);
        setViaturas(fleet);

        const localStored = getStoredPedidos();
        const dbPedidos: Pedido[] = pData || [];

        // Merge DB requests with local storage
        const combined = [...dbPedidos];
        for (const loc of localStored) {
          if (!combined.some((p) => p.id === loc.id || (p.nip === loc.nip && p.created_at === loc.created_at))) {
            combined.push(loc);
          }
        }

        setPedidos(combined);

        if (fleet.length > 0) {
          setViaturaIdSelected(fleet[0].id);
        }
      } catch (err) {
        console.error(err);
        setViaturas(MOCK_VIATURAS.map(sanitizeViaturaKm));
        setPedidos(getStoredPedidos());
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter logic
  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado !== 'TODOS' && p.estado_pedido !== filtroEstado) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.nome_utilizador.toLowerCase().includes(q);
      const matchNip = p.nip.toLowerCase().includes(q);
      const matchDestino = p.destino.toLowerCase().includes(q);
      const matchMotivo = p.motivo.toLowerCase().includes(q);
      return matchName || matchNip || matchDestino || matchMotivo;
    }

    return true;
  });

  const handleOpenCreateModal = () => {
    setEditingPedidoId(null);
    setNomeUtilizador('');
    setNip('');
    setPosto('TEN');
    setEmail('');

    const now = new Date();
    const future = new Date(now.getTime() + 4 * 3600000);
    setDataInicio(now.toISOString().slice(0, 16));
    setDataFim(future.toISOString().slice(0, 16));

    setDestino('');
    setMotivo('');
    setNecessitaReboque(false);
    setViaturaIdSelected(viaturas.length > 0 ? viaturas[0].id : '');
    setEstadoPedido('APROVADO');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Pedido) => {
    setEditingPedidoId(p.id);
    setNomeUtilizador(p.nome_utilizador);
    setNip(p.nip);
    setPosto(p.posto);
    setEmail(p.email);
    setDataInicio(p.data_inicio ? new Date(p.data_inicio).toISOString().slice(0, 16) : '');
    setDataFim(p.data_fim ? new Date(p.data_fim).toISOString().slice(0, 16) : '');
    setDestino(p.destino);
    setMotivo(p.motivo);
    setNecessitaReboque(p.necessita_reboque || false);
    setViaturaIdSelected(p.viatura_id || (viaturas.length > 0 ? viaturas[0].id : ''));
    setEstadoPedido(p.estado_pedido);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSavePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeUtilizador || !nip || !destino || !motivo) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        nome_utilizador: nomeUtilizador,
        nip,
        posto,
        email,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        destino,
        motivo,
        necessita_reboque: necessitaReboque,
        viatura_id: viaturaIdSelected || undefined,
        estado_pedido: estadoPedido
      };

      if (editingPedidoId) {
        // EDIT existing reservation
        await supabase.from('pedidos').update(payload).eq('id', editingPedidoId);
        updateStoredPedido(editingPedidoId, payload);

        setPedidos((prev) =>
          prev.map((item) => (item.id === editingPedidoId ? { ...item, ...payload } : item))
        );

        if (estadoPedido === 'APROVADO' && viaturaIdSelected) {
          await supabase.from('viaturas').update({ estado: 'RESERVADA' }).eq('id', viaturaIdSelected);
          saveFleetOverride(viaturaIdSelected, { estado: 'RESERVADA' });
          setViaturas((prev) =>
            prev.map((v) => (v.id === viaturaIdSelected ? { ...v, estado: 'RESERVADA' } : v))
          );
        }

        setSuccessMsg(`Reserva de ${nomeUtilizador} [${nip}] atualizada com sucesso!`);
      } else {
        // CREATE new reservation
        const { data } = await supabase.from('pedidos').insert([payload]).select();
        const createdRec = data && data.length > 0 ? data[0] : { id: `ped-${Date.now()}`, ...payload, created_at: new Date().toISOString() };

        saveStoredPedido(createdRec);
        setPedidos((prev) => [createdRec, ...prev]);

        if (estadoPedido === 'APROVADO' && viaturaIdSelected) {
          await supabase.from('viaturas').update({ estado: 'RESERVADA' }).eq('id', viaturaIdSelected);
          saveFleetOverride(viaturaIdSelected, { estado: 'RESERVADA' });
          setViaturas((prev) =>
            prev.map((v) => (v.id === viaturaIdSelected ? { ...v, estado: 'RESERVADA' } : v))
          );
        }

        setSuccessMsg(`Nova reserva para ${nomeUtilizador} criada com sucesso!`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao guardar reserva.');
    }
  };

  const handleApagarPedido = async (id: string, nome: string) => {
    if (!confirm(`Tem a certeza que deseja apagar permanentemente a reserva de "${nome}"?`)) return;

    try {
      const targetPed = pedidos.find((p) => p.id === id);
      await supabase.from('pedidos').delete().eq('id', id);
      deleteStoredPedido(id);

      setPedidos((prev) => prev.filter((p) => p.id !== id));

      if (targetPed && targetPed.viatura_id) {
        // Revert vehicle state to DISPONIVEL if no other active reservation
        await supabase.from('viaturas').update({ estado: 'DISPONIVEL' }).eq('id', targetPed.viatura_id);
        saveFleetOverride(targetPed.viatura_id, { estado: 'DISPONIVEL' });
        setViaturas((prev) =>
          prev.map((v) => (v.id === targetPed.viatura_id ? { ...v, estado: 'DISPONIVEL' } : v))
        );
      }

      setSuccessMsg(`Reserva de ${nome} eliminada com sucesso.`);
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
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Gestão de Reservas de Viaturas
            </h1>
            <p className="text-xs text-slate-400">
              Crie, edite ou elimine reservas e atribua viaturas diretamente à frota da Esquadra 991.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Reserva</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por NIP, Nome, Destino ou Motivo..."
            className="bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-200">
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 font-mono">
          {(['TODOS', 'PENDENTE', 'APROVADO', 'REJEITADO', 'CONCLUIDO'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filtroEstado === st ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations List Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>A apresentar <strong className="text-emerald-400">{pedidosFiltrados.length}</strong> de {pedidos.length} reservas</span>
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel border border-dashed border-slate-800 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-xs font-mono">Nenhuma reserva encontrada com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosFiltrados.map((p) => {
              const assignedVtr = viaturas.find((v) => v.id === p.viatura_id);

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl glass-panel border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm font-mono">
                        {p.posto} {p.nome_utilizador}
                      </span>
                      <span className="font-mono text-emerald-400 text-xs font-bold">[{p.nip}]</span>
                      <span className="text-slate-500 text-xs">({p.email})</span>

                      {p.necessita_reboque && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 font-bold border border-amber-500/40 flex items-center space-x-1">
                          <Truck className="w-3 h-3" />
                          <span>REBOQUE</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-md text-xs font-mono font-bold ${
                          p.estado_pedido === 'APROVADO'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : p.estado_pedido === 'PENDENTE'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : p.estado_pedido === 'CONCLUIDO'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {p.estado_pedido}
                      </span>

                      <a
                        href={`mailto:${p.email}?subject=${encodeURIComponent(
                          `Esquadra 991 - Notificação da Reserva [${p.destino}]`
                        )}&body=${encodeURIComponent(
                          `Exmo. Militar ${p.posto} ${p.nome_utilizador} [NIP ${p.nip}],\n\nInformamos que o seu pedido de reserva de viatura para o destino ${p.destino} foi processado com o estado: ${p.estado_pedido}.\n\nCumprimentos,\nLogística Esquadra 991`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800 flex items-center space-x-1"
                        title="Enviar Email de Notificação ao Requerente"
                      >
                        <Mail className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                        title="Editar Reserva"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleApagarPedido(p.id, p.nome_utilizador)}
                        className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800"
                        title="Apagar Reserva"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">DESTINO</span>
                      <strong className="text-white text-sm">{p.destino}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">PERÍODO</span>
                      <span className="text-amber-300">
                        {new Date(p.data_inicio).toLocaleString()} ➔ {new Date(p.data_fim).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">VIATURA ATRIBUÍDA</span>
                      {assignedVtr ? (
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <Car className="w-3.5 h-3.5" />
                          <span>{assignedVtr.matricula} ({assignedVtr.modelo})</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Nenhuma viatura atribuída</span>
                      )}
                    </div>

                    <div className="sm:col-span-3 pt-1 border-t border-slate-800/80">
                      <span className="text-slate-500">MOTIVO DO SERVIÇO:</span>{' '}
                      <span className="text-slate-300">{p.motivo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT RESERVATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full glass-panel p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                {editingPedidoId ? 'Editar Reserva de Viatura' : 'Criar Nova Reserva de Viatura'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xs font-bold">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePedido} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">NIP do Militar *</label>
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Ex: 134890-A"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Posto / Graduação *</label>
                  <select
                    value={posto}
                    onChange={(e) => setPosto(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
                  >
                    {POSTOS_FORCA_AEREA.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={nomeUtilizador}
                    onChange={(e) => setNomeUtilizador(e.target.value)}
                    placeholder="Ex: Tenente Manuel Silva"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Email do Militar *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: silva@emfa.pt"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Data/Hora Saída *</label>
                  <input
                    type="datetime-local"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Data/Hora Regresso *</label>
                  <input
                    type="datetime-local"
                    required
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Destino do Serviço *</label>
                  <input
                    type="text"
                    required
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ex: Base Aérea Nº 1 - Sintra"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Motivo do Serviço *</label>
                  <textarea
                    required
                    rows={2}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Descreva a missão ou necessidade logística..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Viatura Atribuída</label>
                  <select
                    value={viaturaIdSelected}
                    onChange={(e) => setViaturaIdSelected(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold"
                  >
                    <option value="">Sem Viatura Atribuída</option>
                    {viaturas.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.matricula} - {v.modelo} ({v.km_atuais.toLocaleString()} KM) [{v.estado}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Estado do Pedido *</label>
                  <select
                    value={estadoPedido}
                    onChange={(e: any) => setEstadoPedido(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold"
                  >
                    <option value="PENDENTE">PENDENTE</option>
                    <option value="APROVADO">APROVADO</option>
                    <option value="REJEITADO">REJEITADO</option>
                    <option value="CONCLUIDO">CONCLUIDO</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <label className="flex items-center space-x-2 text-slate-200 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={necessitaReboque}
                    onChange={(e) => setNecessitaReboque(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Possui necessidade de Gancho de Reboque</span>
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
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow-lg shadow-emerald-950"
                >
                  Guardar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
