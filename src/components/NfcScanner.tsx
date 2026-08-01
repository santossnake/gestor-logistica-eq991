'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NfcScannerProps {
  onTokenScanned?: (token: string) => void;
}

export function NfcScanner({ onTokenScanned }: NfcScannerProps) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Aproxime o telemóvel da Tag NFC do porta-chaves.');
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsSupported(true);
    }
  }, []);

  const handleStartScan = async () => {
    if (!('NDEFReader' in window)) {
      setStatusMessage('Leitura NFC direta via browser indisponível. Utilize o QR Code ou selecione a viatura.');
      return;
    }

    try {
      setIsScanning(true);
      setStatusMessage('Encoste a traseira do telemóvel à Tag NFC do porta-chaves...');

      // @ts-ignore
      const ndef = new NDEFReader();
      await ndef.scan();

      // @ts-ignore
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        console.log(`NFC Tag detectada. Serial: ${serialNumber}`);
        let token = serialNumber;

        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding);
            token = textDecoder.decode(record.data);
          } else if (record.recordType === 'url') {
            const textDecoder = new TextDecoder();
            const url = textDecoder.decode(record.data);
            const parts = url.split('/chave/');
            if (parts.length > 1) {
              token = parts[1];
            }
          }
        }

        if (token) {
          setScannedToken(token);
          setStatusMessage(`Tag lida com sucesso: ${token}`);
          if (onTokenScanned) {
            onTokenScanned(token);
          } else {
            router.push(`/chave/${token}`);
          }
        }
      });
    } catch (err: any) {
      console.error('Erro na leitura NFC:', err);
      setIsScanning(false);
      setStatusMessage(`Erro NFC: ${err.message || 'Leitura cancelada ou não suportada'}`);
    }
  };

  return (
    <div className="p-4 rounded-xl glass-card border border-slate-700 text-center space-y-3">
      <div className="flex items-center justify-center space-x-2 text-emerald-400">
        <Wifi className="w-5 h-5 animate-pulse" />
        <span className="font-semibold text-sm">LEITOR DE TAG NFC DO PORTA-CHAVES</span>
      </div>

      <p className="text-xs text-slate-300">{statusMessage}</p>

      {scannedToken ? (
        <div className="flex items-center justify-center space-x-2 text-emerald-400 font-mono text-sm font-bold bg-emerald-950/60 p-2 rounded border border-emerald-500/30">
          <CheckCircle className="w-4 h-4" />
          <span>Viatura Identificada: {scannedToken}</span>
        </div>
      ) : isSupported ? (
        <button
          onClick={handleStartScan}
          disabled={isScanning}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
            isScanning
              ? 'bg-amber-600/30 border border-amber-500/40 text-amber-300'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{isScanning ? 'A aguardar encosto da Tag NFC...' : 'Ativar Leitura NFC do Telemóvel'}</span>
        </button>
      ) : (
        <div className="flex items-center justify-center space-x-2 text-amber-400/90 text-xs bg-slate-800/80 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>No iOS/Safari, encoste o telemóvel à tag NFC gravada com o link web ou digitalize o QR Code.</span>
        </div>
      )}
    </div>
  );
}
