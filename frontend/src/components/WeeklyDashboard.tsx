import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  User as UserIcon,
  Cpu,
  Clock,
  Activity,
  AlertTriangle,
  Search,
  RefreshCw,
  UserCheck,
  X,
  FileText,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import {
  WeeklyAnalyticsResponse,
  User,
  Machine,
  STATUS_CONFIG,
  DeclarationStatusType,
  formatDuration,
  formatDateTimeFr,
  formatTimeFr,
  MachineWeeklyRow,
  DailyMachineCell,
} from '../types';

interface WeeklyDashboardProps {
  users: User[];
  machines: Machine[];
  refreshTrigger: number;
}

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({
  users,
  machines,
  refreshTrigger,
}) => {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'declarations' | 'shifts'>('matrix');

  const [data, setData] = useState<WeeklyAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inspectCell, setInspectCell] = useState<{
    machine: MachineWeeklyRow;
    day: DailyMachineCell;
  } | null>(null);

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const res = await api.getWeeklyAnalytics({
        year,
        week,
        user_id: selectedUserId,
        machine_id: selectedMachineId,
        status_type: selectedStatus,
      });
      setData(res);
      if (year === undefined) setYear(res.year);
      if (week === undefined) setWeek(res.week);
    } catch (err) {
      console.error('Erreur chargement tableau hebdomadaire:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
  }, [year, week, selectedUserId, selectedMachineId, selectedStatus, refreshTrigger]);

  const handlePrevWeek = () => {
    if (!data) return;
    if (data.week > 1) {
      setWeek(data.week - 1);
      setYear(data.year);
    } else {
      setYear(data.year - 1);
      setWeek(52);
    }
  };

  const handleNextWeek = () => {
    if (!data) return;
    if (data.week < 52) {
      setWeek(data.week + 1);
      setYear(data.year);
    } else {
      setYear(data.year + 1);
      setWeek(1);
    }
  };

  const handleCurrentWeek = () => {
    setYear(undefined);
    setWeek(undefined);
  };

  const resetFilters = () => {
    setSelectedUserId(null);
    setSelectedMachineId(null);
    setSelectedStatus(null);
    setSearchQuery('');
  };

  const filteredDeclarations = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.declarations;
    const q = searchQuery.toLowerCase();
    return data.declarations.filter(
      (d) =>
        d.machine_code.toLowerCase().includes(q) ||
        d.machine_name.toLowerCase().includes(q) ||
        d.user_first_name.toLowerCase().includes(q) ||
        d.user_last_name.toLowerCase().includes(q) ||
        d.status_label.toLowerCase().includes(q) ||
        (d.reason_detail && d.reason_detail.toLowerCase().includes(q)) ||
        (d.order_reference && d.order_reference.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const selectedOperatorObj = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  // Déclarations correspondant à la cellule inspectée (Machine + Jour)
  const inspectedDayDeclarations = useMemo(() => {
    if (!inspectCell || !data) return [];
    const targetDate = inspectCell.day.date;
    return data.declarations.filter((d) => {
      if (d.machine_id !== inspectCell.machine.machine_id) return false;
      const startDay = d.started_at.slice(0, 10);
      const endDay = d.ended_at ? d.ended_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
      return startDay <= targetDate && endDay >= targetDate;
    });
  }, [inspectCell, data]);

  return (
    <div className="space-y-6">
      {/* Barre supérieure : Navigation Semaine (Antériorité) + Export */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#00305B] text-white flex items-center justify-center shadow-md shadow-[#00305B]/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00A3E0]">
                Suivi Hebdomadaire & Antériorité
              </span>
              {loading && (
                <RefreshCw className="w-3.5 h-3.5 text-[#00305B] animate-spin" />
              )}
            </div>
            <h2 className="text-xl font-extrabold text-[#00305B]">
              {data ? data.week_label : 'Chargement de la période...'}
            </h2>
          </div>
        </div>

        {/* Contrôles de navigation par semaine */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevWeek}
              className="px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-700 font-semibold text-xs flex items-center gap-1 transition"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sem. Précédente</span>
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-3.5 py-2 rounded-lg bg-[#00305B] text-white font-bold text-xs shadow-sm transition mx-1"
            >
              Semaine Actuelle
            </button>
            <button
              onClick={handleNextWeek}
              className="px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-700 font-semibold text-xs flex items-center gap-1 transition"
              title="Semaine suivante"
            >
              <span>Sem. Suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <a
            href={api.getExportCsvUrl({
              year,
              week,
              user_id: selectedUserId,
              machine_id: selectedMachineId,
              status_type: selectedStatus,
            })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00305B]/10 hover:bg-[#00305B] text-[#00305B] hover:text-white font-bold text-xs transition border border-[#00305B]/20"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV / Excel</span>
          </a>
        </div>
      </div>

      {/* Cartes KPI de la semaine sélectionnée */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#00305B] to-[#001F3D] text-white rounded-2xl p-5 shadow-ermeto relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Disponibilité / TRS
              </span>
              <Activity className="w-5 h-5 text-sky-300" />
            </div>
            <div className="text-3xl font-extrabold">
              {data.global_kpis.trs_availability_pct}%
            </div>
            <div className="mt-2 w-full bg-white/15 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data.global_kpis.trs_availability_pct)}%` }}
              />
            </div>
            <p className="text-[11px] text-sky-200 mt-2">
              Ratio Production / (Production + Arrêts)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Temps en Production
              </span>
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {formatDuration(data.global_kpis.production_seconds)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Cumul sur {data.global_kpis.active_machines_count} machine(s) suivie(s)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                Cumul des Arrêts
              </span>
              <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {formatDuration(data.global_kpis.downtime_seconds)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Outils, attentes, pannes & autres (+{' '}
              {formatDuration(data.global_kpis.pause_seconds)} pause)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00305B]">
                Déclarations & Relèves
              </span>
              <span className="w-8 h-8 rounded-xl bg-[#00305B]/10 text-[#00305B] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {data.global_kpis.declarations_count}{' '}
              <span className="text-sm font-semibold text-slate-500">actions</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Dont {data.global_kpis.operator_shifts_count} changement(s) d&apos;opérateur loggé(s)
            </p>
          </motion.div>
        </div>
      )}

      {/* Barre de Filtres : Par Utilisateur / Machine / Statut / Recherche */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#00305B]">
            <Filter className="w-4 h-4 text-[#00A3E0]" />
            <span>Filtres d&apos;Analyse (Opérateur, Machine, État)</span>
          </div>
          {(selectedUserId || selectedMachineId || selectedStatus || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Réinitialiser tous les filtres</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtre par Utilisateur / Opérateur */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Filtrer par Utilisateur / Opérateur
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedUserId ?? ''}
                onChange={(e) =>
                  setSelectedUserId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#00305B] text-sm font-medium outline-none transition"
              >
                <option value="">Tous les utilisateurs ({users.length})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.last_name.toUpperCase()} {u.first_name} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtre par Machine */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Filtrer par Machine
            </label>
            <div className="relative">
              <Cpu className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedMachineId ?? ''}
                onChange={(e) =>
                  setSelectedMachineId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#00305B] text-sm font-medium outline-none transition"
              >
                <option value="">Toutes les machines ({machines.length})</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtre par Statut */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Type de Déclaration
            </label>
            <select
              value={selectedStatus ?? ''}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#00305B] text-sm font-medium outline-none transition"
            >
              <option value="">Toutes les déclarations</option>
              {Object.values(STATUS_CONFIG).map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recherche rapide */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Recherche (Motif, OF, Nom...)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un arrêt, OF..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#00305B] text-sm font-medium outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Bandeau récapitulatif quand un utilisateur est filtré */}
        {selectedOperatorObj && data && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 rounded-xl bg-[#00305B] text-white flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg">
                {selectedOperatorObj.first_name[0]}
                {selectedOperatorObj.last_name[0]}
              </div>
              <div>
                <div className="text-xs text-sky-300 font-semibold uppercase tracking-wider">
                  Filtre Opérateur Actif
                </div>
                <div className="text-base font-extrabold">
                  {selectedOperatorObj.first_name} {selectedOperatorObj.last_name.toUpperCase()}{' '}
                  <span className="text-xs font-normal text-slate-300">
                    ({selectedOperatorObj.username} • Badge: {selectedOperatorObj.badge_code || 'N/A'})
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <span className="text-slate-300 text-xs block">Déclarations (Semaine)</span>
                <span className="font-bold">{data.declarations.length} déclaration(s)</span>
              </div>
              <div>
                <span className="text-slate-300 text-xs block">Temps Production</span>
                <span className="font-bold text-emerald-300">
                  {formatDuration(data.global_kpis.production_seconds)}
                </span>
              </div>
              <div>
                <span className="text-slate-300 text-xs block">Temps Arrêts</span>
                <span className="font-bold text-amber-300">
                  {formatDuration(data.global_kpis.downtime_seconds)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Légende des Statuts & Sélecteur d'Onglets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 w-fit">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-[#00305B] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#00305B]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tableau Semaine par Machine</span>
          </button>
          <button
            onClick={() => setActiveTab('declarations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'declarations'
                ? 'bg-[#00305B] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#00305B]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>
              Journal Détaillé des Déclarations ({filteredDeclarations.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'shifts'
                ? 'bg-[#00305B] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#00305B]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>
              Changements d&apos;Opérateur ({data ? data.operator_shifts.length : 0})
            </span>
          </button>
        </div>

        {/* Légende couleurs */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200/80">
          {Object.values(STATUS_CONFIG).map((st) => (
            <div key={st.key} className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <span className={`w-3 h-3 rounded-full ${st.bgClass}`} />
              <span>{st.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VUE 1 : TABLEAU PAR SEMAINE (MATRICE MACHINE x LUNDI..DIMANCHE) */}
      {activeTab === 'matrix' && data && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-[#00305B] text-white text-left text-xs uppercase tracking-wider">
                  <th className="py-4 px-5 font-bold w-64 border-r border-white/10">
                    Machine & État Actuel
                  </th>
                  {data.machine_rows[0]?.days.map((d) => (
                    <th
                      key={d.date}
                      className="py-3.5 px-3 font-bold text-center border-r border-white/10"
                    >
                      <div>{d.day_label}</div>
                      <div className="text-[11px] font-normal text-sky-200 mt-0.5">
                        {d.date.split('-').reverse().slice(0, 2).join('/')}
                      </div>
                    </th>
                  )) || (
                    <th colSpan={7} className="py-4 px-4 text-center">
                      Jours de la semaine
                    </th>
                  )}
                  <th className="py-4 px-4 font-bold text-center bg-[#001F3D] w-48">
                    Bilan Semaine
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {data.machine_rows.map((row) => {
                  const currentSt =
                    STATUS_CONFIG[row.current_status] || STATUS_CONFIG.PAUSE;
                  return (
                    <tr
                      key={row.machine_id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Colonne Machine */}
                      <td className="p-4 border-r border-slate-200 align-top bg-slate-50/40">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block text-[11px] font-extrabold px-2 py-0.5 rounded bg-[#00305B]/10 text-[#00305B] mb-1">
                              {row.machine_code}
                            </span>
                            <div className="font-bold text-slate-900 leading-snug">
                              {row.machine_name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {row.workshop_sector}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${currentSt.badgeClass}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${currentSt.bgClass}`}
                            />
                            {currentSt.shortLabel}
                          </span>
                          {row.current_operator_name && (
                            <span className="text-[11px] font-medium text-slate-600 truncate">
                              👤 {row.current_operator_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Colonnes Lundi -> Dimanche */}
                      {row.days.map((day) => {
                        const hasActivity = day.total_tracked_seconds > 0;
                        return (
                          <td
                            key={day.date}
                            onClick={() =>
                              hasActivity &&
                              setInspectCell({ machine: row, day })
                            }
                            className={`p-2.5 border-r border-slate-200 align-top transition ${
                              hasActivity
                                ? 'cursor-pointer hover:bg-[#00305B]/[0.04]'
                                : 'bg-slate-50/50 opacity-60'
                            }`}
                          >
                            {hasActivity ? (
                              <div className="space-y-2">
                                {/* Barre de répartition multi-états sur la journée */}
                                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                                  {(
                                    Object.keys(STATUS_CONFIG) as DeclarationStatusType[]
                                  ).map((stKey) => {
                                    const sec = day.durations_by_status[stKey] || 0;
                                    if (sec <= 0) return null;
                                    const pct =
                                      (sec / day.total_tracked_seconds) * 100;
                                    return (
                                      <div
                                        key={stKey}
                                        style={{ width: `${pct}%` }}
                                        className={`${STATUS_CONFIG[stKey].barClass} h-full`}
                                        title={`${STATUS_CONFIG[stKey].label}: ${formatDuration(sec)}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Métriques clés du jour */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-emerald-700">
                                    Prod: {formatDuration(day.production_seconds)}
                                  </span>
                                  <span className="font-extrabold text-[#00305B]">
                                    {day.trs_availability_pct}%
                                  </span>
                                </div>

                                {day.downtime_seconds > 0 && (
                                  <div className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center justify-between">
                                    <span>Arrêts:</span>
                                    <span>{formatDuration(day.downtime_seconds)}</span>
                                  </div>
                                )}

                                {day.pause_seconds > 0 && (
                                  <div className="text-[10px] text-amber-700 flex items-center justify-between px-1">
                                    <span>Pause:</span>
                                    <span>{formatDuration(day.pause_seconds)}</span>
                                  </div>
                                )}

                                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                  <span>{day.declarations_count} décl.</span>
                                  {day.last_operator_name && (
                                    <span className="truncate max-w-[85px] font-medium text-slate-700">
                                      {day.last_operator_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 flex items-center justify-center text-xs text-slate-400 italic">
                                Aucune déclaration
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Colonne Bilan Semaine de la Machine */}
                      <td className="p-4 bg-[#00305B]/[0.03] align-top">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">
                              TRS Semaine
                            </span>
                            <span className="text-base font-extrabold text-[#00305B]">
                              {row.weekly_trs_pct}%
                            </span>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                            {(
                              Object.keys(STATUS_CONFIG) as DeclarationStatusType[]
                            ).map((stKey) => {
                              const sec = row.weekly_totals_by_status[stKey] || 0;
                              if (sec <= 0 || row.weekly_total_seconds <= 0)
                                return null;
                              const pct =
                                (sec / row.weekly_total_seconds) * 100;
                              return (
                                <div
                                  key={stKey}
                                  style={{ width: `${pct}%` }}
                                  className={`${STATUS_CONFIG[stKey].barClass} h-full`}
                                />
                              );
                            })}
                          </div>

                          <div className="text-xs space-y-1 pt-1">
                            <div className="flex justify-between text-emerald-700 font-semibold">
                              <span>Production :</span>
                              <span>{formatDuration(row.weekly_production_seconds)}</span>
                            </div>
                            <div className="flex justify-between text-red-600 font-semibold">
                              <span>Arrêts :</span>
                              <span>{formatDuration(row.weekly_downtime_seconds)}</span>
                            </div>
                            <div className="flex justify-between text-amber-700">
                              <span>Pauses :</span>
                              <span>{formatDuration(row.weekly_pause_seconds)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              💡 Astuce : Cliquez sur n&apos;importe quelle case journalière d&apos;une machine pour
              inspecter le détail chronologique des déclarations et opérateurs de ce jour.
            </span>
            <span className="font-semibold text-[#00305B]">
              Total : {data.declarations.length} déclaration(s) sur la période
            </span>
          </div>
        </div>
      )}

      {/* VUE 2 : JOURNAL CHRONOLOGIQUE DES DÉCLARATIONS (NOM/PRÉNOM, HEURE, MOTIF) */}
      {activeTab === 'declarations' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#00305B]">
                Journal Chronologique des Déclarations Machines
              </h3>
              <p className="text-xs text-slate-500">
                Traçabilité complète : Opérateur (Nom/Prénom), Horodatage début/fin, Machine et
                précision des arrêts.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold">Date & Heure Début</th>
                  <th className="py-3.5 px-4 font-bold">Fin / État</th>
                  <th className="py-3.5 px-4 font-bold">Durée</th>
                  <th className="py-3.5 px-4 font-bold">Machine</th>
                  <th className="py-3.5 px-4 font-bold">Opérateur (Nom & Prénom)</th>
                  <th className="py-3.5 px-4 font-bold">Action / Déclaration</th>
                  <th className="py-3.5 px-4 font-bold">Motif / Précision Texte & OF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredDeclarations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Aucune déclaration trouvée pour les critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredDeclarations.map((d) => {
                    const st =
                      STATUS_CONFIG[d.status_type] || STATUS_CONFIG.STOP_OTHER;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateTimeFr(d.started_at)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          {d.is_ongoing ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              En cours
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              {formatDateTimeFr(d.ended_at)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#00305B] whitespace-nowrap">
                          {formatDuration(d.duration_seconds)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-[#00305B]/10 text-[#00305B] mr-1.5">
                            {d.machine_code}
                          </span>
                          <span className="font-medium text-slate-800">
                            {d.machine_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setSelectedUserId(d.user_id)}
                            className="inline-flex items-center gap-2 font-bold text-[#00305B] hover:underline"
                            title="Cliquer pour filtrer toutes les déclarations de cet opérateur"
                          >
                            <span className="w-7 h-7 rounded-full bg-[#00305B] text-white text-xs flex items-center justify-center font-bold">
                              {d.user_first_name[0]}
                              {d.user_last_name[0]}
                            </span>
                            <span>
                              {d.user_last_name.toUpperCase()} {d.user_first_name}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.badgeClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${st.bgClass}`} />
                            {d.status_label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {d.reason_detail ? (
                            <span className="font-medium text-slate-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block">
                              “{d.reason_detail}”
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          {d.order_reference && (
                            <span className="ml-2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {d.order_reference}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE 3 : JOURNAL DES CHANGEMENTS D'OPÉRATEUR (SERVEUR LOGS) */}
      {activeTab === 'shifts' && data && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-base font-extrabold text-[#00305B]">
              Historique des Changements d&apos;Opérateur & Connexions Atelier
            </h3>
            <p className="text-xs text-slate-500">
              Journalisation serveur de chaque clic sur le bouton « Changement d&apos;opérateur »
              et prise de poste sur l&apos;application Android ou Web.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold">Date & Heure</th>
                  <th className="py-3.5 px-4 font-bold">Type d&apos;Événement</th>
                  <th className="py-3.5 px-4 font-bold">Nouvel Opérateur (Entrant)</th>
                  <th className="py-3.5 px-4 font-bold">Opérateur Précédent (Sortant)</th>
                  <th className="py-3.5 px-4 font-bold">Machine Concernée</th>
                  <th className="py-3.5 px-4 font-bold">Détails / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {data.operator_shifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucun changement d&apos;opérateur enregistré sur cette période.
                    </td>
                  </tr>
                ) : (
                  data.operator_shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {formatDateTimeFr(s.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#00305B]/10 text-[#00305B]">
                          <UserCheck className="w-3.5 h-3.5" />
                          {s.action_type === 'OPERATOR_CHANGE'
                            ? "Changement d'opérateur"
                            : 'Connexion Terminal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {s.user_last_name.toUpperCase()} {s.user_first_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {s.previous_user_name || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.machine_code ? (
                          <span className="font-bold text-xs px-2 py-1 rounded bg-slate-100 text-slate-800">
                            [{s.machine_code}] {s.machine_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Terminal Global Atelier</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {s.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALE D'INSPECTION D'UNE JOURNÉE MACHINE */}
      <AnimatePresence>
        {inspectCell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectCell(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200"
            >
              <div className="bg-[#00305B] text-white p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Détail Journalier Machine • {inspectCell.day.day_label}{' '}
                    {inspectCell.day.date.split('-').reverse().join('/')}
                  </span>
                  <h3 className="text-xl font-extrabold mt-0.5">
                    [{inspectCell.machine.machine_code}] {inspectCell.machine.machine_name}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectCell(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Résumé des durées par statut */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(STATUS_CONFIG) as DeclarationStatusType[]).map((stKey) => {
                    const sec = inspectCell.day.durations_by_status[stKey] || 0;
                    const cfg = STATUS_CONFIG[stKey];
                    return (
                      <div
                        key={stKey}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${cfg.bgClass}`} />
                          <span className="text-xs font-bold text-slate-700">
                            {cfg.shortLabel}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#00305B]">
                          {formatDuration(sec)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Liste des déclarations de cette journée */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Chronologie des déclarations ({inspectedDayDeclarations.length})
                  </h4>
                  <div className="space-y-2.5">
                    {inspectedDayDeclarations.map((d) => {
                      const cfg = STATUS_CONFIG[d.status_type] || STATUS_CONFIG.STOP_OTHER;
                      return (
                        <div
                          key={d.id}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-[#00305B]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badgeClass}`}
                              >
                                {d.status_label}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                👤 {d.user_last_name.toUpperCase()} {d.user_first_name}
                              </span>
                            </div>
                            {d.reason_detail && (
                              <div className="text-xs text-slate-600 italic">
                                Motif : “{d.reason_detail}”
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-bold text-[#00305B]">
                              {formatTimeFr(d.started_at)} →{' '}
                              {d.ended_at ? formatTimeFr(d.ended_at) : 'En cours'}
                            </div>
                            <div className="text-slate-500 font-semibold">
                              Durée : {formatDuration(d.duration_seconds)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
