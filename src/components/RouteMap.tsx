'use client';

import React, { useEffect, useState } from 'react';
import { HistoricoGps } from '@/lib/supabase/client';

interface RouteMapProps {
  pontosGps: HistoricoGps[];
}

export default function RouteMap({ pontosGps }: RouteMapProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-96 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 text-sm font-mono">
        A carregar mapa de percurso (Base Aérea da Ota)...
      </div>
    );
  }

  if (!pontosGps || pontosGps.length === 0) {
    return (
      <div className="w-full h-96 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 text-sm font-mono">
        Sem dados de coordenadas GPS para o filtro selecionado na zona da Ota.
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = require('react-leaflet');
  const L = require('leaflet');

  const positions: [number, number][] = pontosGps.map((p) => [p.latitude, p.longitude]);
  // Default fallback center: Base Aérea da Ota
  const centerPos = positions[0] || [39.1090, -8.9735];

  const getEventIcon = (tipo: string) => {
    let color = '#22c55e'; // Green for start
    if (tipo === 'FIM_MARCHA') color = '#ef4444'; // Red for end
    if (tipo === 'INCIDENTE') color = '#eab308'; // Yellow for incident
    if (tipo === 'FOTO_ODOMETRO') color = '#06b6d4'; // Cyan
    if (tipo === 'PING_PERCURSO') color = '#3b82f6'; // Blue

    return L.divIcon({
      className: 'event-pin',
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 4px; border: 2px solid #ffffff; box-shadow: 0 0 6px ${color};"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* @ts-ignore */}
      <MapContainer
        center={centerPos}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route line */}
        <Polyline positions={positions} color="#10b981" weight={4} opacity={0.8} dashArray="5, 10" />

        {pontosGps.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={getEventIcon(p.tipo_evento)}>
            <Popup>
              <div className="text-xs space-y-1 p-1">
                <div className="font-bold text-slate-100 uppercase flex items-center justify-between">
                  <span>{p.tipo_evento.replace('_', ' ')}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(p.registado_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300">Operador (NIP): {p.nip_operador}</p>
                <p className="text-slate-400 font-mono">
                  Lat: {p.latitude.toFixed(5)}, Lng: {p.longitude.toFixed(5)}
                </p>
                {p.precisao_metros && (
                  <p className="text-emerald-400 font-mono">Precisão: ±{p.precisao_metros}m</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
