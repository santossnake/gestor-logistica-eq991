'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Printer, Wifi, Car, Shield, Copy, Check, FileText } from 'lucide-react';
import { supabase, Viatura } from '@/lib/supabase/client';
import { MOCK_VIATURAS } from '@/lib/mock-data';

export default function QrCodesAdminPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadFleet() {
      try {
        const { data } = await supabase.from('viaturas').select('*');
        setViaturas(data && data.length > 0 ? data : MOCK_VIATURAS);
      } catch (err) {
        console.error(err);
        setViaturas(MOCK_VIATURAS);
      }
    }
    loadFleet();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = (token: string) => {
    const fullUrl = `${window.location.origin}/chave/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* CSS For Print Layout */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print-sheet {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wider">
              Gerador de QR Codes & Folha de Etiquetas A4
            </h1>
            <p className="text-xs text-slate-400">
              Etiquetas prontas a imprimir para afixar no porta-chaves das viaturas e no Chaveiro EQ991.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center space-x-2 shadow-lg shadow-emerald-950 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>🖨️ Imprimir Folha A4 de Etiquetas</span>
        </button>
      </div>

      {/* General Recommended QR Code Card */}
      <div className="p-6 rounded-2xl glass-panel border-2 border-emerald-500/50 space-y-4 text-center print:border-slate-400 print:bg-white print:text-black">
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40 print:bg-slate-200 print:text-black print:border-black">
          AFIXAR NO PAINEL PRINCIPAL DA ESQUADRA 991 (CHAVEIRO)
        </span>
        <h2 className="text-xl font-black text-white uppercase tracking-wider print:text-black">
          QR CODE GERAL - VIATURA RECOMENDADA
        </h2>
        <p className="text-xs text-slate-300 max-w-md mx-auto print:text-slate-700">
          Apontar a câmara do smartphone ou encostar o telemóvel NFC a este código redireciona imediatamente para a melhor viatura disponível.
        </p>

        <div className="w-40 h-40 mx-auto bg-white p-3 rounded-xl flex items-center justify-center shadow-2xl border border-slate-300">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
              typeof window !== 'undefined' ? `${window.location.origin}/recomendada` : 'https://eq991.emfa.pt/recomendada'
            )}`}
            alt="QR Code Geral Recomendada"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-[11px] font-mono text-slate-400 print:text-black">URL NDEF / NFC: /recomendada</p>
      </div>

      {/* Key Tags Grid */}
      <div className="space-y-3 print-sheet">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider print:text-black">
          Etiquetas Individuais de Porta-Chaves & Viaturas ({viaturas.length} viaturas)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3">
          {viaturas.map((v) => {
            const url = typeof window !== 'undefined' ? `${window.location.origin}/chave/${v.qr_code_token}` : `https://eq991.emfa.pt/chave/${v.qr_code_token}`;

            return (
              <div key={v.id} className="p-4 rounded-xl glass-card border border-slate-700 space-y-3 text-center print:border-2 print:border-black print:bg-white print:text-black print:p-3">
                <div className="flex items-center justify-between font-mono text-xs border-b border-slate-800 print:border-black pb-2">
                  <span className="font-black text-emerald-400 print:text-black text-sm">{v.matricula}</span>
                  <span className="text-slate-400 print:text-black font-bold">{v.modelo}</span>
                </div>

                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg flex items-center justify-center border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`}
                    alt={`QR Code ${v.matricula}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="text-[10px] font-mono text-slate-400 print:text-black space-y-0.5">
                  <div className="font-bold text-slate-200 print:text-black">ESQUADRA 991 - FAP</div>
                  <div>TAG NFC / TOKEN: {v.qr_code_token}</div>
                </div>

                <button
                  onClick={() => handleCopyUrl(v.qr_code_token)}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 flex items-center justify-center space-x-1 transition-colors print:hidden"
                >
                  {copiedToken === v.qr_code_token ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Link para Tag NFC</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
