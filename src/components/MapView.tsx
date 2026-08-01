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
      <div className="w-full h-80 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 text-sm">
        A carregar mapa da frota...
      </div>
    );
  }

  // Import Leaflet components dynamically on client side
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
  const L = require('leaflet');

  // Custom marker icon creator
  const createCustomIcon = (estado: string) => {
    let color = '#22c55e'; // Green for available
    if (estado === 'EM_USO') color = '#3b82f6'; // Blue
    if (estado === 'EMPRESTADA_EXTERNO') color = '#a855f7'; // Purple
    if (estado === 'MANUTENCAO') color = '#ef4444'; // Red

    return L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px ${color};"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  // Base coordinates for BA1 / Esquadra 991 (Sintra / Granja do Marquês)
  const defaultCenter = [38.8315, -9.3385];

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* @ts-ignore */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {viaturas.map((v) => {
          const lat = v.latitude_atual || 38.8315;
          const lng = v.longitude_atual || -9.3385;

          return (
            <Marker
              key={v.id}
              position={[lat, lng]}
              icon={createCustomIcon(v.estado)}
              eventHandlers={{
                click: () => onSelectViatura && onSelectViatura(v)
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-1">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span>{v.matricula}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono">
                      {v.estado}
                    </span>
                  </div>
                  <p className="text-slate-300 font-semibold">{v.modelo}</p>
                  <p className="text-slate-400">Odómetro: {v.km_atuais.toLocaleString()} km</p>
                  <p className="text-slate-400">Local Viatura: {v.localizacao_atual_viatura}</p>
                  <p className="text-slate-400">Local Chave: {v.localizacao_atual_chave}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
