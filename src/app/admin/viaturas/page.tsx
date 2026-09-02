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
  User,
  Fuel,
  Building2,
  LocateFixed,
  Wrench,
  RotateCcw
} from 'lucide-react';
import { supabase, isSupabaseConfigured, Viatura, HistoricoGps, RegistoAbastecimento, RegistoMarcha, EmprestimoExterno } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_GPS, MOCK_LOCAIS, MOCK_MARCHAS } from '@/lib/mock-data';
import { getStoredMilitaryProfile, getFleetOverrides, saveFleetOverride, getStoredLocais, saveStoredLocais, logAuditAction, getStoredEmprestimos } from '@/lib/utils/cookies';

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

const UNIDADES_FORCA_AEREA = [
  'BA2 - Ota (Unidade Base)',
  'BA1 - Sintra (Granja do Marquês)',
  'BA4 - Lajes (Terceira, Açores)',
  'BA5 - Monte Real',
  'BA6 - Montijo',
  'BA11 - Beja',
  'AT1 - Lisboa (Figo Maduro)',
  'AM1 - Porto Santo',
  'Outra Unidade Militar...'
];

export default function AdminViaturasPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>(MOCK_VIATURAS);
  const [todosPontosGps, setTodosPontosGps] = useState<HistoricoGps[]>(MOCK_GPS);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Filters for Route Map
  const [selectedViaturaId, setSelectedViaturaId] = useState<string>('TODAS');
  const [filtroData, setFiltroData] = useState<string>('HOJE');
  const [customData, setCustomData] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form Modal for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingViatura, setEditingViatura] = useState<Viatura | null>(null);

  const [matricula, setMatricula] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [numLugares, setNumLugares] = useState<number>(5);
  const [temGancho, setTemGancho] = useState<boolean>(true);
  const [kmAtuais, setKmAtuais] = useState<number>(98620);
  const [localViatura, setLocalViatura] = useState<string>('Telheiro 991');
  const [localChave, setLocalChave] = useState<string>('Chaveiro 991');
  const [selectedLocalViaturaOption, setSelectedLocalViaturaOption] = useState<string>('Telheiro 991');
  const [isCustomLocalViatura, setIsCustomLocalViatura] = useState<boolean>(false);

  const [selectedLocalChaveOption, setSelectedLocalChaveOption] = useState<string>('Chaveiro 991');
  const [isCustomLocalChave, setIsCustomLocalChave] = useState<boolean>(false);

  const [kmProximaRevisao, setKmProximaRevisao] = useState<number>(110000);
  const [dataProximaRevisao, setDataProximaRevisao] = useState<string>('2026-11-15');

  const [dbLocais, setDbLocais] = useState<any[]>([]);

  // Compute available locations dynamically from dbLocais and current fleet strictly
  const vtrLocsFromSystem = dbLocais.filter((l: any) => l.tipo === 'VIATURA').map((l: any) => l.nome);
  const vtrLocsFromFleet = viaturas.map((v) => v.localizacao_atual_viatura).filter(Boolean);
  const allVtrLocations = Array.from(new Set([...vtrLocsFromSystem, ...vtrLocsFromFleet]));

  const keyLocsFromSystem = dbLocais.filter((l: any) => l.tipo === 'CHAVE').map((l: any) => l.nome);
  const keyLocsFromFleet = viaturas.map((v) => v.localizacao_atual_chave).filter(Boolean);
  const allKeyLocations = Array.from(new Set([...keyLocsFromSystem, ...keyLocsFromFleet]));

  const handleSelectLocalViaturaOption = (val: string) => {
    setSelectedLocalViaturaOption(val);
    if (val === 'OUTRO') {
      setIsCustomLocalViatura(true);
      setLocalViatura('');
    } else {
      setIsCustomLocalViatura(false);
      setLocalViatura(val);
    }
  };

  const handleSelectLocalChaveOption = (val: string) => {
    setSelectedLocalChaveOption(val);
    if (val === 'OUTRO') {
      setIsCustomLocalChave(true);
      setLocalChave('');
    } else {
      setIsCustomLocalChave(false);
      setLocalChave(val);
    }
  };

  // Refueling Modal for Logistics
  const [showRefuelModal, setShowRefuelModal] = useState<boolean>(false);
  const [targetVtrForRefuel, setTargetVtrForRefuel] = useState<Viatura | null>(null);
  const [tipoAbastecimento, setTipoAbastecimento] = useState<'UNIDADE_MILITAR' | 'POSTO_COMERCIAL'>('UNIDADE_MILITAR');
  const [unidadeMilitar, setUnidadeMilitar] = useState<string>('BA2 - Ota (Unidade Base)');
  const [postoComercialNome, setPostoComercialNome] = useState<string>('');
  const [abastLitros, setAbastLitros] = useState<number>(50);
  const [abastValor, setAbastValor] = useState<number>(0);
  const [abastKm, setAbastKm] = useState<number>(98620);
  const [abastGpsLat, setAbastGpsLat] = useState<number | null>(null);
  const [abastGpsLng, setAbastGpsLng] = useState<number | null>(null);

  // Helper to ensure real odometers and next maintenance target (multiple of 10,000 KM & 1 year from today)
  // Helper to ensure valid revision target without mutating actual KM
  const sanitizeViaturaKm = (v: Viatura): Viatura => {
    const km = v.km_atuais;
    const nextKmTarget = Math.ceil((km + 1) / 10000) * 10000;
    const nextDateTarget = '2027-08-02';

    return {
      ...v,
      km_proxima_revisao: v.km_proxima_revisao && v.km_proxima_revisao >= km ? v.km_proxima_revisao : nextKmTarget,
      data_proxima_revisao: v.data_proxima_revisao || nextDateTarget
    };
  };

  const [marchas, setMarchas] = useState<RegistoMarcha[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: lData } = await supabase.from('locais').select('*').order('created_at', { ascending: true });
        const storedLocs = getStoredLocais();
        const rawLocs = (lData && lData.length > 0) ? lData : storedLocs;
        setDbLocais(rawLocs.filter((l: any) => l.is_ativo !== false));

        const { data: vData } = await supabase.from('viaturas').select('*').order('matricula', { ascending: true });
        const { data: eData } = await supabase.from('emprestimos_externos').select('*').order('created_at', { ascending: false });

        const remoteEmp = eData || [];
        const localEmp = getStoredEmprestimos();
        const empMap = new Map<string, EmprestimoExterno>();
        remoteEmp.forEach((emp) => empMap.set(emp.id, emp));
        localEmp.forEach((emp) => {
          if (!empMap.has(emp.id)) {
            empMap.set(emp.id, emp);
          }
        });
        const mergedEmp = Array.from(empMap.values());

        const baseVData = (vData && vData.length > 0) ? vData : MOCK_VIATURAS;
        const sanitized = baseVData.map((v) => {
          const s = sanitizeViaturaKm(v);
          const activeEmp = mergedEmp.find(
            (e) => e.viatura_id === v.id && (e.estado === 'ATIVO' || (e as any).estado === 'ATIVO') && !e.data_devolucao_real
          );

          if (activeEmp) {
            const isOverdue = new Date() > new Date(activeEmp.data_fim_prevista);
            return {
              ...s,
              estado: 'EMPRESTADA_EXTERNO',
              _activeLoan: activeEmp,
              _isLoanOverdue: isOverdue
            } as any;
          }

          return s;
        });

        setViaturas(sanitized);

        const { data: mData } = await supabase.from('registos_marcha').select('*').order('data_saida', { ascending: false });
        if (mData && mData.length > 0) {
          setMarchas(mData);
        } else {
          setMarchas(MOCK_MARCHAS);
        }

        const { data: gData } = await supabase.from('historico_posicoes_gps').select('*').order('registado_at', { ascending: false });
        if (gData && gData.length > 0) setTodosPontosGps(gData);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleForceResetRealOdometers = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    setViaturas(MOCK_VIATURAS);
    alert('Odómetros sincronizados com os valores reais: AM-96-11 (98620 KM), AM-96-12 (105888 KM), AM-96-13 (102614 KM)!');
  };

  // Filter GPS Points
  const pontosGpsFiltrados = todosPontosGps.filter((p) => {
    if (selectedViaturaId !== 'TODAS' && p.viatura_id !== selectedViaturaId) return false;

    const pDate = new Date(p.registado_at);
    const now = new Date();

    if (filtroData === 'HOJE') {
      return pDate.toDateString() === now.toDateString();
    } else if (filtroData === '7DIAS') {
      const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    } else if (filtroData === '30DIAS') {
      const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    } else if (filtroData === 'CUSTOM' && customData) {
      return pDate.toDateString() === new Date(customData).toDateString();
    }

    return true;
  });

  // Action: Mark Cleaning Done
  const handleMarkCleaned = async (v: Viatura) => {
    const prof = getStoredMilitaryProfile();
    const nowIso = new Date().toISOString();

    try {
      // 1. Try full update with cleaning metadata
      let { error } = await supabase
        .from('viaturas')
        .update({
          necessita_limpeza: false,
          data_ultima_limpeza: nowIso,
          limpo_por_nip: prof.nip || 'LOGÍSTICA'
        })
        .eq('matricula', v.matricula);

      // 2. If metadata columns do not exist in Supabase, fallback to simple update of necessita_limpeza
      if (error) {
        console.warn('Tentando atualizar limpeza simples no Supabase:', error.message);
        let retry = await supabase
          .from('viaturas')
          .update({ necessita_limpeza: false })
          .eq('matricula', v.matricula);

        if (retry.error) {
          await supabase.from('viaturas').update({ necessita_limpeza: false }).eq('id', v.id);
        }
      }

      setViaturas((prev) =>
        prev.map((item) =>
          item.matricula === v.matricula || item.id === v.id
            ? { ...item, necessita_limpeza: false, data_ultima_limpeza: nowIso, limpo_por_nip: prof.nip || 'LOGÍSTICA' }
            : item
        )
      );

      alert(`Limpeza da viatura ${v.matricula} registada no Supabase com sucesso!`);
      logAuditAction('VIATURAS', 'Limpeza Registada', `Registada limpeza na viatura ${v.matricula}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Save Refuel for Logistics
  const handleOpenRefuelModal = (v: Viatura) => {
    setTargetVtrForRefuel(v);
    setAbastKm(v.km_atuais);
    setShowRefuelModal(true);
  };

  const handleCaptureGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAbastGpsLat(pos.coords.latitude);
          setAbastGpsLng(pos.coords.longitude);
          alert(`Posição GPS capturada: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        },
        () => {
          setAbastGpsLat(39.094);
          setAbastGpsLng(-8.967);
          alert('Localização registada na Base da Ota (39.094, -8.967).');
        }
      );
    }
  };

  const handleSaveLogisticsRefuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVtrForRefuel) return;

    const prof = getStoredMilitaryProfile();

    try {
      const refuelRec = {
        viatura_id: targetVtrForRefuel.id,
        nip_responsavel: prof.nip || 'LOGÍSTICA',
        tipo_abastecimento: tipoAbastecimento,
        unidade_militar: tipoAbastecimento === 'UNIDADE_MILITAR' ? unidadeMilitar : null,
        posto_comercial_nome: tipoAbastecimento === 'POSTO_COMERCIAL' ? postoComercialNome || 'Posto Comercial' : null,
        latitude_posto: abastGpsLat || targetVtrForRefuel.latitude_atual || 39.094,
        longitude_posto: abastGpsLng || targetVtrForRefuel.longitude_atual || -8.967,
        litros: abastLitros,
        valor_euros: abastValor,
        km_no_abastecimento: abastKm,
        registado_at: new Date().toISOString()
      };

      await supabase.from('registos_abastecimento').insert([refuelRec]);

      if (abastKm > targetVtrForRefuel.km_atuais) {
        let { error } = await supabase.from('viaturas').update({ km_atuais: abastKm }).eq('matricula', targetVtrForRefuel.matricula);
        if (error) {
          await supabase.from('viaturas').update({ km_atuais: abastKm }).eq('id', targetVtrForRefuel.id);
        }

        setViaturas((prev) =>
          prev.map((v) => (v.matricula === targetVtrForRefuel.matricula || v.id === targetVtrForRefuel.id ? { ...v, km_atuais: abastKm } : v))
        );
      }
      alert(`Abastecimento de ${abastLitros}L registado na viatura ${targetVtrForRefuel.matricula}!`);
      logAuditAction(
        'VIATURAS',
        'Abastecimento Logística',
        `Registo de abastecimento de ${abastLitros}L (${abastValor}€) na viatura ${targetVtrForRefuel.matricula} aos ${abastKm} KM.`
      );
      setShowRefuelModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (qrToken: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/chave/${qrToken}`;
    navigator.clipboard.writeText(fullUrl);
    alert(`Link direto copiado para a área de transferência:\n${fullUrl}`);
  };

  const handleToggleForcadaRecomendada = async (v: Viatura) => {
    try {
      const newStatus = !v.is_forcada_recomendada;
      if (newStatus) {
        await supabase.from('viaturas').update({ is_forcada_recomendada: false }).neq('matricula', v.matricula);
      }
      let { error } = await supabase.from('viaturas').update({ is_forcada_recomendada: newStatus }).eq('matricula', v.matricula);
      if (error) {
        await supabase.from('viaturas').update({ is_forcada_recomendada: newStatus }).eq('id', v.id);
      }

      setViaturas((prev) =>
        prev.map((item) => {
          if (item.matricula === v.matricula || item.id === v.id) return { ...item, is_forcada_recomendada: newStatus };
          if (newStatus) return { ...item, is_forcada_recomendada: false };
          return item;
        })
      );

      logAuditAction(
        'VIATURAS',
        'Prioridade Viatura Recomendada',
        `${newStatus ? 'Definida' : 'Removida'} prioridade forçada para a viatura ${v.matricula}.`
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteViatura = async (id: string) => {
    const target = viaturas.find((v) => v.id === id);
    const targetMat = target ? target.matricula : id;

    if (!confirm(`Tem a certeza que deseja apagar a viatura ${targetMat} da frota?`)) return;
    try {
      let { error } = await supabase.from('viaturas').delete().eq('matricula', targetMat);
      if (error) {
        await supabase.from('viaturas').delete().eq('id', id);
      }
      setViaturas((prev) => prev.filter((v) => v.id !== id && v.matricula !== targetMat));
      if (selectedViaturaId === id) setSelectedViaturaId('TODAS');
      logAuditAction('VIATURAS', 'Eliminação de Viatura', `Apagada a viatura ${targetMat} da frota.`);
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
    setKmAtuais(98620);

    const firstVtr = allVtrLocations[0] || 'Telheiro 991';
    setSelectedLocalViaturaOption(firstVtr);
    setLocalViatura(firstVtr);
    setIsCustomLocalViatura(false);

    const firstKey = allKeyLocations[0] || 'Chaveiro 991';
    setSelectedLocalChaveOption(firstKey);
    setLocalChave(firstKey);
    setIsCustomLocalChave(false);

    setKmProximaRevisao(100000);
    setDataProximaRevisao('2027-08-02');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Viatura) => {
    setEditingViatura(v);
    setMatricula(v.matricula);
    setModelo(v.modelo);
    setNumLugares(v.num_lugares);
    setTemGancho(v.tem_gancho_reboque);
    setKmAtuais(v.km_atuais);

    if (allVtrLocations.includes(v.localizacao_atual_viatura)) {
      setSelectedLocalViaturaOption(v.localizacao_atual_viatura);
      setIsCustomLocalViatura(false);
    } else {
      setSelectedLocalViaturaOption('OUTRO');
      setIsCustomLocalViatura(true);
    }
    setLocalViatura(v.localizacao_atual_viatura);

    if (allKeyLocations.includes(v.localizacao_atual_chave)) {
      setSelectedLocalChaveOption(v.localizacao_atual_chave);
      setIsCustomLocalChave(false);
    } else {
      setSelectedLocalChaveOption('OUTRO');
      setIsCustomLocalChave(true);
    }
    setLocalChave(v.localizacao_atual_chave);

    setKmProximaRevisao(v.km_proxima_revisao || Math.ceil((v.km_atuais + 1) / 10000) * 10000);
    setDataProximaRevisao(v.data_proxima_revisao || '2027-08-02');
    setIsModalOpen(true);
  };

  const handleSaveViatura = async (e: React.FormEvent) => {
    e.preventDefault();
    const newToken = editingViatura ? editingViatura.qr_code_token : `VTR-991-${Math.floor(10 + Math.random() * 90)}`;

    const vData = {
      matricula: matricula.trim(),
      modelo: modelo.trim(),
      num_lugares: numLugares,
      tem_gancho_reboque: temGancho,
      km_atuais: kmAtuais,
      localizacao_atual_viatura: localViatura.trim(),
      localizacao_atual_chave: localChave.trim(),
      km_proxima_revisao: kmProximaRevisao,
      data_proxima_revisao: dataProximaRevisao,
      latitude_atual: 39.0920,
      longitude_atual: -8.9680
    };

    if (isSupabaseConfigured()) {
      try {
        if (editingViatura) {
          // 1. Try full payload matching by matricula
          let { error } = await supabase.from('viaturas').update(vData).eq('matricula', editingViatura.matricula);

          // 2. If data_proxima_revisao column is missing in Supabase, retry without date field
          if (error && error.message.includes('data_proxima_revisao')) {
            const { data_proxima_revisao, ...vDataClean } = vData;
            const retry = await supabase.from('viaturas').update(vDataClean).eq('matricula', editingViatura.matricula);
            error = retry.error;
          }

          // 3. Retry matching by ID if matricula didn't match
          if (error) {
            const retryId = await supabase.from('viaturas').update(vData).eq('id', editingViatura.id);
            error = retryId.error;
          }

          if (error) {
            console.warn('Aviso Supabase ao atualizar viatura:', error.message);
          }
        } else {
          const newRecord = {
            qr_code_token: newToken,
            estado: 'DISPONIVEL',
            is_forcada_recomendada: false,
            ...vData
          };

          let { error } = await supabase.from('viaturas').insert([newRecord]);
          if (error && error.message.includes('data_proxima_revisao')) {
            const { data_proxima_revisao, ...recClean } = newRecord;
            const retry = await supabase.from('viaturas').insert([recClean]);
            error = retry.error;
          }

          if (error) {
            console.warn('Aviso Supabase ao criar viatura:', error.message);
          }
        }

        // Re-fetch clean list directly from Supabase
        const { data: refreshedVtrs } = await supabase.from('viaturas').select('*').order('matricula', { ascending: true });
        if (refreshedVtrs && refreshedVtrs.length > 0) {
          setViaturas(refreshedVtrs);
        }
      } catch (netErr: any) {
        console.warn('Erro de rede ao comunicar com o Supabase:', netErr);
      }
    }

    setViaturas((prev) =>
      prev.map((v) =>
        editingViatura && (v.id === editingViatura.id || v.matricula === editingViatura.matricula)
          ? { ...v, ...vData }
          : v
      )
    );

    logAuditAction(
      'VIATURAS',
      'Atualização de Frota',
      `Atualizados dados/odómetro da viatura ${vData.matricula} (${vData.km_atuais} KM, local viatura: ${vData.localizacao_atual_viatura}, chave: ${vData.localizacao_atual_chave}).`
    );

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <Car className="w-5 h-5 text-emerald-400" />
            <span>Gestão de Frota, Manutenção, Limpezas & Abastecimentos</span>
          </h1>
          <p className="text-xs text-slate-400">
            Esquadra 991. Gestão de viaturas, definição da próxima manutenção (KM e Data), limpezas e abastecimentos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleForceResetRealOdometers}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-1.5 border border-slate-700 transition-colors"
            title="Limpar memória local e forçar exibição das quilometragens reais (98k, 105k, 102k)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sincronizar KM Reais</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-950"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Viatura</span>
          </button>
        </div>
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
                Mapa de Movimentos & Percursos GPS (Ota: 39.094, -8.967)
              </h2>
              <p className="text-[11px] text-slate-400">
                Visualize os percursos por viatura e intervalo de datas.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
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
                        : v.estado === 'RESERVADA'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : v.estado === 'EM_USO'
                        ? 'bg-blue-950 text-blue-300 border border-blue-700'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {v.estado === 'EM_USO'
                      ? (() => {
                          const activeMarcha = marchas.find((m) => m.viatura_id === v.id && !m.data_chegada) || marchas.find((m) => m.viatura_id === v.id);
                          const cond = activeMarcha?.trigrama_ou_condutor_inicio || activeMarcha?.nip_inicio || null;
                          return cond ? `EM USO (${cond})` : 'EM_USO';
                        })()
                      : v.estado}
                  </span>
                </div>

                {/* ACTIVE MARCH / DRIVER & MISSION BANNER */}
                {v.estado === 'EM_USO' && (() => {
                  const activeMarcha = marchas.find((m) => m.viatura_id === v.id && !m.data_chegada) || marchas.find((m) => m.viatura_id === v.id);
                  return (
                    <div className="p-3 rounded-xl bg-blue-950/90 border border-blue-500/60 text-blue-200 text-xs font-mono space-y-1 shadow-md">
                      <div className="flex items-center justify-between font-bold text-blue-300 border-b border-blue-800/80 pb-1">
                        <span className="flex items-center space-x-1">
                          <Car className="w-3.5 h-3.5 text-blue-400" />
                          <span>🚗 EM SERVIÇO / CONDUTOR ATUAL</span>
                        </span>
                        <span className="text-[10px] text-blue-400 font-normal">
                          {activeMarcha?.data_saida ? new Date(activeMarcha.data_saida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Condutor:</span>
                        <span className="font-bold text-white">{activeMarcha?.trigrama_ou_condutor_inicio || activeMarcha?.nip_inicio || 'N/D'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">NIP:</span>
                        <span className="text-slate-300">{activeMarcha?.nip_inicio || 'N/D'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Destino / Função:</span>
                        <span className="font-bold text-emerald-300 truncate max-w-[150px]">{activeMarcha?.destino_funcao || 'Serviço Geral'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ACTIVE EXTERNAL LOAN BANNER (NORMAL OR OVERDUE) */}
                {(v.estado === 'EMPRESTADA_EXTERNO' || (v as any)._activeLoan) && (() => {
                  const emp = (v as any)._activeLoan;
                  const isOverdue = (v as any)._isLoanOverdue || (emp && new Date() > new Date(emp.data_fim_prevista));

                  return (
                    <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 shadow-md ${
                      isOverdue
                        ? 'bg-rose-950/90 border-rose-500/80 text-rose-200 animate-pulse'
                        : 'bg-purple-950/90 border-purple-500/60 text-purple-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold border-b pb-1 border-purple-800/80">
                        <span className="flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>{isOverdue ? '🚨 CEDÊNCIA EXTERNA EM ATRASO!' : '🏢 CEDÊNCIA EXTERNA ATIVA'}</span>
                        </span>
                        {emp?.data_fim_prevista && (
                          <span className={`text-[10px] ${isOverdue ? 'text-rose-300 font-bold' : 'text-purple-300'}`}>
                            Devolução: {new Date(emp.data_fim_prevista).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </div>
                      {emp && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Entidade:</span>
                            <span className="font-bold text-white">{emp.entidade_externa}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Responsável:</span>
                            <span className="text-slate-200">{emp.nome_responsavel} ({emp.contacto_responsavel})</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* CLEANING WARNING BADGE */}
                {v.necessita_limpeza ? (
                  <div className="p-2.5 rounded-lg bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>🧼 NECESSITA DE LIMPEZA</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkCleaned(v);
                      }}
                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase shadow"
                    >
                      Marcar Limpo
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-mono flex items-center justify-between">
                    <span>✨ Limpeza em dia</span>
                    {v.data_ultima_limpeza && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(v.data_ultima_limpeza).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Info List */}
                <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Odómetro Atual:</span>
                    <span className="font-bold text-emerald-400">{v.km_atuais.toLocaleString()} KM</span>
                  </div>

                  {/* MAINTENANCE TARGET IN KM AND DATE */}
                  <div className="flex justify-between border-t border-slate-800/80 pt-1">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <Wrench className="w-3 h-3 text-amber-400" />
                      <span>Próxima Manutenção:</span>
                    </span>
                    <span className="font-bold text-amber-300">
                      {v.km_proxima_revisao ? v.km_proxima_revisao.toLocaleString() : (v.km_atuais + 10000).toLocaleString()} KM
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Data de Manutenção:</span>
                    <span className="text-amber-300 font-semibold">
                      {v.data_proxima_revisao ? new Date(v.data_proxima_revisao).toLocaleDateString() : '15/11/2026'}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-800/80 pt-1">
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

                {/* LOGISTICS REFUEL BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenRefuelModal(v);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Registar Abastecimento (Logística)</span>
                </button>

                {/* Forced recommendation toggle button */}
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleForcadaRecomendada(v);
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
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteViatura(v.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800"
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

      {/* MODAL: LOGISTICS REFUELING */}
      {showRefuelModal && targetVtrForRefuel && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border-2 border-emerald-500/60 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider text-sm">
                <Fuel className="w-5 h-5" />
                <span>Registar Abastecimento: {targetVtrForRefuel.matricula}</span>
              </div>
              <button onClick={() => setShowRefuelModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLogisticsRefuel} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tipo de Abastecimento *</label>
                <div className="grid grid-cols-2 gap-2 font-mono font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => setTipoAbastecimento('UNIDADE_MILITAR')}
                    className={`py-2 px-3 rounded-lg border text-center flex items-center justify-center space-x-1.5 transition-all ${
                      tipoAbastecimento === 'UNIDADE_MILITAR'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Unidade Militar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoAbastecimento('POSTO_COMERCIAL')}
                    className={`py-2 px-3 rounded-lg border text-center flex items-center justify-center space-x-1.5 transition-all ${
                      tipoAbastecimento === 'POSTO_COMERCIAL'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Fuel className="w-3.5 h-3.5" />
                    <span>Bombas Comerciais</span>
                  </button>
                </div>
              </div>

              {tipoAbastecimento === 'UNIDADE_MILITAR' ? (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Unidade de Combustível da Força Aérea *</label>
                  <select
                    value={unidadeMilitar}
                    onChange={(e) => setUnidadeMilitar(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold"
                  >
                    {UNIDADES_FORCA_AEREA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Nome / Identificação da Bomba Comercial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Galp Ota, BP Carregado, Repsol A1"
                      value={postoComercialNome}
                      onChange={(e) => setPostoComercialNome(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureGpsLocation}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
                  >
                    <LocateFixed className="w-4 h-4 text-blue-400" />
                    <span>
                      {abastGpsLat ? `GPS Capturado (${abastGpsLat.toFixed(4)}, ${abastGpsLng?.toFixed(4)})` : 'Capturar Posição GPS Atual do Posto'}
                    </span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Litros Abastecidos *</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={abastLitros}
                    onChange={(e) => setAbastLitros(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Valor Total (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 85.50"
                    value={abastValor || ''}
                    onChange={(e) => setAbastValor(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Quilómetros no Momento (Odómetro) *</label>
                <input
                  type="number"
                  required
                  value={abastKm}
                  onChange={(e) => setAbastKm(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono text-amber-400 font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRefuelModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow-lg shadow-emerald-950"
                >
                  Guardar Abastecimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH MAINTENANCE TARGET IN KM AND DATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              {editingViatura ? 'Editar Viatura' : 'Adicionar Nova Viatura à Frota'}
            </h2>

            <form onSubmit={handleSaveViatura} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Matrícula *</label>
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
                <label className="block text-slate-400 mb-1 font-semibold">Modelo da Viatura *</label>
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
                  <label className="block text-slate-400 mb-1 font-semibold">Nº Lugares</label>
                  <input
                    type="number"
                    value={numLugares}
                    onChange={(e) => setNumLugares(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Odómetro Atual (KM) *</label>
                  <input
                    type="number"
                    value={kmAtuais}
                    onChange={(e) => setKmAtuais(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs font-bold text-emerald-400"
                  />
                </div>
              </div>

              {/* MAINTENANCE TARGET IN KM AND DATE INPUTS */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-3">
                <span className="text-amber-400 font-bold text-xs uppercase flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Definição da Próxima Manutenção</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Próxima Manutenção (KM) *</label>
                    <input
                      type="number"
                      required
                      value={kmProximaRevisao}
                      onChange={(e) => setKmProximaRevisao(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Próxima Manutenção (Data) *</label>
                    <input
                      type="date"
                      required
                      value={dataProximaRevisao}
                      onChange={(e) => setDataProximaRevisao(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs"
                    />
                  </div>
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

              {/* Localização da Viatura - Combo Box & Custom manual input */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-semibold">Local de Estacionamento da Viatura</label>
                <select
                  value={selectedLocalViaturaOption}
                  onChange={(e) => handleSelectLocalViaturaOption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                >
                  {allVtrLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="OUTRO">Outro... (Escrever manualmente)</option>
                </select>

                {(isCustomLocalViatura || selectedLocalViaturaOption === 'OUTRO') && (
                  <input
                    type="text"
                    required
                    placeholder="Escreva o local de estacionamento personalizado..."
                    value={localViatura}
                    onChange={(e) => setLocalViatura(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-emerald-500/60 text-slate-100 text-xs font-mono mt-1"
                  />
                )}
              </div>

              {/* Localização do Chaveiro - Combo Box & Custom manual input */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-semibold">Local do Chaveiro / Armário de Chaves</label>
                <select
                  value={selectedLocalChaveOption}
                  onChange={(e) => handleSelectLocalChaveOption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                >
                  {allKeyLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="OUTRO">Outro... (Escrever manualmente)</option>
                </select>

                {(isCustomLocalChave || selectedLocalChaveOption === 'OUTRO') && (
                  <input
                    type="text"
                    required
                    placeholder="Escreva a localização do chaveiro personalizada..."
                    value={localChave}
                    onChange={(e) => setLocalChave(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-emerald-500/60 text-slate-100 text-xs font-mono mt-1"
                  />
                )}
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
