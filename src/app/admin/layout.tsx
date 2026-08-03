'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Key, MapPin, UserCheck, Map, AlertTriangle, FileText, QrCode, Building, Car, Calendar } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Gestão de Reservas', href: '/admin/reservas', icon: Calendar },
    { name: 'Utilizadores Logística (Trigramas)', href: '/admin/utilizadores', icon: UserCheck },
    { name: 'Gestão de Frota', href: '/admin/viaturas', icon: Car },
    { name: 'Cedências Externas', href: '/admin/emprestimos', icon: Building },
    { name: 'Mapa de Percursos', href: '/admin/mapa', icon: Map },
    { name: 'Último Utilizador', href: '/admin/ultimo-utilizador', icon: UserCheck },
    { name: 'Locais Parque/Chaveiro', href: '/admin/locais', icon: MapPin },
    { name: 'Anomalias & Gravidade', href: '/admin/anomalias', icon: AlertTriangle },
    { name: 'Relatórios & Estatísticas', href: '/admin/relatorios', icon: FileText },
    { name: 'Gerador QR / NFC', href: '/admin/qrcodes', icon: QrCode },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-header Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}
