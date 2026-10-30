import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User as UserIcon, ArrowRight, ShieldCheck, Cpu, AlertCircle } from 'lucide-react';
import { api, saveAuthSession } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(username, password);
      saveAuthSession(res.access_token, res.user);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Échec de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#001F3D] text-white overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#00305B] opacity-70 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[#00A3E0] opacity-15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Left Hero Branding Panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-7/12 p-8 lg:p-16 flex flex-col justify-between relative z-10 bg-gradient-to-br from-[#00305B] via-[#002649] to-[#001830] border-b lg:border-b-0 lg:border-r border-white/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-lg flex items-center justify-center">
              <img
                src="/logo/logo_application_senior_aerospace_ermeto_vector.svg"
                alt="Senior Aerospace Ermeto"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300 block">
                Senior Aerospace Ermeto
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                HÉPHAÏSTOS <span className="font-light text-sky-300">MES</span>
              </h1>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/10 border border-white/15 text-sky-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Supervision Temps Réel v1.0
          </span>
        </div>

        <div className="my-12 max-w-xl">
          <div className="bg-white/95 p-5 rounded-2xl shadow-xl inline-block mb-8">
            <img
              src="/logo/logo_ermeto_classic_grand_vector.svg"
              alt="Logo Senior Aerospace Ermeto"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight mb-6">
            Pilotage & Suivi Hebdomadaire du{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-200">
              Parc Machines
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
            Plateforme centralisée de suivi de production, traçabilité des arrêts machines
            (changements d&apos;outils, attentes, pannes) et journalisation des opérateurs
            en liaison directe avec les terminaux Android d&apos;atelier.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <Cpu className="w-5 h-5 text-sky-300 mb-2" />
              <div className="font-semibold text-sm">Suivi Machine</div>
              <div className="text-xs text-slate-300 mt-0.5">
                Tableau par semaine & antériorité complète
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="font-semibold text-sm">Traçabilité Opérateur</div>
              <div className="text-xs text-slate-300 mt-0.5">
                Filtrage individuel & logs changements de poste
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <Lock className="w-5 h-5 text-amber-300 mb-2" />
              <div className="font-semibold text-sm">Administration</div>
              <div className="text-xs text-slate-300 mt-0.5">
                Création machines & comptes Android
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
          <span>© {new Date().getFullYear()} Senior Aerospace Ermeto — Système Héphaïstos</span>
          <span>Architecture React • FastAPI • PostgreSQL • Docker Debian</span>
        </div>
      </motion.div>

      {/* Right Login Card Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="lg:w-5/12 p-8 sm:p-12 lg:p-16 flex items-center justify-center relative z-10 bg-[#F4F7FA] text-slate-900"
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-ermeto-lg border border-slate-200/80 p-8 sm:p-10">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00305B]/10 text-[#00305B] text-xs font-bold uppercase tracking-wider mb-3">
              Portail Supervision & Admin
            </div>
            <h3 className="text-2xl font-extrabold text-[#00305B]">
              Connexion au Serveur
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Identifiez-vous pour accéder au tableau hebdomadaire et à la gestion du parc.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Identifiant Utilisateur
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: admin ou m.dubois"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#00305B] focus:ring-4 focus:ring-[#00305B]/15 outline-none transition text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Mot de Passe
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#00305B] focus:ring-4 focus:ring-[#00305B]/15 outline-none transition text-slate-900 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#00305B] hover:bg-[#004B8D] active:scale-[0.99] text-white font-bold shadow-lg shadow-[#00305B]/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Connexion en cours...</span>
              ) : (
                <>
                  <span>Accéder à Héphaïstos</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
