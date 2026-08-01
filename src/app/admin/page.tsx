'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Car, Clock, AlertTriangle, CheckCircle2, XCircle, Shield, Fuel, Wrench, Building, Check } from 'lucide-react';
import { supabase, Viatura, Pedido } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_PEDIDOS } from '@/lib/mock-data';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function AdminDashboardPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*');
        const { data: pData } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });

        setViaturas(vData && vData.length > 0 ? vData : MOCK_VIATURAS);
        setPedidos(pData && pData.length > 0 ? pData : MOCK_PEDIDOS);
      } catch (err) {
        console.error(err);
        setViaturas(MOCK_VIATURAS);
        setPedidos(MOCK_PEDIDOS);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const handleAprovarPedido = async (id: string) => {
    try {
      await supabase.from('pedidos').update({ estado_pedido: 'APROVADO' }).eq('id', id);
      setPedidos(pedidos.map((p) => (p.id === id ? { ...p, estado_pedido: 'APROVADO' } : p)));

      const ped = pedidos.find((p) => p.id === id);
      if (ped) {
        // Send approval email
        fetch('/api/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'APROVACAO_PEDIDO',
            emailDestinatario: ped.email,
            nome: ped.nome_utilizador,
            destino: ped.destino
          })
        }).catch(console.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejeitarPedido = async (id: string) => {
    try {
      await supabase.from('pedidos').update({ estado_pedido: 'REJEITADO' }).eq('id', id);
      setPedidos(pedidos.map((p) => (p.id === id ? { ...p, estado_pedido: 'REJEITADO' } : p)));
    } catch (err) {
      console.error(err);
    }
  };

  const totalDisponiveis = viaturas.filter((v) => v.estado === 'DISPONIVEL').length;
  const totalEmUso = viaturas.filter((v) => v.estado === 'EM_USO').length;
  const totalEmprestadas = viaturas.filter((v) => v.estado === 'EMPRESTADA_EXTERNO').length;
  const totalManutencao = viaturas.filter((v) => v.estado === 'MANUTENCAO').length;

  const pedidosPendentes = pedidos.filter((p) => p.estado_pedido === 'PENDENTE');

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-mono font-bold uppercase">Disponíveis</span>
            <Car className="w-4 h-4" />
          </div>
          <span className="text-3xl font-black text-white font-mono mt-1 block">{totalDisponiveis}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-blue-500/30">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-mono font-bold uppercase">Em Uso (Marcha)</span>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-3xl font-black text-white font-mono mt-1 block">{totalEmUso}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-purple-500/30">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-mono font-bold uppercase">Empréstimos Ext.</span>
            <Building className="w-4 h-4" />
          </div>
          <span className="text-3xl font-black text-white font-mono mt-1 block">{totalEmprestadas}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-rose-500/30">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-mono font-bold uppercase">Manutenção</span>
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-3xl font-black text-white font-mono mt-1 block">{totalManutencao}</span>
        </div>
      </div>

      {/* Realtime Fleet Map */}
      <div className="p-5 rounded-2xl glass-panel space-y-3">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Car className="w-4 h-4 text-emerald-400" />
          <span>Localização GPS da Frota em Tempo Real</span>
        </h2>
        <MapView viaturas={viaturas} />
      </div>

      {/* Direct Vehicle March Links Section (for NFC programming & quick access) */}
      <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
              <Car className="w-4 h-4" />
              <span>Gestão de Viaturas - Links Diretos para Tags NFC / Marcha</span>
            </h2>
            <p className="text-xs text-slate-400">
              Copie o link exato de cada viatura para programar as Tags NFC do porta-chaves ou aceder diretamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {viaturas.map((v) => {
            const path = `/chave/${v.qr_code_token}`;

            return (
              <div key={v.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-100 text-base">{v.matricula}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
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
                
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate" title={path}>
                    URL NFC: <span className="text-emerald-400 font-bold">{path}</span>
                  </span>

                  <a
                    href={path}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono text-center flex items-center justify-center space-x-1 shadow-md shadow-emerald-950 transition-colors"
                  >
                    <span>Abrir Página da Viatura ➔</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Requests */}
      <div className="p-5 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Pedidos de Viatura Pendentes de Aprovação ({pedidosPendentes.length})</span>
          </h2>
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
                  <p className="text-slate-500 font-mono">
                    Período: {new Date(p.data_inicio).toLocaleString()} ➔ {new Date(p.data_fim).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleAprovarPedido(p.id)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-md shadow-emerald-950"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar</span>
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
    </div>
  );
}
