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
  Siren
} from 'lucide-react';
import { getStoredMilitaryProfile, saveMilitaryProfile, MilitaryProfile } from '@/lib/utils/cookies';
import { supabase, Viatura, LocalItem, RegistoMarcha } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_LOCAIS, MOCK_MARCHAS } from '@/lib/mock-data';
import { LiveGpsTracker } from '@/components/LiveGpsTracker';
import { OdometerScanner } from '@/components/OdometerScanner';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function ChavePage() {
  const params = useParams();
  const router = useRouter();
  const qrToken = (params?.qr_token as string) || '';

  // Synchronous initial vehicle lookup to eliminate waiting screen
  const initialV = MOCK_VIATURAS.find((item) => item.qr_code_token === qrToken) || MOCK_VIATURAS[0];

  const [viatura, setViatura] = useState<Viatura>(initialV);
  const [locaisChave, setLocaisChave] = useState<LocalItem[]>(MOCK_LOCAIS.filter((l) => l.tipo === 'CHAVE'));
  const [locaisViatura, setLocaisViatura] = useState<LocalItem[]>(MOCK_LOCAIS.filter((l) => l.tipo === 'VIATURA'));
  const [marchaAtiva, setMarchaAtiva] = useState<RegistoMarcha | null>(null);

  const [profile, setProfile] = useState<MilitaryProfile>({ nip: '', nome: '', posto: 'Tenente', email: '' });
  const [isGpsTrackingActive, setIsGpsTrackingActive] = useState<boolean>(false);

  // Form states for Início de Marcha
  const [kmInicialInput, setKmInicialInput] = useState<number>(initialV.km_atuais);

  // Form states for Finalizar Marcha
  const [kmFinalInput, setKmFinalInput] = useState<number>(initialV.km_atuais);
  const [nivelCombustivel, setNivelCombustivel] = useState<'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO'>('CHEIO');
  const [abasteceu, setAbasteceu] = useState<boolean>(false);
  const [litros, setLitros] = useState<number>(0);
  const [valorEuros, setValorEuros] = useState<number>(0);
  const [locChaveSelected, setLocChaveSelected] = useState<string>('Chaveiro Principal - Armário A');
  const [locViaturaSelected, setLocViaturaSelected] = useState<string>('Parque Principal EQ991 (Ota)');
  const [locChaveOutro, setLocChaveOutro] = useState<string>('');
  const [locViaturaOutro, setLocViaturaOutro] = useState<string>('');

  const [checkDocs, setCheckDocs] = useState<boolean>(true);
  const [checkCartao, setCheckCartao] = useState<boolean>(true);
  const [checkSeguranca, setCheckSeguranca] = useState<boolean>(true);
  const [necessitaLimpeza, setNecessitaLimpeza] = useState<boolean>(initialV.necessita_limpeza || false);

  // Anomalia / Incidente em marcha Modal
  const [showReportIssueModal, setShowReportIssueModal] = useState<boolean>(false);
  const [tipoAnomalia, setTipoAnomalia] = useState<string>('Luz de Manutenção / Avaria no Painel');
  const [descricaoAnomalia, setDescricaoAnomalia] = useState<string>('');
  const [gravidadeAnomalia, setGravidadeAnomalia] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('MODERADA');
  const [issueReportedSuccess, setIssueReportedSuccess] = useState<boolean>(false);

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
          setViatura(vData);
          setKmInicialInput(vData.km_atuais);
          setKmFinalInput(vData.km_atuais);
          setNecessitaLimpeza(vData.necessita_limpeza);
        }

        const { data: lData } = await supabase.from('locais').select('*').eq('is_ativo', true);
        if (lData && lData.length > 0) {
          const chaves = lData.filter((l) => l.tipo === 'CHAVE');
          const vtrs = lData.filter((l) => l.tipo === 'VIATURA');
          setLocaisChave(chaves);
          setLocaisViatura(vtrs);

          const defChave = chaves.find((c) => c.is_predefinido) || chaves[0];
          const defVtr = vtrs.find((v) => v.is_predefinido) || vtrs[0];
          if (defChave) setLocChaveSelected(defChave.nome);
          if (defVtr) setLocViaturaSelected(defVtr.nome);
        }

        const targetV = vData || initialV;
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

      // If GRAVE anomaly, update vehicle to MANUTENCAO
      if (gravidadeAnomalia === 'GRAVE') {
        await supabase.from('viaturas').update({ estado: 'MANUTENCAO' }).eq('id', viatura.id);
        setViatura({ ...viatura, estado: 'MANUTENCAO' });
      }

      // Log GPS event
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
    if (!viatura || !profile.nip) {
      setErrorMsg('Por favor introduza o seu NIP.');
      return;
    }

    saveMilitaryProfile(profile);
    setErrorMsg('');

    try {
      const newMarcha = {
        viatura_id: viatura.id,
        nip_inicio: profile.nip,
        km_inicial: kmInicialInput,
        data_saida: new Date().toISOString()
      };

      const { data } = await supabase.from('registos_marcha').insert([newMarcha]).select();
      const marchaRec = data && data.length > 0 ? data[0] : { id: `mar-${Date.now()}`, ...newMarcha };
      setMarchaAtiva(marchaRec);

      await supabase.from('viaturas').update({ estado: 'EM_USO', km_atuais: kmInicialInput }).eq('id', viatura.id);

      setViatura({ ...viatura, estado: 'EM_USO', km_atuais: kmInicialInput });
      setIsGpsTrackingActive(true);
      setActiveTab('FINALIZAR');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao iniciar marcha.');
    }
  };

  // Handler: Alternar Condutor
  const handleAlternarCondutor = async () => {
    if (!profile.nip || !marchaAtiva) return;
    saveMilitaryProfile(profile);

    try {
      await supabase.from('historico_posicoes_gps').insert([
        {
          viatura_id: viatura?.id,
          registo_marcha_id: marchaAtiva.id,
          nip_operador: profile.nip,
          latitude: viatura?.latitude_atual || 39.094,
          longitude: viatura?.longitude_atual || -8.967,
          tipo_evento: 'PING_PERCURSO',
          registado_at: new Date().toISOString()
        }
      ]);

      alert(`Condutor alterado com sucesso para o NIP ${profile.nip}. O rastreio GPS continuará no seu dispositivo.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Finalizar Marcha
  const handleFinalizarMarcha = async () => {
    if (!viatura || !profile.nip) {
      setErrorMsg('Por favor indique o NIP de quem entrega a chave.');
      return;
    }

    if (kmFinalInput < (marchaAtiva?.km_inicial || viatura.km_atuais)) {
      setErrorMsg(`Erro: Os quilómetros finais (${kmFinalInput}) não podem ser inferiores aos iniciais (${marchaAtiva?.km_inicial || viatura.km_atuais}).`);
      return;
    }

    saveMilitaryProfile(profile);
    setErrorMsg('');

    const finalKeyLoc = locChaveSelected === 'Outro...' ? locChaveOutro : locChaveSelected;
    const finalVtrLoc = locViaturaSelected === 'Outro...' ? locViaturaOutro : locViaturaSelected;

    try {
      if (marchaAtiva) {
        await supabase
          .from('registos_marcha')
          .update({
            nip_fim: profile.nip,
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
          })
          .eq('id', marchaAtiva.id);
      }

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

        {/* PROMINENT CLEANING BADGE IF NEEDED */}
        {viatura.necessita_limpeza && (
          <div className="p-3 rounded-lg bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs flex items-center space-x-2 font-bold animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>🧼 ATENÇÃO: Esta viatura necessita de limpeza interna/externa registada pelo condutor anterior.</span>
          </div>
        )}
      </div>

      {/* REPORT ISSUE IN TRIP BUTTON (EMERGENCY / MAINTENANCE LIGHT) */}
      <div className="p-4 rounded-xl bg-rose-950/40 border-2 border-rose-500/50 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-mono font-bold text-xs text-rose-400 block uppercase">ALERTAS DE SEGURANÇA</span>
            <h3 className="text-xs font-bold text-slate-100">Acendeu Luz de Manutenção ou Avaria?</h3>
            <p className="text-[11px] text-slate-400">Reporte anomalias em marcha de imediato à Logística.</p>
          </div>
        </div>

        <button
          onClick={() => setShowReportIssueModal(true)}
          className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase flex items-center space-x-1.5 shadow-md shadow-rose-950 transition-all flex-shrink-0"
        >
          <AlertTriangle className="w-4 h-4" />
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
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>Registo de Início de Marcha</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">NIP do Condutor *</label>
              <input
                type="text"
                required
                value={profile.nip}
                onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ex: 134890-A"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Quilómetros Iniciais do Odómetro *</label>
              <input
                type="number"
                required
                value={kmInicialInput}
                onChange={(e) => setKmInicialInput(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono text-emerald-400 font-bold"
              />
            </div>

            <OdometerScanner
              onKmDetected={(km) => {
                if (km > 0) setKmInicialInput(km);
              }}
            />
          </div>

          <button
            onClick={handleIniciarMarcha}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Iniciar Marcha nesta Viatura</span>
          </button>
        </div>
      )}

      {/* TAB 2: ALTERNAR CONDUTOR */}
      {activeTab === 'ALTERNAR' && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
            <RefreshCcw className="w-4 h-4" />
            <span>Alternar Condutor a Meio do Serviço</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">NIP do Novo Condutor *</label>
              <input
                type="text"
                required
                value={profile.nip}
                onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ex: 128912-B"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleAlternarCondutor}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-950 flex items-center justify-center space-x-2 transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Assumir Condução da Viatura</span>
          </button>
        </div>
      )}

      {/* TAB 3: FINALIZAR MARCHA */}
      {activeTab === 'FINALIZAR' && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <Square className="w-4 h-4 fill-amber-400" />
            <span>Registo de Devolução & Fecho de Marcha</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">NIP de quem entrega a chave *</label>
              <input
                type="text"
                required
                value={profile.nip}
                onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ex: 134890-A"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Quilómetros Finais do Odómetro *</label>
              <input
                type="number"
                required
                value={kmFinalInput}
                onChange={(e) => setKmFinalInput(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono text-amber-400 font-bold"
              />
            </div>

            <OdometerScanner
              onKmDetected={(km) => {
                if (km > 0) setKmFinalInput(km);
              }}
            />

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
                  className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                >
                  {locaisChave.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome} {l.is_predefinido ? '(Pré-definido)' : ''}
                    </option>
                  ))}
                  <option value="Outro...">Outro...</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Local de Estacionamento *</label>
                <select
                  value={locViaturaSelected}
                  onChange={(e) => setLocViaturaSelected(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                >
                  {locaisViatura.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome} {l.is_predefinido ? '(Pré-definida)' : ''}
                    </option>
                  ))}
                  <option value="Outro...">Outro...</option>
                </select>
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

      {/* MODAL: REPORT IN-TRIP ISSUE / MAINTENANCE LIGHT */}
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
