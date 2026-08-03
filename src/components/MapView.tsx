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
        A carregar mapa da frota (Coordenadas Ota: 39.092, -8.968)...
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

  // Custom square marker icon creator reflecting real-time operational status
  const createCustomSquareIcon = (estado: string, matricula: string, necessitaLimpeza?: boolean) => {
    let bgColor = '#10b981'; // Emerald green for DISPONIVEL & clean
    let badgeHtml = '<span style="position:absolute; top:-6px; right:-6px; background:#059669; color:#ffffff; width:15px; height:15px; border-radius:50%; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">✓</span>';

    if (necessitaLimpeza === true) {
      bgColor = '#f59e0b'; // Amber for cleaning needed
      badgeHtml = '<span style="position:absolute; top:-6px; right:-6px; background:#d97706; color:#ffffff; width:15px; height:15px; border-radius:50%; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; font-size:10px;">🧼</span>';
    } else if (estado === 'RESERVADA') {
      bgColor = '#d97706'; // Amber/Orange for RESERVADA
      badgeHtml = '<span style="position:absolute; top:-6px; right:-6px; background:#b45309; color:#ffffff; width:15px; height:15px; border-radius:50%; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; font-size:10px;">📅</span>';
    } else if (estado === 'EM_USO') {
      bgColor = '#3b82f6'; // Blue for EM_USO
      badgeHtml = '<span style="position:absolute; top:-6px; right:-6px; background:#1d4ed8; color:#ffffff; width:15px; height:15px; border-radius:50%; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; font-size:10px;">🚗</span>';
    } else if (estado === 'MANUTENCAO' || estado === 'EMPRESTADA_EXTERNO') {
      bgColor = '#ef4444'; // Red for indisponível / anomalia
      badgeHtml = '<span style="position:absolute; top:-6px; right:-6px; background:#b91c1c; color:#ffffff; width:15px; height:15px; border-radius:50%; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; font-size:10px;">⚠️</span>';
    }

    const digits = getLastTwoDigits(matricula);
    const borderStyle = necessitaLimpeza === true ? '3px dashed #fbbf24' : '2.5px solid #ffffff';

    return L.divIcon({
      className: 'custom-square-pin',
      html: `
        <div style="
          background-color: ${bgColor};
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: ${borderStyle};
          box-shadow: 0 0 12px ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: monospace;
          font-weight: 900;
          font-size: 15px;
          position: relative;
        ">
          ${digits}
          ${badgeHtml}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  // Center map at exact coordinates requested: [39.092, -8.968]
  const otaCenter = [39.092, -8.968];

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* @ts-ignore */}
      <MapContainer
        center={otaCenter}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {viaturas.map((v) => {
          const lat = v.latitude_atual || 39.092;
          const lng = v.longitude_atual || -8.968;

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
                <div className="text-xs space-y-1.5 p-1 font-mono">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black">{v.matricula}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-emerald-400 font-bold border border-emerald-500/40">
                      {v.estado}
                    </span>
                  </div>
                  <p className="text-slate-300 font-bold">{v.modelo}</p>
                  
                  {v.necessita_limpeza ? (
                    <div className="px-2 py-1 rounded bg-amber-950/90 border border-amber-500/60 text-amber-300 font-bold text-[11px] flex items-center space-x-1">
                      <span>🧼 NECESSITA DE LIMPEZA</span>
                    </div>
                  ) : (
                    <div className="px-2 py-1 rounded bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-bold text-[11px] flex items-center space-x-1">
                      <span>✨ OPERACIONAL & LIMPA</span>
                    </div>
                  )}

                  <div className="text-slate-400 text-[11px] space-y-0.5 pt-1 border-t border-slate-800">
                    <p>Odómetro: <strong className="text-amber-300">{v.km_atuais.toLocaleString()} km</strong></p>
                    <p>Parque Viatura: <strong className="text-slate-200">{v.localizacao_atual_viatura}</strong></p>
                    <p>Local Chaveiro: <strong className="text-slate-200">{v.localizacao_atual_chave}</strong></p>
                    <p>Coordenadas: <strong className="text-emerald-400">{lat.toFixed(5)}, {lng.toFixed(5)}</strong></p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
