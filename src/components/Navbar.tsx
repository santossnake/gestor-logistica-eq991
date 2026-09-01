'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Car, Calendar, MapPin, User, Lock, Radio, Menu, X, Smartphone, Home, BookOpen } from 'lucide-react';
import { getStoredMilitaryProfile, MilitaryProfile } from '@/lib/utils/cookies';

export function Navbar() {
  const [profile, setProfile] = useState<MilitaryProfile>({ nip: '', nome: '', posto: '', email: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    setProfile(getStoredMilitaryProfile());
    if (typeof window !== 'undefined') {
      setIsAdminLoggedIn(localStorage.getItem('eq991_admin_auth') === 'true');
    }
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
                <span className="font-bold text-base sm:text-lg tracking-wider text-slate-100 uppercase">ESQUADRA 991</span>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">FROTA</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono">FORÇA AÉREA PORTUGUESA</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/recomendada"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-2 transition-colors"
            >
              <Car className="w-4 h-4 text-blue-400" />
              <span>Viatura Recomendada</span>
            </Link>
            <Link
              href="/pedido"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-2 transition-colors"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Pedir Viatura</span>
            </Link>

            <Link
              href="/manual?tab=condutor"
              className="px-3 py-2 rounded-md text-sm font-medium text-purple-300 hover:text-purple-200 hover:bg-purple-950/60 flex items-center space-x-2 transition-colors border border-purple-500/30 rounded-lg"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>📘 Manual</span>
            </Link>

            {isAdminLoggedIn && (
              <Link
                href="/manual?tab=backoffice"
                className="px-3 py-2 rounded-md text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/60 flex items-center space-x-2 transition-colors border border-indigo-500/30 rounded-lg"
              >
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>🛡️ Manual Backoffice</span>
              </Link>
            )}

            <Link
              href="/admin"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-2 transition-colors"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Backoffice Logística</span>
            </Link>
          </nav>

          {/* Right side: User Profile & Mobile Menu Toggle Button */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {profile.nip ? (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{profile.posto || 'MILITAR'} {profile.nome.split(' ')[0]}</span>
                <span className="text-emerald-400 font-bold">[{profile.nip}]</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 font-mono">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>OPERACIONAL</span>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir Menu de Navegação"
              className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-emerald-400 focus:outline-none transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-emerald-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200 shadow-2xl">
          {profile.nip && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2 text-xs font-mono text-slate-300 mb-2">
              <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="block font-bold text-white">{profile.posto} {profile.nome}</span>
                <span className="text-emerald-400">NIP: {profile.nip} &bull; {profile.email}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Link
              href="/recomendada"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-sm font-semibold flex items-center space-x-3 border border-slate-800 transition-colors"
            >
              <Car className="w-5 h-5 text-blue-400" />
              <span>Viatura Recomendada & Frota</span>
            </Link>

            <Link
              href="/pedido"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-sm font-semibold flex items-center space-x-3 border border-slate-800 transition-colors"
            >
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Pedir Viatura / Reboque</span>
            </Link>

            <Link
              href="/chave/AM-96-11"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-sm font-semibold flex items-center space-x-3 border border-slate-800 transition-colors"
            >
              <Car className="w-5 h-5 text-amber-400" />
              <span>Abrir Chave de Viatura</span>
            </Link>

            {/* Manual do Utilizador (Disponível para todos os utilizadores) */}
            <Link
              href="/manual?tab=condutor"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-4 py-3 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-purple-200 text-sm font-semibold flex items-center space-x-3 border border-purple-500/40 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>📘 Manual do Utilizador</span>
            </Link>

            {/* Manual do Backoffice (Disponível apenas para utilizadores da Logística) */}
            {isAdminLoggedIn && (
              <Link
                href="/manual?tab=backoffice"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full px-4 py-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 text-sm font-semibold flex items-center space-x-3 border border-indigo-500/40 transition-colors"
              >
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>🛡️ Manual do Backoffice</span>
              </Link>
            )}

            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-sm font-semibold flex items-center space-x-3 border border-slate-800 transition-colors"
            >
              <Lock className="w-5 h-5 text-amber-400" />
              <span>Backoffice Logística (Gestão)</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
