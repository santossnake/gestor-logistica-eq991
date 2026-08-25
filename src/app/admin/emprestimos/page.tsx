'use client';

import React, { useState, useEffect } from 'react';
import { Building, Camera, CheckCircle2, Shield, Calendar, User, Phone, Mail, FileText, AlertCircle, ArrowRight, Edit2, Trash2, Printer, Download, X, Upload } from 'lucide-react';
import { supabase, isSupabaseConfigured, Viatura, EmprestimoExterno, FotoEmprestimo } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_EMPRESTIMOS, MOCK_FOTOS_EMPRESTIMO } from '@/lib/mock-data';
import { POSTOS_FORCA_AEREA, getStoredEmprestimos, saveStoredEmprestimos, saveFleetOverride, getStoredFotosEmprestimo, saveStoredFotosEmprestimo } from '@/lib/utils/cookies';

const ANGULOS_INSPECAO = [
  { id: 'FRENTE', label: '1. Frente / Para-choques (Opcional)', req: false },
  { id: 'TRASEIRA', label: '2. Traseira (Opcional)', req: false },
  { id: 'ESQUERDA', label: '3. Lateral Esquerda (Opcional)', req: false },
  { id: 'DIREITA', label: '4. Lateral Direita (Opcional)', req: false },
  { id: 'INTERIOR', label: '5. Habitáculo / Estofos (Opcional)', req: false },
  { id: 'PAINEL', label: '6. Painel / Odómetro (Opcional)', req: false },
  { id: 'DANO', label: '7. Danos Pré-existentes (Opcional)', req: false },
] as const;

