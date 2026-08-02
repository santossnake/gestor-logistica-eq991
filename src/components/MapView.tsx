'use client';

import React, { useEffect, useState } from 'react';
import { Viatura } from '@/lib/supabase/client';

interface MapViewProps {
  viaturas: Viatura[];
  selectedViaturaId?: string;
  onSelectViatura?: (v: Viatura) => void;
}

export default function MapView({ viaturas, selectedViaturaId, onSelectViatura }: MapViewProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-80 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 text-sm font-mono">
        A carregar mapa da frota (Base Aérea da Ota: 39.094, -8.967)...
      </div>
    );
  }

  // Import Leaflet components dynamically on client side
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
  const L = require('leaflet');

  // Helper to extract last 2 digits of license plate (e.g., 'AM-96-11' -> '11')
  const getLastTwoDigits = (matricula: string) => {
    const clean = matricula.replace(/[^0-9]/g, '');
    if (clean.length >= 2) {
      return clean.slice(-2);
    }
    return matricula.slice(-2);
  };

  // Custom square marker icon creator
  const createCustomSquareIcon = (estado: string, matricula: string, necessitaLimpeza?: boolean) => {
    let bgColor = '#22c55e'; // Green for DISPONIVEL
    if (estado === 'EM_USO') {
      bgColor = '#3b82f6'; // Blue for EM_USO
    } else if (estado === 'MANUTENCAO' || estado === 'EMPRESTADA_EXTERNO') {
      bgColor = '#ef4444'; // Red for indisponível
    }

    const digits = getLastTwoDigits(matricula);
    const borderStyle = necessitaLimpeza ? '3px dashed #f59e0b' : '2px solid #ffffff';

    return L.divIcon({
      className: 'custom-square-pin',
      html: `
        <div style="
          background-color: ${bgColor};
          width: 34px;
          height: 34px;
          border-radius: 6px;
          border: ${borderStyle};
          box-shadow: 0 0 10px ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: monospace;
          font-weight: 900;
          font-size: 14px;
          position: relative;
        ">
          ${digits}
          ${necessitaLimpeza ? '<span style="position:absolute; top:-6px; right:-6px; background:#f59e0b; width:12px; height:12px; border-radius:50%; border:1px solid #000;"></span>' : ''}
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  // Exact requested default map center: [39.094, -8.967]
  const otaCenter = [39.094, -8.967];

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* @ts-ignore */}
      <MapContainer
        center={otaCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {viaturas.map((v) => {
          const lat = v.latitude_atual || 39.094;
          const lng = v.longitude_atual || -8.967;

          return (
            <Marker
              key={v.id}
              position={[lat, lng]}
              icon={createCustomSquareIcon(v.estado, v.matricula, v.necessita_limpeza)}
              eventHandlers={{
                click: () => onSelectViatura && onSelectViatura(v)
              }}
            >
              <Popup>
                <div className="text-xs space-y-1.5 p-1">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span>{v.matricula}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono font-bold">
                      {v.estado}
                    </span>
                  </div>
                  <p className="text-slate-300 font-semibold">{v.modelo}</p>
                  
                  {v.necessita_limpeza && (
                    <div className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold text-[11px] flex items-center space-x-1">
                      <span>🧼 NECESSITA DE LIMPEZA</span>
                    </div>
                  )}

                  <p className="text-slate-400">Odómetro: {v.km_atuais.toLocaleString()} km</p>
                  <p className="text-slate-400">Parque: {v.localizacao_atual_viatura}</p>
                  <p className="text-slate-400">Chaveiro: {v.localizacao_atual_chave}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
