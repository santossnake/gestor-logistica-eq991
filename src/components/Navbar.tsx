'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Car, Calendar, MapPin, User, Lock, Radio } from 'lucide-react';
import { getStoredMilitaryProfile, MilitaryProfile } from '@/lib/utils/cookies';

export function Navbar() {
  const [profile, setProfile] = useState<MilitaryProfile>({ nip: '', nome: '', posto: '', email: '' });

  useEffect(() => {
    setProfile(getStoredMilitaryProfile());
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Unit Badge */}
          <Link href="/recomendada" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wider text-slate-100 uppercase">ESQUADRA 991</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">FROTA & REBOQUES</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">FORÇA AÉREA PORTUGUESA</p>
            </div>
          </Link>

          {/* Quick Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/pedido"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-2 transition-colors"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Pedir Viatura</span>
            </Link>
            <Link
              href="/recomendada"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-2 transition-colors"
            >
              <Car className="w-4 h-4 text-blue-400" />
              <span>Viatura Recomendada</span>
            </Link>
            <Link
              href="/admin"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-2 transition-colors"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Backoffice Logística</span>
            </Link>
          </nav>

          {/* User Profile Badge */}
          <div className="flex items-center space-x-3">
            {profile.nip ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{profile.posto || 'MILITAR'} {profile.nome.split(' ')[0]}</span>
                <span className="text-emerald-400 font-bold">[{profile.nip}]</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>OPERACIONAL</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
