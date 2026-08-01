import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Esquadra 991 - Gestão de Viaturas & Reboque',
  description: 'Sistema de gestão, reserva, rastreio GPS e vistoria de viaturas da Esquadra 991 (Força Aérea Portuguesa)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500 font-mono">
          ESQUADRA 991 &bull; FORÇA AÉREA PORTUGUESA &bull; LOGÍSTICA DE TRANSPORTES
        </footer>
      </body>
    </html>
  );
}
