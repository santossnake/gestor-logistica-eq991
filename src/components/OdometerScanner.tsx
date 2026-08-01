'use client';

import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { createWorker } from 'tesseract.js';

interface OdometerScannerProps {
  onKmDetected: (km: number, photoUrl?: string) => void;
}

export function OdometerScanner({ onKmDetected }: OdometerScannerProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectedKm, setDetectedKm] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Generate local preview URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);

      // Perform OCR
      setIsProcessing(true);
      setStatusText('A analisar fotografia do painel com OCR...');

      try {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(dataUrl);
        await worker.terminate();

        const rawText = ret.data.text;
        console.log('Texto OCR extraído:', rawText);

        // Find numbers in text (odometers are usually 4 to 6 digit numbers)
        const numbers = rawText.match(/\b\d{4,7}\b/g);
        if (numbers && numbers.length > 0) {
          // Get highest plausible number
          const kmVal = parseInt(numbers[0], 10);
          setDetectedKm(kmVal);
          setStatusText(`Quilometragem identificada: ${kmVal.toLocaleString()} km`);
          onKmDetected(kmVal, dataUrl);
        } else {
          // Fallback regex for numbers with space or dots
          const cleanText = rawText.replace(/[^\d]/g, ' ');
          const fallbackMatches = cleanText.match(/\b\d{4,7}\b/g);
          if (fallbackMatches && fallbackMatches.length > 0) {
            const kmVal = parseInt(fallbackMatches[0], 10);
            setDetectedKm(kmVal);
            setStatusText(`Quilometragem identificada: ${kmVal.toLocaleString()} km`);
            onKmDetected(kmVal, dataUrl);
          } else {
            setStatusText('Não foi possível ler os números claramente. Por favor confirme manualmente.');
          }
        }
      } catch (err: any) {
        console.error('Erro no OCR:', err);
        setStatusText('Fotografia registada. Ajuste os quilómetros no formulário se necessário.');
        // Pass photo preview even if OCR had low confidence
        onKmDetected(0, dataUrl);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span>Digitalização Fotográfica do Odómetro (OCR)</span>
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-md bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Fotografar Painel</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
        />
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 text-xs text-cyan-400 py-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{statusText}</span>
        </div>
      )}

      {photoPreview && !isProcessing && (
        <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded border border-slate-800">
          <img src={photoPreview} alt="Odómetro" className="w-16 h-12 object-cover rounded border border-slate-700" />
          <div className="flex-1 min-w-0">
            {detectedKm ? (
              <div className="flex items-center space-x-1 text-emerald-400 font-mono text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>KM detetados: {detectedKm.toLocaleString()} KM</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-amber-400 font-mono text-xs">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Foto associada. Insira o valor exato no campo.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
