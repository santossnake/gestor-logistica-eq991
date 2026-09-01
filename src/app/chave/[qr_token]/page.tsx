'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Car,
  Key,
  Play,
  Square,
  RefreshCcw,
  Camera,
  MapPin,
  Fuel,
  CheckSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  User,
  Shield,
  Briefcase,
  AlertCircle,
  Navigation,
  Info,
  Wrench,
  Siren,
  Building2,
  LocateFixed
} from 'lucide-react';
import { getStoredMilitaryProfile, saveMilitaryProfile, saveFleetOverride, getFleetOverrides, getStoredLocais, getStoredMarchas, saveStoredMarchas, getStoredEmprestimos, MilitaryProfile } from '@/lib/utils/cookies';
import { supabase, isSupabaseConfigured, Viatura, LocalItem, RegistoMarcha, EmprestimoExterno } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_LOCAIS, MOCK_MARCHAS } from '@/lib/mock-data';
import { LiveGpsTracker } from '@/components/LiveGpsTracker';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

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

export default function ChavePage() {
  const params = useParams();
  const router = useRouter();
  const qrToken = (params?.qr_token as string) || '';

  const initialV = MOCK_VIATURAS.find((item) => item.qr_code_token === qrToken) || MOCK_VIATURAS[0];

  const [viatura, setViatura] = useState<Viatura>(initialV);
  const [locaisChave, setLocaisChave] = useState<LocalItem[]>(MOCK_LOCAIS.filter((l) => l.tipo === 'CHAVE'));
  const [locaisViatura, setLocaisViatura] = useState<LocalItem[]>(MOCK_LOCAIS.filter((l) => l.tipo === 'VIATURA'));
  const [marchaAtiva, setMarchaAtiva] = useState<RegistoMarcha | null>(null);

  const [profile, setProfile] = useState<MilitaryProfile>({ nip: '', nome: '', posto: 'Tenente', email: '' });
  const [isGpsTrackingActive, setIsGpsTrackingActive] = useState<boolean>(false);

  // Form states for Início / Troca de Marcha
  const [kmInicialInput, setKmInicialInput] = useState<number>(initialV.km_atuais);
  const [isAtribuicaoModo, setIsAtribuicaoModo] = useState<boolean>(false);
  const [condutorQueEntrega, setCondutorQueEntrega] = useState<string>('');

  // Form states for Finalizar Marcha
  const [kmFinalInput, setKmFinalInput] = useState<number>(initialV.km_atuais);
  const [nivelCombustivel, setNivelCombustivel] = useState<'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO'>('CHEIO');
  const [abasteceu, setAbasteceu] = useState<boolean>(false);
  const [litros, setLitros] = useState<number>(0);
  const [valorEuros, setValorEuros] = useState<number>(0);
  const [locChaveSelected, setLocChaveSelected] = useState<string>('Chaveiro 991');
  const [locViaturaSelected, setLocViaturaSelected] = useState<string>('Telheiro 991');
  const [customLocChave, setCustomLocChave] = useState<string>('');
  const [customLocViatura, setCustomLocViatura] = useState<string>('');

  const [checkDocs, setCheckDocs] = useState<boolean>(true);
  const [checkCartao, setCheckCartao] = useState<boolean>(true);
  const [checkSeguranca, setCheckSeguranca] = useState<boolean>(true);
  const [necessitaLimpeza, setNecessitaLimpeza] = useState<boolean>(initialV.necessita_limpeza || false);

  // Anomalia Modal
  const [showReportIssueModal, setShowReportIssueModal] = useState<boolean>(false);
  const [tipoAnomalia, setTipoAnomalia] = useState<string>('Luz de Manutenção / Avaria no Painel');
  const [descricaoAnomalia, setDescricaoAnomalia] = useState<string>('');
  const [gravidadeAnomalia, setGravidadeAnomalia] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('MODERADA');
  const [issueReportedSuccess, setIssueReportedSuccess] = useState<boolean>(false);

  // Abastecimento Modal (Unidade / Posto Comercial)
  const [showRefuelModal, setShowRefuelModal] = useState<boolean>(false);
  const [tipoAbastecimento, setTipoAbastecimento] = useState<'UNIDADE_MILITAR' | 'POSTO_COMERCIAL'>('UNIDADE_MILITAR');
  const [unidadeMilitar, setUnidadeMilitar] = useState<string>('BA2 - Ota (Unidade Base)');
  const [postoComercialNome, setPostoComercialNome] = useState<string>('');
  const [abastLitros, setAbastLitros] = useState<number>(45);
  const [abastValor, setAbastValor] = useState<number>(0);
  const [abastKm, setAbastKm] = useState<number>(initialV.km_atuais);
  const [abastGpsLat, setAbastGpsLat] = useState<number | null>(null);
  const [abastGpsLng, setAbastGpsLng] = useState<number | null>(null);
  const [refuelSuccess, setRefuelSuccess] = useState<boolean>(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'INICIAR' | 'ALTERNAR' | 'FINALIZAR'>('INICIAR');
  const [showCloseSuccessModal, setShowCloseSuccessModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const prof = getStoredMilitaryProfile();
    setProfile(prof);

    async function loadData() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*').eq('qr_code_token', qrToken).single();
        if (vData) {
          let km = vData.km_atuais;
          if (vData.matricula === 'AM-96-11' && km < 98620) km = 98620;
          if (vData.matricula === 'AM-96-12' && km < 105888) km = 105888;
          if (vData.matricula === 'AM-96-13' && km < 102614) km = 102614;

          const sanitized = { ...vData, km_atuais: km };
          setViatura(sanitized);
          setKmInicialInput(km);
          setKmFinalInput(km);
          setAbastKm(km);
          setNecessitaLimpeza(vData.necessita_limpeza);
        }

        const { data: lData } = await supabase.from('locais').select('*').order('created_at', { ascending: true });
        const storedLocs = getStoredLocais();
        const rawLocais = lData && lData.length > 0 ? lData : storedLocs;
        const activeLocais = rawLocais.filter((l: any) => l.is_ativo !== false);

        if (activeLocais.length > 0) {
          const chaves = activeLocais.filter((l: any) => l.tipo === 'CHAVE');
          const vtrs = activeLocais.filter((l: any) => l.tipo === 'VIATURA');
          setLocaisChave(chaves);
          setLocaisViatura(vtrs);

          const defChave = chaves.find((c: any) => c.is_predefinido) || chaves[0];
          const defVtr = vtrs.find((v: any) => v.is_predefinido) || vtrs[0];
          if (defChave) setLocChaveSelected(defChave.nome);
          if (defVtr) setLocViaturaSelected(defVtr.nome);
        }

        const targetV = vData || initialV;

        // Check if there is an active external loan for this vehicle
        const { data: eData } = await supabase
          .from('emprestimos_externos')
          .select('*')
          .eq('viatura_id', targetV.id);

        const localEmp = getStoredEmprestimos().filter((e) => e.viatura_id === targetV.id);
        const remoteEmp = eData || [];
        const empMap = new Map<string, EmprestimoExterno>();
        remoteEmp.forEach((e) => empMap.set(e.id, e));
        localEmp.forEach((e) => {
          if (!empMap.has(e.id)) empMap.set(e.id, e);
        });

        const activeLoan = Array.from(empMap.values()).find(
          (e) => (e.estado === 'ATIVO' || (e as any).estado === 'ATIVO') && !e.data_devolucao_real
        );

        if (activeLoan) {
          const isOverdue = new Date() > new Date(activeLoan.data_fim_prevista);
          setViatura({
            ...targetV,
            estado: 'EMPRESTADA_EXTERNO',
            _activeLoan: activeLoan,
            _isLoanOverdue: isOverdue
          } as any);
        }

        const { data: mData } = await supabase
          .from('registos_marcha')
          .select('*')
          .eq('viatura_id', targetV.id)
          .is('data_chegada', null)
          .order('data_saida', { ascending: false })
          .limit(1);

        if (mData && mData.length > 0) {
          setMarchaAtiva(mData[0]);
          setActiveTab('FINALIZAR');
          setIsGpsTrackingActive(true);
        } else if (targetV.estado === 'EM_USO') {
          setActiveTab('FINALIZAR');
          setIsGpsTrackingActive(true);
        }
      } catch (err) {
        console.error('Carregamento assíncrono:', err);
      }
    }

    if (qrToken) {
      loadData();
    }
  }, [qrToken]);

  // Capture GPS location for Refueling Station
  const handleCaptureGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAbastGpsLat(pos.coords.latitude);
          setAbastGpsLng(pos.coords.longitude);
          alert(`Posição GPS capturada com sucesso: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        },
        () => {
          setAbastGpsLat(39.094);
          setAbastGpsLng(-8.967);
          alert('Localização aproximada registada na Base da Ota (39.094, -8.967).');
        }
      );
    }
  };

  // Handler: Save Refueling Record
  const handleSaveRefuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.nip) {
      alert('Por favor introduza o seu NIP.');
      return;
    }

    try {
      const refuelRec = {
        viatura_id: viatura.id,
        registo_marcha_id: marchaAtiva?.id,
        nip_responsavel: profile.nip,
        tipo_abastecimento: tipoAbastecimento,
        unidade_militar: tipoAbastecimento === 'UNIDADE_MILITAR' ? unidadeMilitar : null,
        posto_comercial_nome: tipoAbastecimento === 'POSTO_COMERCIAL' ? postoComercialNome || 'Posto Comercial Externo' : null,
        latitude_posto: abastGpsLat || viatura.latitude_atual || 39.094,
        longitude_posto: abastGpsLng || viatura.longitude_atual || -8.967,
        litros: abastLitros,
        valor_euros: abastValor,
        km_no_abastecimento: abastKm,
        registado_at: new Date().toISOString()
      };

      await supabase.from('registos_abastecimento').insert([refuelRec]);

      setRefuelSuccess(true);
      setTimeout(() => {
        setRefuelSuccess(false);
        setShowRefuelModal(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Report In-Trip Issue
  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoAnomalia) return;

    try {
      const fullDesc = `[${tipoAnomalia}] ${descricaoAnomalia}`;

      await supabase.from('anomalias').insert([
        {
          viatura_id: viatura.id,
          registo_marcha_id: marchaAtiva?.id,
          descricao: fullDesc,
          gravidade: gravidadeAnomalia,
          latitude_incidente: viatura.latitude_atual || 39.094,
          longitude_incidente: viatura.longitude_atual || -8.967,
          estado_anomalia: 'PENDENTE'
        }
      ]);

      if (gravidadeAnomalia === 'GRAVE') {
        await supabase.from('viaturas').update({ estado: 'MANUTENCAO' }).eq('id', viatura.id);
        setViatura({ ...viatura, estado: 'MANUTENCAO' });
      }

      await supabase.from('historico_posicoes_gps').insert([
        {
          viatura_id: viatura.id,
          registo_marcha_id: marchaAtiva?.id,
          nip_operador: profile.nip || 'DESCONHECIDO',
          latitude: viatura.latitude_atual || 39.094,
          longitude: viatura.longitude_atual || -8.967,
          tipo_evento: 'INCIDENTE',
          registado_at: new Date().toISOString()
        }
      ]);

      setIssueReportedSuccess(true);
      setTimeout(() => {
        setIssueReportedSuccess(false);
        setShowReportIssueModal(false);
        setDescricaoAnomalia('');
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Iniciar Marcha
  const handleIniciarMarcha = async () => {
    if (!viatura || !profile.trigramaOuCondutor || !profile.destinoFuncao) {
      setErrorMsg('Por favor preencha os campos obrigatórios (Trigrama ou Posto e Nome, Destino / Função).');
      return;
    }

    const nipVal = profile.nip && profile.nip.trim() ? profile.nip.trim() : 'N/D';
    const profileToSave = { ...profile, nip: nipVal };
    saveMilitaryProfile(profileToSave);
    setErrorMsg('');

    try {
      const newMarcha = {
        viatura_id: viatura.id,
        nip_inicio: nipVal,
        trigrama_ou_condutor_inicio: profile.trigramaOuCondutor,
        destino_funcao: profile.destinoFuncao,
        km_inicial: kmInicialInput,
        data_saida: new Date().toISOString()
      };

      let marchaRec: any = null;

      if (isSupabaseConfigured()) {
        try {
          let { data, error } = await supabase.from('registos_marcha').insert([newMarcha]).select();

          // Fallback if Supabase DB table has not run the column migration script yet
          if (error && (error.message.includes('trigrama') || error.message.includes('destino_funcao'))) {
            console.warn('Aviso: Colunas de condutor/destino em falta no Supabase, a guardar payload base:', error.message);
            const { trigrama_ou_condutor_inicio, destino_funcao, ...cleanPayload } = newMarcha;
            const retry = await supabase.from('registos_marcha').insert([cleanPayload]).select();
            data = retry.data;
          }

          if (data && data.length > 0) {
            marchaRec = data[0];
          }
        } catch (netErr: any) {
          console.warn('Erro de rede ao registar marcha no Supabase:', netErr);
        }
      }

      marchaRec = marchaRec || { id: `mar-${Date.now()}`, ...newMarcha };
      setMarchaAtiva(marchaRec);

      // Always save to local storage mirror
      const currentMarchas = getStoredMarchas();
      saveStoredMarchas([marchaRec, ...currentMarchas.filter((m: any) => m.id !== marchaRec.id)]);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('viaturas').update({ estado: 'EM_USO', km_atuais: kmInicialInput }).eq('id', viatura.id);
        } catch (netErr: any) {
          console.warn('Erro de rede ao atualizar estado da viatura no Supabase:', netErr);
        }
      }

      saveFleetOverride(viatura.id, { estado: 'EM_USO', km_atuais: kmInicialInput });

      setViatura({ ...viatura, estado: 'EM_USO', km_atuais: kmInicialInput });
      setIsGpsTrackingActive(true);
      setActiveTab('FINALIZAR');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao iniciar marcha.');
    }
  };

  // Handler: Alternar Condutor (Suporta Assumir com GPS e Transferir sem GPS)
  const handleAlternarCondutor = async (isAssumirNoProprioTelemovel: boolean = false) => {
    if (!viatura || !profile.trigramaOuCondutor) {
      setErrorMsg('Por favor introduza o Trigrama / Posto e Nome do novo condutor.');
      return;
    }
    const nipVal = profile.nip && profile.nip.trim() ? profile.nip.trim() : 'N/D';
    saveMilitaryProfile({ ...profile, nip: nipVal });
    setErrorMsg('');

    const now = new Date().toISOString();
    const currentKm = viatura.km_atuais || kmInicialInput;

    try {
      // 1. FECHO DA MARCHA ANTERIOR (Grava registo de devolução/entrega)
      if (marchaAtiva) {
        const entregouVal = condutorQueEntrega && condutorQueEntrega.trim() ? condutorQueEntrega.trim() : (marchaAtiva.trigrama_ou_condutor_inicio || profile.trigramaOuCondutor);
        const updatePayload = {
          nip_fim: nipVal,
          trigrama_ou_condutor_fim: entregouVal,
          km_final: currentKm,
          localizacao_chave: viatura.localizacao_atual_chave || 'Em Troca de Serviço',
          localizacao_viatura: viatura.localizacao_atual_viatura || 'Em Troca de Serviço',
          data_chegada: now
        };

        if (isSupabaseConfigured()) {
          try {
            let { error } = await supabase.from('registos_marcha').update(updatePayload).eq('id', marchaAtiva.id);
            if (error && (error.message.includes('trigrama') || error.message.includes('destino_funcao'))) {
              const { trigrama_ou_condutor_fim, ...cleanUpdate } = updatePayload;
              await supabase.from('registos_marcha').update(cleanUpdate).eq('id', marchaAtiva.id);
            }
          } catch (netErr: any) {
            console.warn('Erro de rede ao encerrar marcha anterior no Supabase:', netErr);
          }
        }

        // Atualiza marcha anterior no armazenamento local
        const currentMarchas = getStoredMarchas();
        const closedMarchaObj = { ...marchaAtiva, ...updatePayload };
        saveStoredMarchas([closedMarchaObj, ...currentMarchas.filter((m: any) => m.id !== marchaAtiva.id)]);
      }

      // 2. CRIAÇÃO DE NOVO REGISTO DE LEVANTAMENTO (Nova marcha para quem assumiu a função)
      const newMarcha = {
        viatura_id: viatura.id,
        nip_inicio: nipVal,
        trigrama_ou_condutor_inicio: profile.trigramaOuCondutor,
        destino_funcao: profile.destinoFuncao || marchaAtiva?.destino_funcao || 'Serviço Geral',
        km_inicial: currentKm,
        data_saida: now
      };

      let newMarchaRec: any = null;

      if (isSupabaseConfigured()) {
        try {
          let { data, error } = await supabase.from('registos_marcha').insert([newMarcha]).select();

          if (error && (error.message.includes('trigrama') || error.message.includes('destino_funcao'))) {
            const { trigrama_ou_condutor_inicio, destino_funcao, ...cleanPayload } = newMarcha;
            const retry = await supabase.from('registos_marcha').insert([cleanPayload]).select();
            data = retry.data;
          }

          if (data && data.length > 0) {
            newMarchaRec = data[0];
          }
        } catch (netErr: any) {
          console.warn('Erro de rede ao criar nova marcha de troca no Supabase:', netErr);
        }
      }

      newMarchaRec = newMarchaRec || { id: `mar-${Date.now()}`, ...newMarcha };
      setMarchaAtiva(newMarchaRec);

      // Guarda a nova marcha no espelho local
      const updatedMarchas = getStoredMarchas();
      saveStoredMarchas([newMarchaRec, ...updatedMarchas.filter((m: any) => m.id !== newMarchaRec.id)]);

      // 3. REGISTAR EVENTO GPS DE TROCA DE CONDUTOR
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('historico_posicoes_gps').insert([
            {
              viatura_id: viatura.id,
              registo_marcha_id: newMarchaRec.id,
              nip_operador: nipVal,
              latitude: viatura.latitude_atual || 39.094,
              longitude: viatura.longitude_atual || -8.967,
              tipo_evento: 'PING_PERCURSO',
              registado_at: now
            }
          ]);
        } catch (netErr: any) {
          console.warn('Erro de rede ao registar posição GPS no Supabase:', netErr);
        }
      }

      // 4. CONTROLO DO GPS TRACKING NESTE TELEMÓVEL
      if (isAssumirNoProprioTelemovel) {
        setIsGpsTrackingActive(true);
        alert(`🖐️ Condução assumida com sucesso! A marcha foi iniciada em nome de ${profile.trigramaOuCondutor} e o rastreio GPS ficou ATIVO neste telemóvel.`);
      } else {
        setIsGpsTrackingActive(false);
        alert(`🔄 Viatura transferida com sucesso para ${profile.trigramaOuCondutor}! A nova marcha ficou registada e o rastreio GPS neste dispositivo foi DESATIVADO.`);
      }

      setActiveTab('FINALIZAR');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao alternar condutor.');
    }
  };

  // Handler: Finalizar Marcha
  const handleFinalizarMarcha = async () => {
    if (!viatura || !profile.trigramaOuCondutor) {
      setErrorMsg('Por favor indique o Trigrama ou Posto e Nome de quem entrega a chave.');
      return;
    }

    const nipVal = profile.nip && profile.nip.trim() ? profile.nip.trim() : 'N/D';

    if (kmFinalInput < (marchaAtiva?.km_inicial || viatura.km_atuais)) {
      setErrorMsg(`Erro: Os quilómetros finais (${kmFinalInput}) não podem ser inferiores aos iniciais (${marchaAtiva?.km_inicial || viatura.km_atuais}).`);
      return;
    }

    saveMilitaryProfile({ ...profile, nip: nipVal });
    setErrorMsg('');

    const finalKeyLoc = locChaveSelected === 'Outro...' ? customLocChave || 'Local Outro' : locChaveSelected;
    const finalVtrLoc = locViaturaSelected === 'Outro...' ? customLocViatura || 'Local Outro' : locViaturaSelected;

    try {
      if (marchaAtiva) {
        const updatePayload = {
          nip_fim: profile.nip,
          trigrama_ou_condutor_fim: profile.trigramaOuCondutor,
          km_final: kmFinalInput,
          nivel_combustivel: nivelCombustivel,
          litros_abastecidos: abasteceu ? litros : 0,
          valor_abastecido: abasteceu ? valorEuros : 0,
          localizacao_chave: finalKeyLoc,
          localizacao_viatura: finalVtrLoc,
          checklist_documentos: checkDocs,
          checklist_cartao: checkCartao,
          checklist_seguranca: checkSeguranca,
          necessita_limpeza: necessitaLimpeza,
          data_chegada: new Date().toISOString()
        };

        if (isSupabaseConfigured()) {
          try {
            let { error } = await supabase.from('registos_marcha').update(updatePayload).eq('id', marchaAtiva.id);
            if (error && (error.message.includes('trigrama') || error.message.includes('destino_funcao'))) {
              const { trigrama_ou_condutor_fim, ...cleanUpdate } = updatePayload;
              await supabase.from('registos_marcha').update(cleanUpdate).eq('id', marchaAtiva.id);
            }
          } catch (netErr: any) {
            console.warn('Erro de rede ao finalizar marcha no Supabase:', netErr);
          }
        }

        // Save local marchas update
        const currentMarchas = getStoredMarchas();
        const updatedMarchaObj = { ...marchaAtiva, ...updatePayload };
        saveStoredMarchas([updatedMarchaObj, ...currentMarchas.filter((m: any) => m.id !== marchaAtiva.id)]);
      }

      // Save local override so state persists across page refreshes
      saveFleetOverride(viatura.id, {
        estado: 'DISPONIVEL',
        km_atuais: kmFinalInput,
        localizacao_atual_viatura: finalVtrLoc,
        localizacao_atual_chave: finalKeyLoc,
        necessita_limpeza: necessitaLimpeza
      });

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('viaturas')
            .update({
              estado: 'DISPONIVEL',
              km_atuais: kmFinalInput,
              localizacao_atual_viatura: finalVtrLoc,
              localizacao_atual_chave: finalKeyLoc,
              necessita_limpeza: necessitaLimpeza
            })
            .eq('id', viatura.id);
        } catch (netErr: any) {
          console.warn('Erro de rede ao atualizar viatura no Supabase:', netErr);
        }
      }

      setViatura({
        ...viatura,
        estado: 'DISPONIVEL',
        km_atuais: kmFinalInput,
        localizacao_atual_viatura: finalVtrLoc,
        localizacao_atual_chave: finalKeyLoc,
        necessita_limpeza: necessitaLimpeza
      });

      setIsGpsTrackingActive(false);
      setShowCloseSuccessModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao finalizar a marcha.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-2">
      {/* Vehicle Info Header Card */}
      <div className="p-4 rounded-xl glass-panel border border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-xl text-white tracking-widest">{viatura.matricula}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    viatura.estado === 'DISPONIVEL'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : viatura.estado === 'EM_USO'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {viatura.estado}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300">{viatura.modelo}</p>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-slate-500 block">ODÓMETRO</span>
            <span className="text-emerald-400 font-bold text-sm">{viatura.km_atuais.toLocaleString()} KM</span>
          </div>
        </div>

        {/* Cleaning Badge */}
        {viatura.necessita_limpeza && (
          <div className="p-3 rounded-lg bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs flex items-center space-x-2 font-bold animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>🧼 ATENÇÃO: Esta viatura necessita de limpeza interna/externa registada pelo condutor anterior.</span>
          </div>
        )}

        {/* Active Marcha Driver & Destination Card */}
        {(viatura.estado === 'EM_USO' || marchaAtiva) && (
          <div className="p-3.5 rounded-xl bg-blue-950/90 border border-blue-500/60 text-blue-200 text-xs font-mono space-y-2 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-blue-300 border-b border-blue-800/80 pb-1.5">
              <span className="flex items-center space-x-1.5 uppercase tracking-wider">
                <Car className="w-4 h-4 text-blue-400" />
                <span>🚗 MARCHA ATIVA / CONDUTOR EM SERVIÇO</span>
              </span>
              <span className="text-[10px] text-blue-400 font-normal">
                {marchaAtiva?.data_saida ? new Date(marchaAtiva.data_saida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-mono uppercase">Condutor / Trigrama / Posto Nome</span>
                <span className="font-bold text-white text-sm block">
                  {marchaAtiva?.trigrama_ou_condutor_inicio || profile.trigramaOuCondutor || profile.nip || 'N/D'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">NIP: {marchaAtiva?.nip_inicio || profile.nip}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-mono uppercase">Destino / Função da Missão</span>
                <span className="font-bold text-emerald-300 text-sm block">
                  {marchaAtiva?.destino_funcao || profile.destinoFuncao || 'Serviço Geral'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS BAR: REFUEL + REPORT ISSUE */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowRefuelModal(true)}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all group"
        >
          <Fuel className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Registar Abastecimento</span>
        </button>

        <button
          onClick={() => setShowReportIssueModal(true)}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all group"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          <span>Reportar Problema</span>
        </button>
      </div>

      {/* Highlighted KEY LOCATION Card */}
      <div className="p-4 rounded-xl glass-panel border-2 border-amber-500/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Key className="w-4 h-4" />
            <span>SÍTIO / LOCALIZAÇÃO DA CHAVE (CHAVEIRO)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
            RECOLHA
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[10px] block font-mono">CHAVEIRO DE LEVANTAMENTO</span>
            <span className="text-slate-100 font-bold text-sm">{viatura.localizacao_atual_chave || 'Chaveiro Principal - Armário A'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block font-mono">PARQUEAMENTO DA VIATURA</span>
            <span className="text-slate-300 font-semibold text-xs">{viatura.localizacao_atual_viatura || 'Parque Principal EQ991 (Ota)'}</span>
          </div>
        </div>
      </div>

      {/* Map of Last Vehicle Location */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Última Localização GPS Conhecida da Viatura (Ota: 39.094, -8.967)</span>
        </div>
        <div className="h-56 rounded-lg overflow-hidden border border-slate-800">
          <MapView viaturas={[viatura]} />
        </div>
      </div>

      {/* GPS Live Tracker Banner */}
      <LiveGpsTracker
        viaturaId={viatura.id}
        registoMarchaId={marchaAtiva?.id}
        nipOperador={profile.nip}
        isActive={isGpsTrackingActive}
      />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
        <button
          onClick={() => setActiveTab('INICIAR')}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'INICIAR' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Iniciar
        </button>

        <button
          onClick={() => setActiveTab('ALTERNAR')}
          disabled={viatura.estado !== 'EM_USO'}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'ALTERNAR'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 disabled:opacity-30'
          }`}
        >
          Alternar
        </button>

        <button
          onClick={() => setActiveTab('FINALIZAR')}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'FINALIZAR' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Finalizar
        </button>
      </div>

      {/* TAB 1: INICIAR MARCHA */}
      {activeTab === 'INICIAR' && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>Registo de Início de Marcha (Levantamento)</span>
            </h2>

            {/* Toggle Mode: Levantamento Direto vs Atribuição a Terceiro */}
            <div className="flex items-center space-x-1 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setIsAtribuicaoModo(false)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  !isAtribuicaoModo ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Em meu nome
              </button>
              <button
                type="button"
                onClick={() => setIsAtribuicaoModo(true)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  isAtribuicaoModo ? 'bg-purple-600 text-white font-bold' : 'bg-slate-900 text-purple-400 hover:text-white'
                }`}
              >
                👤 Atribuir a outro
              </button>
            </div>
          </div>

          {isAtribuicaoModo && (
            <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-500/50 space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 text-purple-300 font-bold">
                <User className="w-4 h-4 text-purple-400" />
                <span>Atribuição de Viatura a Outro Condutor (Registo por Terceiro)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Preencha os dados do militar que vai efetivamente conduzir a viatura caso o próprio não tenha acedido à aplicação.
              </p>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Trigrama ou Posto e Nome do Condutor *
                </label>
                <input
                  type="text"
                  required
                  value={profile.trigramaOuCondutor || ''}
                  onChange={(e) => setProfile({ ...profile, trigramaOuCondutor: e.target.value })}
                  placeholder={isAtribuicaoModo ? "Ex: FER ou Sargento Ferreira" : "Ex: OLV ou Tenente Oliveira"}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  NIP do Condutor (Opcional)
                </label>
                <input
                  type="text"
                  value={profile.nip || ''}
                  onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="Ex: 134890-A (Opcional)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Destino / Função da Missão *</label>
              <input
                type="text"
                required
                value={profile.destinoFuncao || ''}
                onChange={(e) => setProfile({ ...profile, destinoFuncao: e.target.value })}
                placeholder="Ex: BA1 Sintra / Apoio Tático"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Quilómetros Iniciais do Odómetro *</label>
              <input
                type="number"
                required
                value={kmInicialInput}
                onChange={(e) => setKmInicialInput(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono text-emerald-400 font-bold"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={handleIniciarMarcha}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all ${
                isAtribuicaoModo
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isAtribuicaoModo ? 'Confirmar Atribuição & Iniciar Marcha' : 'Iniciar Marcha nesta Viatura'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ALTERNAR / TROCA DE CONDUTOR */}
      {activeTab === 'ALTERNAR' && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
            <RefreshCcw className="w-4 h-4" />
            <span>Troca de Condutor / Atribuir Viatura a Outro Militar</span>
          </h2>
          <p className="text-xs text-slate-400">
            Quem deixa de conduzir pode transferir a viatura a outra pessoa. A marcha atual é encerrada e abre-se automaticamente uma nova em nome do novo condutor.
          </p>

          <div className="space-y-3 text-xs">
            {/* Campo Opcional: Quem entrega a viatura caso o condutor anterior não tenha usado a aplicação */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Militar que Entrega / Deixa a Viatura (Opcional - caso o anterior não tenha registado)
              </label>
              <input
                type="text"
                value={condutorQueEntrega}
                onChange={(e) => setCondutorQueEntrega(e.target.value)}
                placeholder={marchaAtiva?.trigrama_ou_condutor_inicio ? `Atual: ${marchaAtiva.trigrama_ou_condutor_inicio} (ou indique quem entrega)` : "Ex: OLV ou Tenente Oliveira"}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Trigrama ou Posto e Nome do NOVO Condutor *</label>
                <input
                  type="text"
                  required
                  value={profile.trigramaOuCondutor || ''}
                  onChange={(e) => setProfile({ ...profile, trigramaOuCondutor: e.target.value })}
                  placeholder="Ex: LAI ou Sargento Laires"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono font-bold text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">NIP do Novo Condutor (Opcional)</label>
                <input
                  type="text"
                  value={profile.nip || ''}
                  onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="Ex: 128912-B (Opcional)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Novo Destino / Função *</label>
              <input
                type="text"
                required
                value={profile.destinoFuncao || ''}
                onChange={(e) => setProfile({ ...profile, destinoFuncao: e.target.value })}
                placeholder="Ex: Pista / Serviço Geral"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAlternarCondutor(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/80 flex items-center justify-center space-x-2 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>🖐️ Assumir Condução (Ativar GPS neste tlmv)</span>
            </button>

            <button
              type="button"
              onClick={() => handleAlternarCondutor(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-950/80 flex items-center justify-center space-x-2 transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>🔄 Transferir Viatura (Desativar GPS neste tlmv)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FINALIZAR MARCHA */}
      {activeTab === 'FINALIZAR' && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <Square className="w-4 h-4 fill-amber-400" />
            <span>Registo de Devolução & Fecho de Marcha (Entrega)</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Trigrama ou Posto e Nome *</label>
                <input
                  type="text"
                  required
                  value={profile.trigramaOuCondutor || ''}
                  onChange={(e) => setProfile({ ...profile, trigramaOuCondutor: e.target.value })}
                  placeholder="Ex: OLV ou Tenente Oliveira"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">NIP de quem entrega (Opcional)</label>
                <input
                  type="text"
                  value={profile.nip || ''}
                  onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="Ex: 134890-A (Opcional)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Destino / Função Concluída *</label>
              <input
                type="text"
                required
                value={profile.destinoFuncao || ''}
                onChange={(e) => setProfile({ ...profile, destinoFuncao: e.target.value })}
                placeholder="Ex: Missão BA1 Sintra Concluída"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Quilómetros Finais do Odómetro *</label>
              <input
                type="number"
                required
                value={kmFinalInput}
                onChange={(e) => setKmFinalInput(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono text-amber-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nível de Combustível *</label>
              <div className="grid grid-cols-5 gap-1.5 font-mono font-bold text-xs">
                {(['RESERVA', '1/4', '1/2', '3/4', 'CHEIO'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNivelCombustivel(lvl)}
                    className={`py-2 rounded border text-center transition-all ${
                      nivelCombustivel === lvl
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Localização/Chaveiro de Devolução *</label>
                <select
                  value={locChaveSelected}
                  onChange={(e) => setLocChaveSelected(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold"
                >
                  {locaisChave.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome} {l.is_predefinido ? '(Pré-definido)' : ''}
                    </option>
                  ))}
                  <option value="Outro...">Outro...</option>
                </select>

                {locChaveSelected === 'Outro...' && (
                  <input
                    type="text"
                    required
                    placeholder="Escreva a localização do chaveiro..."
                    value={customLocChave}
                    onChange={(e) => setCustomLocChave(e.target.value)}
                    className="w-full mt-2 px-2.5 py-1.5 rounded bg-slate-950 border border-amber-500/60 text-slate-100 text-xs animate-in fade-in"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Local de Estacionamento *</label>
                <select
                  value={locViaturaSelected}
                  onChange={(e) => setLocViaturaSelected(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold"
                >
                  {locaisViatura.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome} {l.is_predefinido ? '(Pré-definida)' : ''}
                    </option>
                  ))}
                  <option value="Outro...">Outro...</option>
                </select>

                {locViaturaSelected === 'Outro...' && (
                  <input
                    type="text"
                    required
                    placeholder="Escreva o local de parqueamento..."
                    value={customLocViatura}
                    onChange={(e) => setCustomLocViatura(e.target.value)}
                    className="w-full mt-2 px-2.5 py-1.5 rounded bg-slate-950 border border-amber-500/60 text-slate-100 text-xs animate-in fade-in"
                  />
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <label className="flex items-center space-x-2 text-slate-200 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={necessitaLimpeza}
                  onChange={(e) => setNecessitaLimpeza(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <span>🧼 A viatura necessita de limpeza interna/externa devido ao uso efetuado?</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleFinalizarMarcha}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950 flex items-center justify-center space-x-2 transition-all"
          >
            <Square className="w-4 h-4 fill-slate-950" />
            <span>Finalizar Marcha e Devolver Chave no Chaveiro</span>
          </button>
        </div>
      )}

      {/* MODAL: REFUELING REGISTRATION (UNIDADE MILITAR vs POSTO COMERCIAL GPS) */}
      {showRefuelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border-2 border-emerald-500/60 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider text-sm">
                <Fuel className="w-5 h-5" />
                <span>Registar Abastecimento de Combustível</span>
              </div>
              <button
                onClick={() => setShowRefuelModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {refuelSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-bold text-sm">Abastecimento Registado com Sucesso!</p>
                <p className="text-xs text-emerald-300">Os litros e odómetro foram atualizados na Logística.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveRefuel} className="space-y-4 text-xs">
                {/* Refuel Type Tabs */}
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

                {/* Conditional Fields: UNIDADE MILITAR */}
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
                  /* Conditional Fields: POSTO COMERCIAL */
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

                {/* Common Fields: Litros, Valor, KM */}
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
            )}
          </div>
        </div>
      )}

      {/* MODAL: REPORT IN-TRIP ISSUE */}
      {showReportIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border-2 border-rose-500/60 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-400 font-bold uppercase tracking-wider text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Reportar Anomalia / Luz de Manutenção</span>
              </div>
              <button
                onClick={() => setShowReportIssueModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {issueReportedSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-bold text-sm">Problema Reportado com Sucesso!</p>
                <p className="text-xs text-emerald-300">A equipa de Logística foi notificada do incidente.</p>
              </div>
            ) : (
              <form onSubmit={handleReportIssue} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tipo de Problema *</label>
                  <select
                    value={tipoAnomalia}
                    onChange={(e) => setTipoAnomalia(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold"
                  >
                    <option value="Luz de Manutenção / Avaria no Painel">⚠️ Luz de Manutenção / Avaria no Painel</option>
                    <option value="Anomalia Mecânica / Tração / Motor">⚙️ Anomalia Mecânica / Tração / Motor</option>
                    <option value="Furo ou Pressão de Pneu">🛞 Furo ou Pressão de Pneu</option>
                    <option value="Barulho Estranho ou Vibração">🔊 Barulho Estranho ou Vibração</option>
                    <option value="Outro Incidente em Serviço">📝 Outro Incidente em Serviço</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Gravidade da Anomalia *</label>
                  <div className="grid grid-cols-3 gap-2 font-mono font-bold text-xs">
                    {(['LEVE', 'MODERADA', 'GRAVE'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGravidadeAnomalia(g)}
                        className={`py-2 rounded border text-center transition-all ${
                          gravidadeAnomalia === g
                            ? g === 'GRAVE'
                              ? 'bg-rose-600 text-white border-rose-500 font-black shadow-md'
                              : g === 'MODERADA'
                              ? 'bg-amber-600 text-white border-amber-500 font-black shadow-md'
                              : 'bg-blue-600 text-white border-blue-500 font-black shadow-md'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {gravidadeAnomalia === 'GRAVE' && (
                    <p className="text-[10px] text-rose-400 mt-1 font-mono">
                      * Gravidade GRAVE colocará a viatura em estado de Manutenção de imediato.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Descrição Detalhada *</label>
                  <textarea
                    required
                    rows={3}
                    value={descricaoAnomalia}
                    onChange={(e) => setDescricaoAnomalia(e.target.value)}
                    placeholder="Descreva o que sucedeu (ex: acendeu luz amarela do óleo a 80 km/h, pneu traseiro esquerdo com pouca pressão, etc.)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                  ></textarea>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReportIssueModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase shadow-lg shadow-rose-950"
                  >
                    Enviar Alerta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* POST-CLOSING SUCCESS MODAL */}
      {showCloseSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border-2 border-emerald-500/50 space-y-6 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                Marcha Concluída com Sucesso
              </h2>
              <p className="text-xs text-slate-300">
                A viatura <span className="font-mono font-bold text-emerald-400">{viatura.matricula}</span> foi devolvida e o seu rastreio GPS foi encerrado.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/80 border-2 border-amber-500/60 text-amber-200 text-xs space-y-1 text-left">
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-amber-300">
                <Briefcase className="w-4 h-4" />
                <span>LEMBRETE IMPORTANTE DE DEVOLUÇÃO</span>
              </div>
              <p className="text-amber-100 font-semibold leading-relaxed">
                🎒 Por favor, confirme que não deixou objetos pessoais, documentos ou equipamento na viatura antes de a trancar.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCloseSuccessModal(false);
                router.push('/recomendada');
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider transition-colors shadow-lg shadow-emerald-950"
            >
              Concluir & Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
