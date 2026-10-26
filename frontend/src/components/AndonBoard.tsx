import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tv, Clock, User as UserIcon, Activity, AlertTriangle } from 'lucide-react';
import { Machine, STATUS_CONFIG, formatDuration } from '../types';

interface AndonBoardProps {
  machines: Machine[];
}

export const AndonBoard: React.FC<AndonBoardProps> = ({ machines }) => {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMachines = machines.filter((m) => m.is_active);
  const prodCount = activeMachines.filter((m) => m.current_status === 'PRODUCTION').length;
  const stopCount = activeMachines.filter(
    (m) => m.current_status !== 'PRODUCTION' && m.current_status !== 'PAUSE'
  ).length;
  const pauseCount = activeMachines.filter((m) => m.current_status === 'PAUSE').length;

  return (
    <div className="bg-[#001529] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 space-y-6">
      {/* Header Andon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2.5 rounded-2xl shadow-lg">
            <img
              src="/logo/logo_application_senior_aerospace_ermeto_vector.svg"
              alt="Senior Aerospace Ermeto"
              className="h-9 w-auto"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Écran Géant Atelier — Supervision Andon Temps Réel</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              PARC MACHINES SENIOR AEROSPACE ERMETO
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-extrabold text-sm">
            🟢 En Production : {prodCount}
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-extrabold text-sm">
            🟡 En Pause : {pauseCount}
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-300 font-extrabold text-sm">
            🔴 En Arrêt : {stopCount}
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 font-mono font-bold text-sm text-sky-200">
            {new Date(nowMs).toLocaleTimeString('fr-FR')}
          </div>
        </div>
      </div>

      {/* Grille des Cartes Andon Grand Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeMachines.map((m) => {
          const st = STATUS_CONFIG[m.current_status] || STATUS_CONFIG.PAUSE;
          const updatedDate = new Date(
            m.status_updated_at.endsWith('Z')
              ? m.status_updated_at
              : `${m.status_updated_at}Z`
          );
          const elapsedSeconds = Math.max(
            0,
            Math.floor((nowMs - updatedDate.getTime()) / 1000)
          );
          const isBreakdown = m.current_status === 'STOP_BREAKDOWN';

          return (
            <motion.div
              key={m.id}
              layout
              className={`rounded-3xl p-6 border-2 flex flex-col justify-between transition relative overflow-hidden ${
                isBreakdown
                  ? 'bg-red-950/60 border-red-500 animate-pulse'
                  : m.current_status === 'PRODUCTION'
                  ? 'bg-[#002649] border-emerald-500/60'
                  : 'bg-[#002140] border-white/15'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-3 py-1 rounded-xl bg-white/10 text-sky-300 font-mono text-sm font-extrabold">
                    {m.code}
                  </span>
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-white ${st.bgClass}`}
                  >
                    {st.shortLabel}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-white leading-snug">
                  {m.name}
                </h3>
                <p className="text-xs text-sky-300/80 font-medium mt-1">
                  {m.workshop_sector}
                </p>

                {m.current_reason && (
                  <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-amber-200 font-semibold">
                    ⚠️ Motif : “{m.current_reason}”
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <UserIcon className="w-4 h-4 text-sky-400" />
                  <span className="font-bold">
                    {m.current_operator
                      ? `${m.current_operator.first_name} ${m.current_operator.last_name.toUpperCase()}`
                      : 'Non assigné'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono font-bold text-sky-300">
                  <Clock className="w-4 h-4" />
                  <span>Depuis {formatDuration(elapsedSeconds)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