export default function EmprestimosPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [emprestimos, setEmprestimos] = useState<EmprestimoExterno[]>([]);
  const [fotos, setFotos] = useState<FotoEmprestimo[]>([]);

  // PDF Auto Modal State
  const [selectedEmprestimoForPdf, setSelectedEmprestimoForPdf] = useState<EmprestimoExterno | null>(null);

  // Form states
  const [selectedViaturaId, setSelectedViaturaId] = useState<string>('');
  const [entidade, setEntidade] = useState<string>('');
  const [entidadePosto, setEntidadePosto] = useState<string>('TEN');
  const [nomeResp, setNomeResp] = useState<string>('');
  const [contactoResp, setContactoResp] = useState<string>('');
  const [emailResp, setEmailResp] = useState<string>('');
  const [dataFimPrevista, setDataFimPrevista] = useState<string>('');
  const [kmInicio, setKmInicio] = useState<number>(0);
  const [obsInicial, setObsInicial] = useState<string>('');

  // Uploaded inspection photo URLs per angle
  const [fotosUpload, setFotosUpload] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: vData } = await supabase.from('viaturas').select('*');
        const { data: eData } = await supabase.from('emprestimos_externos').select('*').order('created_at', { ascending: false });
        const { data: fData } = await supabase.from('fotos_emprestimo').select('*');

        let rawFleet = vData && vData.length > 0 ? vData : MOCK_VIATURAS;
        rawFleet = rawFleet.map((v) => {
          let km = v.km_atuais;
          if (v.matricula === 'AM-96-11' && km < 98620) km = 98620;
          if (v.matricula === 'AM-96-12' && km < 105888) km = 105888;
          if (v.matricula === 'AM-96-13' && km < 102614) km = 102614;
          return { ...v, km_atuais: km };
        });

        const localEmp = getStoredEmprestimos();
        const localFotos = getStoredFotosEmprestimo();
        const baseEmp = localEmp.length > 0 ? localEmp : (eData || []);
        const baseFotos = [...(fData || []), ...localFotos];

        setViaturas(rawFleet);
        setEmprestimos(baseEmp);
        setFotos(baseFotos);

        if (rawFleet.length > 0) {
          setSelectedViaturaId(rawFleet[0].id);
          setKmInicio(rawFleet[0].km_atuais);
        }

        const date = new Date(Date.now() + 7 * 86400000);
        setDataFimPrevista(date.toISOString().slice(0, 16));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleViaturaChange = (vId: string) => {
    setSelectedViaturaId(vId);
    const v = viaturas.find((item) => item.id === vId);
    if (v) setKmInicio(v.km_atuais);
  };

  // EDIT MODAL STATE
  const [editingEmprestimo, setEditingEmprestimo] = useState<EmprestimoExterno | null>(null);
  const [editEntidade, setEditEntidade] = useState<string>('');
  const [editNomeResp, setEditNomeResp] = useState<string>('');
  const [editContactoResp, setEditContactoResp] = useState<string>('');
  const [editEmailResp, setEditEmailResp] = useState<string>('');
  const [editDataFimPrevista, setEditDataFimPrevista] = useState<string>('');
  const [editKmInicio, setEditKmInicio] = useState<number>(0);
  const [editObsInicial, setEditObsInicial] = useState<string>('');
  const [editEstado, setEditEstado] = useState<'ATIVO' | 'CONCLUIDO' | 'DEVOLVIDO'>('ATIVO');

  const handleSimularUploadFoto = (angulo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setFotosUpload((prev) => ({ ...prev, [angulo]: url }));
    };
    reader.readAsDataURL(file);
  };

  // PDF AUTO DE EMPRÉSTIMO GENERATOR (Abre Modal de Impressão/PDF)
  const gerarPDFAutoEmprestimo = (emp: EmprestimoExterno) => {
    setSelectedEmprestimoForPdf(emp);
  };


  const handleOpenEditModal = (emp: EmprestimoExterno) => {
    setEditingEmprestimo(emp);
    setEditEntidade(emp.entidade_externa);
    setEditNomeResp(emp.nome_responsavel);
    setEditContactoResp(emp.contacto_responsavel);
    setEditEmailResp(emp.email_responsavel || '');
    setEditDataFimPrevista(emp.data_fim_prevista ? new Date(emp.data_fim_prevista).toISOString().slice(0, 16) : '');
    setEditKmInicio(emp.km_inicio || 0);
    setEditObsInicial(emp.observacoes_inicial || '');
    setEditEstado(emp.estado as any);
  };

  const handleSaveEditEmprestimo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmprestimo) return;

    try {
      const updateData = {
        entidade_externa: editEntidade,
        nome_responsavel: editNomeResp,
        contacto_responsavel: editContactoResp,
        email_responsavel: editEmailResp,
        data_fim_prevista: new Date(editDataFimPrevista).toISOString(),
        km_inicio: editKmInicio,
        observacoes_inicial: editObsInicial,
        estado: editEstado
      };

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('emprestimos_externos').update(updateData).eq('id', editingEmprestimo.id);
        } catch (netErr) {
          console.warn('Erro de rede ao atualizar no Supabase:', netErr);
        }
      }

      const updatedList = emprestimos.map((item) => (item.id === editingEmprestimo.id ? { ...item, ...updateData } : item));
      setEmprestimos(updatedList);
      saveStoredEmprestimos(updatedList);

      if (editEstado === 'DEVOLVIDO' || editEstado === 'CONCLUIDO') {
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('viaturas').update({ estado: 'DISPONIVEL' }).eq('id', editingEmprestimo.viatura_id);
          } catch (netErr) {
            console.warn('Erro de rede ao atualizar viatura no Supabase:', netErr);
          }
        }
        saveFleetOverride(editingEmprestimo.viatura_id, { estado: 'DISPONIVEL' });
        setViaturas((prev) => prev.map((v) => (v.id === editingEmprestimo.viatura_id ? { ...v, estado: 'DISPONIVEL' } : v)));
      }

      setEditingEmprestimo(null);
      setSuccessMsg(`Empréstimo a ${editEntidade} atualizado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao atualizar empréstimo.');
    }
  };

  const handleDeleteEmprestimo = async (emp: EmprestimoExterno) => {
    if (!confirm(`Tem a certeza que deseja apagar permanentemente o registo de empréstimo a "${emp.entidade_externa}"?`)) return;

    try {
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('emprestimos_externos').delete().eq('id', emp.id);
        } catch (netErr) {
          console.warn('Erro de rede ao apagar no Supabase:', netErr);
        }
      }

      const updatedList = emprestimos.filter((item) => item.id !== emp.id);
      setEmprestimos(updatedList);
      saveStoredEmprestimos(updatedList);

      if (emp.estado === 'ATIVO') {
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('viaturas').update({ estado: 'DISPONIVEL' }).eq('id', emp.viatura_id);
          } catch (netErr) {
            console.warn('Erro de rede ao libertar viatura no Supabase:', netErr);
          }
        }
        saveFleetOverride(emp.viatura_id, { estado: 'DISPONIVEL' });
        setViaturas((prev) => prev.map((v) => (v.id === emp.viatura_id ? { ...v, estado: 'DISPONIVEL' } : v)));
      }

      setSuccessMsg(`Empréstimo a ${emp.entidade_externa} removido.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao apagar empréstimo.');
    }
  };

  const handleCriarEmprestimo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const payloadEmprestimo: any = {
        id: `emp-${Date.now()}`,
        viatura_id: selectedViaturaId,
        entidade_externa: entidade,
        nome_responsavel: nomeResp,
        contacto_responsavel: contactoResp,
        email_responsavel: emailResp,
        data_inicio: new Date().toISOString(),
        data_fim_prevista: new Date(dataFimPrevista).toISOString(),
        km_inicio: kmInicio,
        observacoes_inicial: obsInicial,
        estado: 'ATIVO' as const,
        criado_por_admin: 'Logística EQ991'
      };

      if (isSupabaseConfigured()) {
        try {
          const { data: empData } = await supabase.from('emprestimos_externos').insert([payloadEmprestimo]).select();
          if (empData && empData.length > 0) payloadEmprestimo.id = empData[0].id;
        } catch (netErr) {
          console.warn('Erro de rede ao registar no Supabase:', netErr);
        }
      }

      // Save photos if uploaded
      const newFotoRecords = Object.entries(fotosUpload).map(([angulo, url]) => ({
        id: `foto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        emprestimo_id: payloadEmprestimo.id,
        tipo_fase: 'INICIO' as const,
        angulo_zona: angulo as any,
        foto_url: url,
        created_at: new Date().toISOString()
      }));

      if (newFotoRecords.length > 0) {
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('fotos_emprestimo').insert(
              newFotoRecords.map(({ id, created_at, ...rest }) => rest)
            );
          } catch (netErr) {
            console.warn('Erro ao guardar fotos no Supabase:', netErr);
          }
        }

        const allFotos = [...newFotoRecords, ...fotos];
        setFotos(allFotos);
        saveStoredFotosEmprestimo(allFotos);
      }

      // Update local storage mirror
      const updatedList = [payloadEmprestimo, ...emprestimos];
      setEmprestimos(updatedList);
      saveStoredEmprestimos(updatedList);

      // Update vehicle state to EMPRESTADA_EXTERNO
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('viaturas').update({ estado: 'EMPRESTADA_EXTERNO' }).eq('id', selectedViaturaId);
        } catch (netErr) {
          console.warn('Erro ao atualizar estado da viatura no Supabase:', netErr);
        }
      }
      saveFleetOverride(selectedViaturaId, { estado: 'EMPRESTADA_EXTERNO' });
      setViaturas((prev) => prev.map((v) => (v.id === selectedViaturaId ? { ...v, estado: 'EMPRESTADA_EXTERNO' } : v)));

      setSuccessMsg(`Cedência a ${entidade} registada com sucesso! Auto de Empréstimo gerado.`);
      setFotosUpload({});
      setEntidade('');
      setNomeResp('');
      setContactoResp('');
      setEmailResp('');

      // Auto-open PDF Auto
      gerarPDFAutoEmprestimo(payloadEmprestimo);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao guardar cedência externa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Empréstimos a Entidades Externas
            </h1>
            <p className="text-xs text-slate-400">
              Cedências temporárias (BA1, AFA, GNR, PSP) com Auto de Vistoria Fotográfico Obrigatório.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form: Nova Cedência Externa com Vistoria */}
      <form onSubmit={handleCriarEmprestimo} className="space-y-6">
        <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
          <h2 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>1. Dados da Entidade e Responsável Externo</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Selecionar Viatura *</label>
              <select
                value={selectedViaturaId}
                onChange={(e) => handleViaturaChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              >
                {viaturas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.matricula} - {v.modelo} ({v.km_atuais.toLocaleString()} km)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Entidade Externa *</label>
              <input
                type="text"
                required
                value={entidade}
                onChange={(e) => setEntidade(e.target.value)}
                placeholder="Ex: Base Aérea Nº 1 / GNR Sintra / AFA"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm"
              />
            </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Posto / Graduação do Responsável *</label>
                <select
                  value={entidadePosto || 'TEN'}
                  onChange={(e) => setEntidadePosto(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                >
                  {POSTOS_FORCA_AEREA.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome do Responsável *</label>
              <input
                type="text"
                required
                value={nomeResp}
                onChange={(e) => setNomeResp(e.target.value)}
                placeholder="Ex: Capitão Ferreira"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Contacto Telefónico *</label>
              <input
                type="text"
                required
                value={contactoResp}
                onChange={(e) => setContactoResp(e.target.value)}
                placeholder="Ex: 912 345 678"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Email do Responsável *</label>
              <input
                type="email"
                required
                value={emailResp}
                onChange={(e) => setEmailResp(e.target.value)}
                placeholder="Ex: ferreira@emfa.gov.pt"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Data/Hora Prevista de Devolução *</label>
              <input
                type="datetime-local"
                required
                value={dataFimPrevista}
                onChange={(e) => setDataFimPrevista(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Photographic Inspection Grid (Optional) */}
        <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>2. Auto de Vistoria Fotográfico (Opcional - Câmara & Galeria)</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ANGULOS_INSPECAO.map((ang: any) => (
              <div key={ang.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300 font-bold block">{ang.label}</span>
                  {fotosUpload[ang.id] && (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">✓ Carregada</span>
                  )}
                </div>

                {fotosUpload[ang.id] ? (
                  <div className="relative group">
                    <img src={fotosUpload[ang.id]} alt={ang.label} className="w-full h-24 object-cover rounded-lg border border-slate-700" />
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...fotosUpload };
                        delete next[ang.id];
                        setFotosUpload(next);
                      }}
                      className="absolute top-1 right-1 p-1 bg-rose-950/90 text-rose-300 border border-rose-800 rounded text-[10px] font-bold"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="cursor-pointer py-2.5 px-2 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/80 rounded-lg text-center font-mono font-bold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all">
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span>📷 Câmara</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleSimularUploadFoto(ang.id, e)}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer py-2.5 px-2 bg-slate-950/80 hover:bg-slate-900 text-slate-300 border border-slate-800 rounded-lg text-center font-mono font-bold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>📁 Ficheiro</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSimularUploadFoto(ang.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-950 flex items-center justify-center space-x-2 transition-all"
        >
          <Building className="w-5 h-5" />
          <span>{isSubmitting ? 'A emitir auto de cedência...' : 'Emitir Auto de Cedência Externa'}</span>
        </button>
      </form>

      {/* List of Active External Loans */}
      <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Building className="w-4 h-4 text-purple-400" />
          <span>Registo de Empréstimos Ativos</span>
        </h2>

        {emprestimos.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono text-center py-4">Sem empréstimos externos ativos.</p>
        ) : (
          <div className="space-y-3">
            {emprestimos.map((emp) => {
              const empFotos = fotos.filter((f) => f.emprestimo_id === emp.id);

              return (
                <div key={emp.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-xs font-bold text-purple-400 font-mono">{emp.entidade_externa}</span>
                      <h3 className="text-sm font-semibold text-slate-100">{emp.nome_responsavel} ({emp.contacto_responsavel})</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => gerarPDFAutoEmprestimo(emp)}
                        className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 flex items-center space-x-1 transition-colors"
                        title="Visualizar e Descarregar Auto de Empréstimo em PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>📄 Auto PDF</span>
                      </button>

                      {emp.email_responsavel && (
                        <a
                          href={`mailto:${emp.email_responsavel}?subject=${encodeURIComponent(
                            `Esquadra 991 - Notificação de Cedência Externa (${emp.entidade_externa})`
                          )}&body=${encodeURIComponent(
                            `Exmo(a). Sr(a). ${emp.nome_responsavel} [${emp.entidade_externa}],\n\nInformamos que o processo de cedência externa de viatura encontra-se ativo com data prevista de devolução: ${new Date(emp.data_fim_prevista).toLocaleString()}.\n\nContacto Registado: ${emp.contacto_responsavel}\n\nCumprimentos,\nLogística Esquadra 991`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center space-x-1"
                        >
                          <span>Email ✉️</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                        title="Editar Empréstimo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteEmprestimo(emp)}
                        className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800"
                        title="Apagar Empréstimo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                        {emp.estado}
                      </span>
                    </div>
                  </div>

                  {/* Photo comparison preview */}
                  {empFotos.length > 0 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      {empFotos.map((f) => (
                        <img key={f.id} src={f.foto_url} alt={f.angulo_zona} className="w-16 h-12 object-cover rounded border border-slate-700 flex-shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT EMPRESTIMO MODAL */}
      {editingEmprestimo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 p-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-lg text-white">
                    Editar Empréstimo a {editingEmprestimo.entidade_externa}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {editingEmprestimo.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingEmprestimo(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEmprestimo} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Entidade Externa *</label>
                  <input
                    type="text"
                    required
                    value={editEntidade}
                    onChange={(e) => setEditEntidade(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nome do Responsável *</label>
                  <input
                    type="text"
                    required
                    value={editNomeResp}
                    onChange={(e) => setEditNomeResp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Contacto Telefónico *</label>
                  <input
                    type="text"
                    required
                    value={editContactoResp}
                    onChange={(e) => setEditContactoResp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Email do Responsável *</label>
                  <input
                    type="email"
                    required
                    value={editEmailResp}
                    onChange={(e) => setEditEmailResp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Data Prevista Devolução *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editDataFimPrevista}
                    onChange={(e) => setEditDataFimPrevista(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Estado do Empréstimo *</label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-bold"
                  >
                    <option value="ATIVO">ATIVO (Em Cedência)</option>
                    <option value="DEVOLVIDO">DEVOLVIDO (Concluído)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Observações *</label>
                <textarea
                  rows={3}
                  value={editObsInicial}
                  onChange={(e) => setEditObsInicial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingEmprestimo(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY PRINTABLE PDF AUTO MODAL */}
      {selectedEmprestimoForPdf && (() => {
        const v = viaturas.find((item) => item.id === selectedEmprestimoForPdf.viatura_id);
        const dataEmissao = new Date(selectedEmprestimoForPdf.data_inicio || Date.now()).toLocaleString('pt-PT');
        const dataFim = new Date(selectedEmprestimoForPdf.data_fim_prevista).toLocaleString('pt-PT');

        const handleDownloadHtmlFile = () => {
          const content = document.getElementById('auto-pdf-document-container')?.innerHTML || '';
          const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Auto de Cedencia EQ991</title><style>body{font-family:monospace;padding:30px;color:#000;}</style></head><body>${content}</body></html>`;
          const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Auto_Cedencia_${selectedEmprestimoForPdf.entidade_externa.replace(/\s+/g, '_')}.html`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6 text-slate-100 font-mono my-auto max-h-[92vh] flex flex-col">
              
              {/* Modal Header & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                    Auto de Cedência & Empréstimo Externa (FAP / EQ991)
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-lg"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadHtmlFile}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descarregar Auto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEmprestimoForPdf(null)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Body (Printable Container) */}
              <div id="auto-pdf-document-container" className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-5 text-xs overflow-y-auto flex-1">
                
                {/* Air Force Document Header */}
                <div className="text-center border-b border-slate-700 pb-4 space-y-1">
                  <h2 className="text-base font-black text-white uppercase tracking-widest">
                    FORÇA AÉREA PORTUGUESA — ESQUADRA 991
                  </h2>
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    AUTO DE CEDÊNCIA E EMPRÉSTIMO EXTERNO DE VIATURA
                  </p>
                  <span className="inline-block bg-slate-800 text-slate-300 px-3 py-0.5 rounded text-[10px] font-bold border border-slate-700">
                    DOCUMENTO OFICIAL DE TRANSPORTE TERRESTRE DA ESQUADRA 991
                  </span>
                </div>

                {/* Section 1: Auto & Vehicle Info */}
                <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-800 pb-1">
                    1. Identificação do Auto & Veículo Cedido
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Nº DO AUTO</span>
                      <strong className="text-emerald-400 text-xs">AUTO-EMP-991-{selectedEmprestimoForPdf.id.slice(-6).toUpperCase()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">EMISSÃO</span>
                      <span className="text-slate-200">{dataEmissao}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">VIATURA</span>
                      <span className="text-slate-100 font-bold">{v ? v.matricula : 'AM-96-12'} ({v ? v.modelo : 'Nissan Navara'})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ODÓMETRO INICIAL</span>
                      <span className="text-amber-400 font-bold">{selectedEmprestimoForPdf.km_inicio ? selectedEmprestimoForPdf.km_inicio.toLocaleString() : 'N/D'} KM</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: External Entity & Driver Info */}
                <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-800 pb-1">
                    2. Entidade Recetora & Responsável Externo
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 text-[10px] block">ENTIDADE EXTERNA</span>
                      <strong className="text-purple-300 text-xs">{selectedEmprestimoForPdf.entidade_externa}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">RESPONSÁVEL</span>
                      <span className="text-slate-100 font-bold">{selectedEmprestimoForPdf.nome_responsavel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">CONTACTO TELEFÓNICO</span>
                      <span className="text-slate-300 font-mono">{selectedEmprestimoForPdf.contacto_responsavel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">EMAIL INSTITUCIONAL</span>
                      <span className="text-slate-300">{selectedEmprestimoForPdf.email_responsavel || 'N/D'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">DATA PREVISTA DEVOLUÇÃO</span>
                      <span className="text-amber-300 font-bold">{dataFim}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ESTADO DA CEDÊNCIA</span>
                      <span className="text-purple-400 font-bold">{selectedEmprestimoForPdf.estado}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Initial State & Notes */}
                <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-800 pb-1">
                    3. Observações & Estado de Conservação Inicial
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed pt-1">
                    {selectedEmprestimoForPdf.observacoes_inicial || 'Viatura cedida em estado operacional regular, sem danos impeditivos registados.'}
                  </p>
                </div>

                {/* Section 4: Operational Rules */}
                <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-800 pb-1">
                    4. Termos de Responsabilidade Operacional
                  </span>
                  <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pt-1">
                    <li>A entidade recetora responsabiliza-se pela condução segura, abastecimento de combustível e conservação do veículo.</li>
                    <li>Qualquer acidente, dano ou anomalia mecânica deve ser reportado imediatamente à Logística da Esquadra 991.</li>
                    <li>A viatura deve ser restituída na data fixada com o mesmo nível de combustível e higienização.</li>
                  </ol>
                </div>

                {/* Section 5: Photographic Inspection Grid in Auto PDF */}
                {(() => {
                  const pdfFotos = fotos.filter((f) => f.emprestimo_id === selectedEmprestimoForPdf.id);
                  const uploadEntries = Object.entries(fotosUpload);
                  const hasFotos = pdfFotos.length > 0 || uploadEntries.length > 0;

                  return (
                    <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>5. Registo de Vistoria Fotográfica da Viatura</span>
                        <span className="text-[9px] text-purple-300">
                          {hasFotos ? `${pdfFotos.length || uploadEntries.length} Fotografia(s) Anexadas` : 'Sem Fotos'}
                        </span>
                      </span>

                      {!hasFotos ? (
                        <p className="text-[11px] text-slate-500 italic py-1">Sem fotografias anexadas ao auto de cedência.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                          {pdfFotos.map((f) => (
                            <div key={f.id} className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 text-center space-y-1">
                              <img src={f.foto_url} alt={f.angulo_zona} className="w-full h-24 object-cover rounded-md border border-slate-700" />
                              <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">{f.angulo_zona}</span>
                            </div>
                          ))}

                          {pdfFotos.length === 0 && uploadEntries.map(([ang, url]) => (
                            <div key={ang} className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 text-center space-y-1">
                              <img src={url} alt={ang} className="w-full h-24 object-cover rounded-md border border-slate-700" />
                              <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">{ang}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Signatures Footer */}
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800 text-center text-[10px]">
                  <div className="space-y-6">
                    <div className="border-t border-slate-600 pt-1">
                      <strong className="text-slate-200 block text-[11px]">Pelo Cedente (Logística Esquadra 991)</strong>
                      <span className="text-slate-500">Assinatura e Carimbo Oficial</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="border-t border-slate-600 pt-1">
                      <strong className="text-slate-200 block text-[11px]">Pelo Recetor ({selectedEmprestimoForPdf.nome_responsavel})</strong>
                      <span className="text-slate-500">Assinatura do Responsável Externo</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
