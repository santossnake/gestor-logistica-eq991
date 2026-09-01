'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Car,
  Shield,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCcw,
  Square,
  Building,
  Key,
  Calendar,
  Lock,
  ChevronRight,
  Sparkles,
  MapPin,
  UserCheck,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { getStoredMilitaryProfile } from '@/lib/utils/cookies';

function ManualContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'CONDUTOR' | 'BACKOFFICE'>('CONDUTOR');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('eq991_admin_auth');
      if (auth === 'true') {
        setIsAdminLoggedIn(true);
      }
    }

    if (tabParam === 'backoffice') {
      setActiveTab('BACKOFFICE');
    } else if (tabParam === 'condutor') {
      setActiveTab('CONDUTOR');
    } else if (typeof window !== 'undefined' && localStorage.getItem('eq991_admin_auth') === 'true') {
      setActiveTab('BACKOFFICE');
    }
  }, [tabParam]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 px-2 sm:px-4">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/recomendada"
              className="text-xs font-mono text-slate-400 hover:text-emerald-400 flex items-center space-x-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar à Frota</span>
            </Link>
            <span className="text-slate-600">&bull;</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>MANUAL DA APLICAÇÃO</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wider mt-1">
            Manual de Utilização & Guia Operacional
          </h1>
          <p className="text-xs text-slate-400">
            Esquadra 991 — Força Aérea Portuguesa. Instruções detalhadas para Condutores e Administradores de Logística.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-emerald-950 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Imprimir / Guardar em PDF</span>
          </button>
        </div>
      </div>

      {/* Role-Based Tab Switcher (Condutor vs Backoffice Logística) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 font-mono text-xs font-bold print:hidden">
        <button
          onClick={() => setActiveTab('CONDUTOR')}
          className={`py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'CONDUTOR'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>🚗 Manual do Condutor / Operacional</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKOFFICE')}
          className={`py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'BACKOFFICE'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>🛡️ Manual do Backoffice / Logística {isAdminLoggedIn && '(Sessão Ativa)'}</span>
        </button>
      </div>

      {/* MANUAL DOCUMENT CONTAINER FOR PRINTING & DOWNLOAD */}
      <div
        id="manual-content-document"
        className="p-6 sm:p-10 rounded-2xl glass-panel border border-slate-800 space-y-8 bg-slate-950/90 text-slate-200 print:bg-white print:text-slate-900 print:p-0 print:border-none"
      >
        {/* Official Document Header */}
        <div className="border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg print:border-slate-400">
                991
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono print:text-slate-900">
                  ESQUADRA 991 — FORÇA AÉREA PORTUGUESA
                </h2>
                <p className="text-xs text-emerald-400 font-mono font-bold print:text-emerald-700">
                  LOGÍSTICA DE TRANSPORTES & GESTÃO INTELIGENTE DE FROTA
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-400 print:text-slate-600">
              <span className="block font-bold">MANUAL OFICIAL V2.5</span>
              <span>EMISSÃO: AGOSTO 2026</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MANUAL DO CONDUTOR / OPERACIONAL */}
        {/* ========================================================================= */}
        {activeTab === 'CONDUTOR' && (
          <div className="space-y-8">
            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs space-y-1 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-900">
              <h3 className="font-bold uppercase tracking-wider text-emerald-300 print:text-emerald-800 flex items-center space-x-1.5">
                <Car className="w-4 h-4" />
                <span>Manual do Condutor — Levantamento, Condução e Devolução</span>
              </h3>
              <p>
                Este guia contém as instruções operacionais para militares que utilizam as viaturas da Esquadra 991.
                O acesso às chaves e marchas pode ser efetuado através de QR Code no painel ou Tag NFC no porta-chaves.
              </p>
            </div>

            {/* Capítulo 1 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono text-xs">1</span>
                <span>Levantamento de Viatura & Início de Marcha</span>
              </h3>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300 print:text-slate-800">
                <p>
                  Ao aproximar o telemóvel da <strong>Tag NFC do porta-chaves</strong> ou ler o <strong>QR Code do painel</strong>, abre-se a página da viatura. No separador <strong>Iniciar</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
                    <span className="font-bold text-emerald-400 block uppercase text-[11px]">Modo A: Levantamento Direto (Em Meu Nome)</span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 print:text-slate-700">
                      <li>Indique o seu <strong>Trigrama ou Posto e Nome</strong> (ex.: <code>OLV</code> ou <code>Tenente Oliveira</code>).</li>
                      <li><em>(Opcional)</em> Opcionalmente preencha o <strong>NIP</strong> (não é obrigatório).</li>
                      <li>Indique o <strong>Destino / Função da Missão</strong> (ex.: <code>BA1 Sintra</code>).</li>
                      <li>Confirme os quilómetros do odómetro inicial.</li>
                      <li>Clique em <strong><code>[ 🚀 Iniciar Marcha nesta Viatura ]</code></strong>.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/40 space-y-2 print:bg-purple-50 print:border-purple-300">
                    <span className="font-bold text-purple-300 block uppercase text-[11px]">Modo B: Atribuição por Terceiro (`[ 👤 Atribuir a outro ]`)</span>
                    <p className="text-slate-400 text-[11px] print:text-slate-700">
                      Caso esteja a efetuar o levantamento em nome de outro militar que não utilizou a aplicação:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 print:text-slate-700">
                      <li>Clique no botão <strong><code>👤 Atribuir a outro</code></strong>.</li>
                      <li>Preencha o Trigrama/Nome do condutor que vai conduzir.</li>
                      <li>Clique em <strong><code>[ 🚀 Confirmar Atribuição & Iniciar Marcha ]</code></strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </section>

            {/* Capítulo 2 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-mono text-xs">2</span>
                <span>Troca de Condutor & Controlo de Rastreio GPS (`Alternar`)</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-300 print:text-slate-800">
                <p>
                  No separador <strong>Alternar</strong>, é possível transferir a viatura durante o serviço através de <strong>dois botões dedicados</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 print:bg-emerald-50 print:border-emerald-300">
                    <span className="font-bold text-emerald-300 flex items-center space-x-1">
                      <Play className="w-4 h-4 fill-emerald-400" />
                      <span>1. `[ 🖐️ Assumir Condução (Ativar GPS) ]`</span>
                    </span>
                    <p className="text-slate-400 print:text-slate-700">
                      Utilizado quando quem assume a condução está a operar o <strong>seu próprio telemóvel</strong>. Encerra a marcha anterior, inicia a nova marcha no seu nome e <strong>ativa o rastreio GPS neste telemóvel</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 space-y-2 print:bg-blue-50 print:border-blue-300">
                    <span className="font-bold text-blue-300 flex items-center space-x-1">
                      <RefreshCcw className="w-4 h-4" />
                      <span>2. `[ 🔄 Transferir Viatura (Desativar GPS) ]`</span>
                    </span>
                    <p className="text-slate-400 print:text-slate-700">
                      Utilizado quando o condutor atual passa a viatura a outro militar pelo <strong>dispositivo atual</strong>. Regista o novo levantamento em nome do recetor e <strong>desativa o rastreio GPS neste telemóvel</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-slate-800">
                  💡 <strong>Condutor Cessante Não Registado:</strong> Se a pessoa que tinha a viatura em posse anteriormente não registou a saída na app, preencha o campo opcional <em>&quot;Militar que Entrega / Deixa a Viatura&quot;</em> para manter o histórico de auditoria correto.
                </div>
              </div>
            </section>

            {/* Capítulo 3 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono text-xs">3</span>
                <span>Devolução da Viatura & Fecho de Marcha (`Finalizar`)</span>
              </h3>

              <div className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                <p>No fecho da missão, aceda ao separador <strong>Finalizar</strong>:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 print:text-slate-700">
                  <li>Indique os <strong>Quilómetros Finais do Odómetro</strong>.</li>
                  <li>Selecione o nível de combustível (Reserva, 1/4, 1/2, 3/4, Cheio).</li>
                  <li>Registe eventuais abastecimentos efetuados (Litros, Euros e Posto Militar/Comercial).</li>
                  <li>Confirme o local de parqueamento da viatura e de arrumação da chave.</li>
                  <li>Valide as checklists (Documentos, Cartão Galp, Equipamento e Higienização/Limpeza).</li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MANUAL DO BACKOFFICE / LOGÍSTICA */}
        {/* ========================================================================= */}
        {activeTab === 'BACKOFFICE' && (
          <div className="space-y-8">
            <div className="p-4 rounded-xl bg-purple-950/50 border border-purple-500/40 text-purple-200 text-xs space-y-1 print:bg-purple-50 print:border-purple-300 print:text-purple-900">
              <h3 className="font-bold uppercase tracking-wider text-purple-300 print:text-purple-800 flex items-center space-x-1.5">
                <Shield className="w-4 h-4" />
                <span>Manual do Backoffice de Logística — Gestão, Reservas & Cedências</span>
              </h3>
              <p>
                Guia completo para operadores de logística, sargentos de dia e administradores da Esquadra 991.
                Contém instruções para aprovação de reservas, emissão de autos em PDF e monitorização da frota.
              </p>
            </div>

            {/* Capítulo 1 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-xs">1</span>
                <span>Dashboard de Gestão & Alertas de Devolução em Atraso</span>
              </h3>

              <div className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                <p>
                  No menu <strong>Dashboard (`/admin`)</strong>, os operadores acedem em tempo real aos indicadores da frota:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 print:text-slate-700">
                  <li><strong>Controlo de Estados:</strong> Disponíveis, Reservadas, Em Uso (Marcha Ativa) e Empréstimos Externos.</li>
                  <li><strong>Alertas de Devolução em Atraso:</strong> Caso o prazo limite de uma cedência expire, surge no topo do Dashboard uma caixa de alerta pulsante a vermelho (<code>🚨 ALERTA: CEDÊNCIA EXTERNA EM ATRASO</code>) com o contacto do responsável.</li>
                  <li><strong>Rastreio GPS em Satélite HD:</strong> Mapa interativo com atualização das posições de cada viatura.</li>
                </ul>
              </div>
            </section>

            {/* Capítulo 2 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono text-xs">2</span>
                <span>Gestão e Aprovação de Pedidos de Reserva</span>
              </h3>

              <div className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                <p>No menu <strong>Gestão de Reservas (`/admin/reservas`)</strong>:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 print:text-slate-700">
                  <li>Analise os pedidos submetidos por militares através da página `/pedido`.</li>
                  <li>Selecione a viatura a atribuir à missão.</li>
                  <li>Clique em <strong><code>[ APROVAR PEDIDO ]</code></strong>.</li>
                  <li>Ao aprovar, a viatura passa ao estado <code>RESERVADA</code> e abre automaticamente o cliente de email nativo pré-preenchido para notificar o requerente via domínio oficial <code>@emfa.gov.pt</code>.</li>
                </ol>
              </div>
            </section>

            {/* Capítulo 3 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono text-xs">3</span>
                <span>Cedências a Entidades Externas & Geração de Auto em PDF</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-300 print:text-slate-800">
                <p>
                  No menu <strong>Cedências Externas (`/admin/emprestimos`)</strong> para cedências à BA1, AFA, GNR, PSP, etc.:
                </p>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
                  <span className="font-bold text-amber-300 block uppercase text-[11px]">Passo a Passo de Emissão do Auto</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 print:text-slate-700">
                    <li>Selecione a viatura a ceder e preencha a entidade recetora, responsável, contacto e data limite.</li>
                    <li><em>(Opcional)</em> Registe a vistoria fotográfica (Frente, Traseira, Laterais, Habitáculo, Painel, Danos).</li>
                    <li>Clique em <strong><code>[ 💾 Registrar Cedência Externa ]</code></strong>.</li>
                    <li>O sistema gera instantaneamente o <strong>Auto de Empréstimo em PDF</strong>.</li>
                    <li>Utilize os botões <strong><code>[ 🖨️ Imprimir ]</code></strong> ou <strong><code>[ 💾 Descarregar Auto ]</code></strong> para guardar a cópia assinada.</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Capítulo 4 */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 print:text-slate-900 print:border-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-mono text-xs">4</span>
                <span>Gestão de Frota & Libertação de Viaturas Órfãs</span>
              </h3>

              <div className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                <p>No menu <strong>Gestão de Frota (`/admin/viaturas`)</strong>:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 print:text-slate-700">
                  <li><strong>Acompanhamento Odómetrico:</strong> Monitorize a quilometragem real acumulada e os prazos de revisão programada.</li>
                  <li><strong>Higiene & Limpeza:</strong> Registe a conclusão de lavagens através do botão <code>Marcar Limpo</code>.</li>
                  <li><strong>Libertação de Viaturas Órfãs:</strong> Caso surja um aviso de viatura assinalada como &quot;Emprestada&quot; sem auto ativo na nuvem, utilize o botão de auto-recuperação <strong><code>[ 🔄 Libertar Viatura (Disponível) ]</code></strong> para repor o estado imediatamente.</li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {/* Official Document Footer */}
        <div className="border-t border-slate-800 pt-6 text-[10px] text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2 print:border-slate-300 print:text-slate-600">
          <span>ESQUADRA 991 — LOGÍSTICA DE TRANSPORTES DA FORÇA AÉREA PORTUGUESA</span>
          <span>DOCUMENTO OFICIAL DE UTILIZAÇÃO E NORMAS DE SERVIÇO</span>
        </div>
      </div>
    </div>
  );
}

export default function ManualPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs font-mono text-slate-400">A carregar Manual do Utilizador...</div>}>
      <ManualContent />
    </Suspense>
  );
}
