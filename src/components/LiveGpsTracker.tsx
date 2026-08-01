'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Navigation, Radio, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface LiveGpsTrackerProps {
  viaturaId: string;
  registoMarchaId?: string;
  nipOperador: string;
  isActive: boolean;
  onPositionUpdate?: (lat: number, lng: number) => void;
}

export function LiveGpsTracker({
  viaturaId,
  registoMarchaId,
  nipOperador,
  isActive,
  onPositionUpdate
}: LiveGpsTrackerProps) {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [status, setStatus] = useState<string>('GPS inativo');
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [pingCount, setPingCount] = useState<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setStatus('Rastreio GPS encerrado');
      return;
    }

    if (!('geolocation' in navigator)) {
      setStatus('Geolocalização não suportada neste dispositivo');
      return;
    }

    setStatus('A inicializar o GPS do telemóvel...');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setCurrentPos({ lat, lng, accuracy });
        if (onPositionUpdate) {
          onPositionUpdate(lat, lng);
        }

        // Limit ping database recording to max once every 15 seconds to prevent spam
        const now = Date.now();
        if (now - lastSentTimeRef.current >= 15000) {
          lastSentTimeRef.current = now;
          setPingCount((prev) => prev + 1);
          setLastPingTime(new Date().toLocaleTimeString());

          // Post position ping to Supabase
          try {
            await supabase.from('historico_posicoes_gps').insert([
              {
                viatura_id: viaturaId,
                registo_marcha_id: registoMarchaId || null,
                nip_operador: nipOperador,
                latitude: lat,
                longitude: lng,
                precisao_metros: Math.round(accuracy),
                tipo_evento: 'PING_PERCURSO',
                registado_at: new Date().toISOString()
              }
            ]);

            // Update latest position on vehicle table
            await supabase
              .from('viaturas')
              .update({
                latitude_atual: lat,
                longitude_atual: lng,
                fonte_ultima_localizacao: 'GPS_DISPOSITIVO_CONDUTOR',
                ultima_localizacao_at: new Date().toISOString()
              })
              .eq('id', viaturaId);
          } catch (err) {
            console.error('Erro ao registar ping GPS:', err);
          }
        }
      },
      (error) => {
        console.warn('Aviso Geolocation:', error.message);
        setStatus(`Sinal GPS fraco ou indisponível (${error.message})`);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, viaturaId, registoMarchaId, nipOperador]);

  if (!isActive) return null;

  return (
    <div className="p-3 rounded-xl bg-slate-900/95 border border-emerald-500/40 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5" />
            <span>RASTREIO GPS EM SEGUNDO PLANO ATIVO</span>
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
          {pingCount} pings gravados
        </span>
      </div>

      <p className="text-xs text-slate-300 flex items-center space-x-1">
        <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span>📍 Rastreio GPS de percurso ativo para esta marcha até ao fecho.</span>
      </p>

      {currentPos ? (
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/80 p-1.5 rounded">
          <div>
            Lat: <span className="text-slate-200">{currentPos.lat.toFixed(5)}</span> | Lng: <span className="text-slate-200">{currentPos.lng.toFixed(5)}</span>
          </div>
          {currentPos.accuracy && (
            <div className="text-emerald-400">
              Precisão: ±{Math.round(currentPos.accuracy)}m
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-amber-400 font-mono flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>{status}</span>
        </div>
      )}
    </div>
  );
}
