'use client';

import React, { useState, useEffect } from 'react';
import { Building, Camera, CheckCircle2, Shield, Calendar, User, Phone, Mail, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase, Viatura, EmprestimoExterno, FotoEmprestimo } from '@/lib/supabase/client';
import { MOCK_VIATURAS, MOCK_EMPRESTIMOS, MOCK_FOTOS_EMPRESTIMO } from '@/lib/mock-data';
import { POSTOS_FORCA_AEREA } from '@/lib/utils/cookies';

const ANGULOS_INSPECAO = [
  { id: 'FRENTE', label: '1. Frente / Para-choques *', req: true },
  { id: 'TRASEIRA', label: '2. Traseira *', req: true },
  { id: 'ESQUERDA', label: '3. Lateral Esquerda *', req: true },
  { id: 'DIREITA', label: '4. Lateral Direita *', req: true },
  { id: 'INTERIOR', label: '5. Habitáculo / Estofos *', req: true },
  { id: 'PAINEL', label: '6. Painel / Odómetro *', req: true },
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
        const { data: vData } = await supabase.from('viaturas').select('*').eq('estado', 'DISPONIVEL');
        const { data: eData } = await supabase.from('emprestimos_externos').select('*').order('created_at', { ascending: false });
        const { data: fData } = await supabase.from('fotos_emprestimo').select('*');

        setViaturas(vData && vData.length > 0 ? vData : MOCK_VIATURAS);
        setEmprestimos(eData && eData.length > 0 ? eData : MOCK_EMPRESTIMOS);
        setFotos(fData && fData.length > 0 ? fData : MOCK_FOTOS_EMPRESTIMO);

        if (vData && vData.length > 0) {
          setSelectedViaturaId(vData[0].id);
          setKmInicio(vData[0].km_atuais);
        } else if (MOCK_VIATURAS.length > 0) {
          setSelectedViaturaId(MOCK_VIATURAS[0].id);
          setKmInicio(MOCK_VIATURAS[0].km_atuais);
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

  const handleCriarEmprestimo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Check mandatory photos (first 6)
    const missingAngles = ANGULOS_INSPECAO.filter((a) => a.req && !fotosUpload[a.id]);
    if (missingAngles.length > 0) {
      setErrorMsg(`Preenchimento fotográfico incompleto! Faltam as fotografias: ${missingAngles.map((m) => m.label).join(', ')}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadEmprestimo = {
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

      const { data: empData, error: empErr } = await supabase.from('emprestimos_externos').insert([payloadEmprestimo]).select();
      const newEmpId = empData && empData.length > 0 ? empData[0].id : `emp-${Date.now()}`;

      // Insert photos records
      const fotoRecords = Object.entries(fotosUpload).map(([angulo, url]) => ({
        emprestimo_id: newEmpId,
        tipo_fase: 'INICIO' as const,
        angulo_zona: angulo as any,
        foto_url: url
      }));

      await supabase.from('fotos_emprestimo').insert(fotoRecords);

      // Update vehicle state to EMPRESTADA_EXTERNO
      await supabase.from('viaturas').update({ estado: 'EMPRESTADA_EXTERNO' }).eq('id', selectedViaturaId);

      // Send loan certificate email to external entity
      fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'EMPRESTIMO_EXTERNO_CRIADO',
          emailDestinatario: emailResp,
          entidade,
          nomeResp,
          dataFimPrevista
        })
      }).catch(console.error);

      setSuccessMsg(`Cedência a ${entidade} registada com sucesso! Vistoria fotográfica concluída.`);
      setFotosUpload({});
      setEntidade('');
      setNomeResp('');
      setContactoResp('');
      setEmailResp('');
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
                placeholder="Ex: ferreira@emfa.pt"
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
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {Object.keys(fotosUpload).length} / 6 fotografias recolhidas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ANGULOS_INSPECAO.map((ang) => {
              const preview = fotosUpload[ang.id];

              return (
                <div key={ang.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">{ang.label}</span>

                  {preview ? (
                    <div className="relative group">
                      <img src={preview} alt={ang.label} className="w-full h-28 object-cover rounded-lg border border-slate-700" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="px-3 py-1 bg-cyan-600 text-white rounded text-xs font-bold cursor-pointer">
                          Substituir
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSimularUploadFoto(ang.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full h-28 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 transition-colors">
                      <Camera className="w-6 h-6 text-slate-500 mb-1" />
                      <span className="text-[11px] text-slate-400 font-medium">Carregar / Fotografar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSimularUploadFoto(ang.id, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              );
            })}
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
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                      {emp.estado}
                    </span>
                  </div>

                  {/* Photo comparison preview */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {empFotos.map((f) => (
                      <img key={f.id} src={f.foto_url} alt={f.angulo_zona} className="w-16 h-12 object-cover rounded border border-slate-700 flex-shrink-0" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
