'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [showIosInstructions, setShowIosInstructions] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandaloneApp) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDetected);

    if (iosDetected) {
      setShowPrompt(true);
    }

    // Listen for beforeinstallprompt event (Android / Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="my-4">
      {/* Banner Card */}
      <div className="p-4 rounded-xl glass-panel border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-mono font-bold text-xs text-emerald-400 block">APLICAÇÃO WEB INSTALÁVEL (PWA)</span>
            <h3 className="text-sm font-bold text-slate-100">Instalar Esquadra 991 no Telemóvel</h3>
            <p className="text-xs text-slate-400">Acesso instantâneo a partir do ecrã principal sem abrir o navegador.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={handleInstallClick}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-950 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Aplicação</span>
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-2 text-slate-500 hover:text-slate-300 rounded"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full glass-panel p-5 rounded-2xl border border-emerald-500/40 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Share className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white uppercase">Instalar no iPhone / iPad</h3>
            
            <div className="space-y-3 text-xs text-slate-300 text-left bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono">
              <p className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">1</span>
                <span>No Safari, toque no ícone de <strong>Partilhar</strong> (<Share className="w-3.5 h-3.5 inline text-blue-400" />) na barra inferior.</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">2</span>
                <span>Role para baixo e selecione <strong>Adicionar ao Ecrã Principal</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />).</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">3</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
              </p>
            </div>

            <button
              onClick={() => setShowIosInstructions(false)}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs uppercase"
            >
              Compreendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
