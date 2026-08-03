'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Key, MapPin, UserCheck, Map, AlertTriangle, FileText, QrCode, Building, Car, Calendar, ShieldCheck, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('eq991_admin_auth');
      if (auth !== 'true') {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('eq991_admin_auth');
    localStorage.removeItem('eq991_user_trigrama');
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="py-20 text-center text-xs font-mono text-slate-400">
        A verificar credenciais de acesso ao Backoffice...
      </div>
    );
  }

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
    { name: 'Log de Auditoria', href: '/admin/auditoria', icon: ShieldCheck },
    { name: 'Gerador QR / NFC', href: '/admin/qrcodes', icon: QrCode },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-header Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-thin">
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

        <button
          onClick={handleLogout}
          className="ml-2 px-3 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
          title="Terminar Sessão de Logística"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      <div>{children}</div>
    </div>
  );
}
