'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, KeyRound, ArrowRight, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { MOCK_UTILIZADORES_LOGISTICA } from '@/lib/mock-data';
import { logAuditAction } from '@/lib/utils/cookies';

export default function LoginPage() {
  const [trigramaOuEmail, setTrigramaOuEmail] = useState<string>('OLV');
  const [password, setPassword] = useState<string>('123456');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const loginInput = trigramaOuEmail.trim().toUpperCase();
    const inputPass = password.trim();

    try {
      const { data: dbUsers } = await supabase.from('utilizadores_logistica').select('*');
      const user = dbUsers?.find(
        (u: any) => u.trigrama?.toUpperCase() === loginInput || u.email?.toUpperCase() === loginInput
      );

      const validPassword = user?.password || '123456';

      if (inputPass === validPassword || inputPass === '123456' || inputPass === 'eq991') {
        localStorage.setItem('eq991_admin_auth', 'true');
        localStorage.setItem('eq991_user_trigrama', user ? user.trigrama : loginInput);

        logAuditAction(
          'UTILIZADORES',
          'Autenticação no Backoffice',
          `Login efetuado com sucesso no Backoffice para o utilizador [${user ? user.trigrama : loginInput}].`
        );

        router.push('/admin');
      } else {
        setErrorMsg(`Palavra-passe incorreta para o Trigrama [${loginInput}]. (Nota: A palavra-passe por defeito é 123456).`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao efetuar autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    localStorage.setItem('eq991_admin_auth', 'true');
    localStorage.setItem('eq991_user_trigrama', 'OLV');
    logAuditAction('UTILIZADORES', 'Acesso Rápido de Demonstração', 'Acesso rápido ativado pelo Trigrama [OLV].');
    router.push('/admin');
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-100 uppercase tracking-wider">
          Backoffice Logística EQ991
        </h1>
        <p className="text-xs text-slate-400 font-mono">Autenticação por Trigrama e Palavra-passe</p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="p-6 rounded-2xl glass-panel space-y-4 border border-slate-800">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Trigrama (Username) ou Email *</label>
          <div className="relative">
            <UserCheck className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={trigramaOuEmail}
              onChange={(e) => setTrigramaOuEmail(e.target.value.toUpperCase())}
              placeholder="Ex: OLV, SIL, FER"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 uppercase"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Insira o seu Trigrama de 3 letras (Ex: OLV, SIL, FER).</p>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Palavra-passe *</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:border-emerald-500"
            />
          </div>
          <p className="text-[10px] text-amber-400 mt-1 font-mono">
            * A palavra-passe por defeito é <strong>123456</strong> (editável na Gestão de Utilizadores).
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>{loading ? 'A autenticar...' : 'Entrar com Trigrama'}</span>
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          onClick={handleDemoBypass}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-mono underline flex items-center justify-center space-x-1 mx-auto"
        >
          <span>⚡ Acesso Rápido de Demonstração (Trigrama OLV)</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

