'use client';

import React, { useState, useEffect } from 'react';
import { Building, Camera, CheckCircle2, Shield, Calendar, User, Phone, Mail, FileText, AlertCircle, ArrowRight, Edit2, Trash2, Printer, Download, X } from 'lucide-react';
import { supabase, isSupabaseConfigured, Viatura, EmprestimoExterno, FotoEmprestimo } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_EMPRESTIMOS, MOCK_FOTOS_EMPRESTIMO } from '@/lib/mock-data';
import { POSTOS_FORCA_AEREA, getStoredEmprestimos, saveStoredEmprestimos, saveFleetOverride } from '@/lib/utils/cookies';

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
        const baseEmp = localEmp.length > 0 ? localEmp : (eData || []);

        setViaturas(rawFleet);
        setEmprestimos(baseEmp);
        setFotos(fData || []);

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

  // PDF AUTO DE EMPRÉSTIMO GENERATOR
  const gerarPDFAutoEmprestimo = (emp: EmprestimoExterno) => {
    const viatura = viaturas.find((v) => v.id === emp.viatura_id);
    const vMatricula = viatura ? viatura.matricula : 'AM-96-12';
    const vModelo = viatura ? viatura.modelo : 'Nissan Navara 4x4';
    const dataEmissao = new Date(emp.data_inicio || Date.now()).toLocaleString('pt-PT');
    const dataFim = new Date(emp.data_fim_prevista).toLocaleString('pt-PT');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permita pop-ups no seu navegador para visualizar/descarregar o Auto de Empréstimo em PDF.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>Auto de Empréstimo Externa - Esquadra 991</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { font-size: 20px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
          .header h2 { font-size: 14px; margin: 5px 0 0 0; color: #475569; }
          .badge { display: inline-block; background: #0f172a; color: #ffffff; padding: 4px 12px; font-weight: bold; font-size: 12px; margin-top: 10px; border-radius: 4px; }
          .section { margin-bottom: 20px; border: 1px solid #cbd5e1; padding: 15px; border-radius: 6px; }
          .section-title { font-weight: bold; font-size: 13px; text-transform: uppercase; background: #f1f5f9; padding: 4px 8px; margin: -15px -15px 12px -15px; border-bottom: 1px solid #cbd5e1; border-top-left-radius: 5px; border-top-right-radius: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
          .label { color: #64748b; font-size: 11px; text-transform: uppercase; }
          .value { font-weight: bold; font-size: 13px; }
          .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; text-align: center; font-size: 11px; }
          .signature-box { border-top: 1px solid #0f172a; padding-top: 8px; margin-top: 50px; }
          @media print { body { margin: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: sans-serif;">
            🖨️ Imprimir / Descarregar em PDF
          </button>
        </div>

        <div class="header">
          <h1>FORÇA AÉREA PORTUGUESA — ESQUADRA 991</h1>
          <h2>AUTO DE CEDÊNCIA E EMPRÉSTIMO EXTERNO DE VIATURA</h2>
          <div class="badge">DOCUMENTO OFICIAL DE TRANSPORTE TERRESTRE</div>
        </div>

        <div class="section">
          <div class="section-title">1. Identificação do Auto & Veículo</div>
          <div class="grid">
            <div><div class="label">Número do Auto</div><div class="value">AUTO-EMP-991-${emp.id.slice(-6).toUpperCase()}</div></div>
            <div><div class="label">Data de Emissão</div><div class="value">${dataEmissao}</div></div>
            <div><div class="label">Viatura Atribuída</div><div class="value">${vMatricula} — ${vModelo}</div></div>
            <div><div class="label">Odómetro de Saída</div><div class="value">${emp.km_inicio ? emp.km_inicio.toLocaleString() : 'N/D'} KM</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Entidade Recetora & Responsável</div>
          <div class="grid">
            <div><div class="label">Entidade Externa Recetora</div><div class="value">${emp.entidade_externa}</div></div>
            <div><div class="label">Militar / Responsável</div><div class="value">${emp.nome_responsavel}</div></div>
            <div><div class="label">Contacto Telefónico</div><div class="value">${emp.contacto_responsavel}</div></div>
            <div><div class="label">Email Institucional</div><div class="value">${emp.email_responsavel || 'N/D'}</div></div>
            <div><div class="label">Data Prevista de Devolução</div><div class="value">${dataFim}</div></div>
            <div><div class="label">Estado da Cedência</div><div class="value">${emp.estado}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. Observações & Estado de Conservação Inicial</div>
          <p style="font-size: 12px; margin: 0; white-space: pre-wrap;">${emp.observacoes_inicial || 'Viatura cedida em estado operacional regular, sem danos impeditivos registados.'}</p>
        </div>

        <div class="section">
          <div class="section-title">4. Termos de Responsabilidade Operacional</div>
          <ol style="font-size: 11px; margin: 0; padding-left: 20px;">
            <li>A entidade recetora responsabiliza-se pela condução segura, abastecimento de combustível e conservação do veículo.</li>
            <li>Qualquer acidente, dano ou anomalia mecânica deve ser reportado imediatamente à Logística da Esquadra 991.</li>
            <li>A viatura deve ser restituída na data fixada com o mesmo nível de combustível e higienização.</li>
          </ol>
        </div>

        <div class="footer">
          <div>
            <div class="signature-box">
              <strong>Pelo Cedente (Logística Esquadra 991)</strong><br>
              <span style="font-size: 10px; color: #64748b;">Assinatura e Carimbo Oficial</span>
            </div>
          </div>
          <div>
            <div class="signature-box">
              <strong>Pelo Recetor (${emp.nome_responsavel})</strong><br>
              <span style="font-size: 10px; color: #64748b;">Assinatura do Responsável Externo</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
      if (Object.keys(fotosUpload).length > 0 && isSupabaseConfigured()) {
        try {
          const fotoRecords = Object.entries(fotosUpload).map(([angulo, url]) => ({
            emprestimo_id: payloadEmprestimo.id,
            tipo_fase: 'INICIO' as const,
            angulo_zona: angulo as any,
            foto_url: url
          }));
          await supabase.from('fotos_emprestimo').insert(fotoRecords);
        } catch (netErr) {
          console.warn('Erro ao guardar fotos no Supabase:', netErr);
        }
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

        {/* Section 2: Mandatory Photographic Inspection Grid */}
        <div className="p-5 rounded-2xl glass-panel space-y-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>2. Auto de Vistoria Fotográfico Obrigatório (6+ Ângulos)</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ANGULOS_INSPECAO.map((ang: any) => (
              <div key={ang.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-300 font-bold block">{ang.label}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSimularUploadFoto(ang.id, e)}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-purple-900/60 file:text-purple-300 hover:file:bg-purple-800 cursor-pointer"
                />
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
    </div>
  );
}
