export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';

export type DeclarationStatusType =
  | 'PRODUCTION'
  | 'PAUSE'
  | 'STOP_TOOL_CHANGE'
  | 'STOP_WAITING'
  | 'STOP_BREAKDOWN'
  | 'STOP_OTHER';

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  badge_code?: string | null;
  pin_code?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Machine {
  id: number;
  code: string;
  name: string;
  workshop_sector: string;
  description?: string | null;
  current_status: DeclarationStatusType;
  current_reason?: string | null;
  current_order_reference?: string | null;
  current_operator_id?: number | null;
  current_operator?: User | null;
  status_updated_at: string;
  is_active: boolean;
  created_at: string;
}

export interface Declaration {
  id: number;
  machine_id: number;
  machine_code: string;
  machine_name: string;
  workshop_sector: string;
  user_id: number;
  user_first_name: string;
  user_last_name: string;
  user_username: string;
  status_type: DeclarationStatusType;
  status_label: string;
  reason_detail?: string | null;
  order_reference?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  is_ongoing: boolean;
}

export interface OperatorShift {
  id: number;
  machine_id?: number | null;
  machine_code?: string | null;
  machine_name?: string | null;
  user_id: number;
  user_first_name: string;
  user_last_name: string;
  previous_user_id?: number | null;
  previous_user_name?: string | null;
  action_type: string;
  notes?: string | null;
  timestamp: string;
}

export interface DailyMachineCell {
  date: string;
  day_label: string;
  durations_by_status: Record<DeclarationStatusType, number>;
  total_tracked_seconds: number;
  production_seconds: number;
  downtime_seconds: number;
  pause_seconds: number;
  trs_availability_pct: number;
  declarations_count: number;
  dominant_status?: DeclarationStatusType | null;
  last_operator_name?: string | null;
}

export interface MachineWeeklyRow {
  machine_id: number;
  machine_code: string;
  machine_name: string;
  workshop_sector: string;
  current_status: DeclarationStatusType;
  current_operator_name?: string | null;
  days: DailyMachineCell[];
  weekly_totals_by_status: Record<DeclarationStatusType, number>;
  weekly_production_seconds: number;
  weekly_downtime_seconds: number;
  weekly_pause_seconds: number;
  weekly_total_seconds: number;
  weekly_trs_pct: number;
  weekly_declarations_count: number;
}

export interface WeeklyAnalyticsResponse {
  year: number;
  week: number;
  week_start_date: string;
  week_end_date: string;
  week_label: string;
  global_kpis: {
    trs_availability_pct: number;
    production_seconds: number;
    downtime_seconds: number;
    pause_seconds: number;
    total_seconds: number;
    declarations_count: number;
    operator_shifts_count: number;
    active_machines_count: number;
  };
  machine_rows: MachineWeeklyRow[];
  declarations: Declaration[];
  operator_shifts: OperatorShift[];
}

export interface StatusConfigItem {
  key: DeclarationStatusType;
  label: string;
  shortLabel: string;
  category: 'PRODUCTION' | 'PAUSE' | 'ARRET';
  colorHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  barClass: string;
}

export const STATUS_CONFIG: Record<DeclarationStatusType, StatusConfigItem> = {
  PRODUCTION: {
    key: 'PRODUCTION',
    label: 'Production',
    shortLabel: 'Production',
    category: 'PRODUCTION',
    colorHex: '#10B981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    barClass: 'bg-emerald-500',
  },
  PAUSE: {
    key: 'PAUSE',
    label: 'Pause',
    shortLabel: 'Pause',
    category: 'PAUSE',
    colorHex: '#F59E0B',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
    barClass: 'bg-amber-400',
  },
  STOP_TOOL_CHANGE: {
    key: 'STOP_TOOL_CHANGE',
    label: "Arrêt : Changement d'outil",
    shortLabel: "Changement d'outil",
    category: 'ARRET',
    colorHex: '#6366F1',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-500',
    badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
    barClass: 'bg-indigo-500',
  },
  STOP_WAITING: {
    key: 'STOP_WAITING',
    label: 'Arrêt : Attentes',
    shortLabel: 'Attentes',
    category: 'ARRET',
    colorHex: '#F97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-500',
    badgeClass: 'bg-orange-100 text-orange-800 border border-orange-300',
    barClass: 'bg-orange-500',
  },
  STOP_BREAKDOWN: {
    key: 'STOP_BREAKDOWN',
    label: 'Arrêt : Panne',
    shortLabel: 'Panne',
    category: 'ARRET',
    colorHex: '#EF4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-700',
    borderClass: 'border-red-500',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
    barClass: 'bg-red-500',
  },
  STOP_OTHER: {
    key: 'STOP_OTHER',
    label: 'Arrêt : Autres arrêts',
    shortLabel: 'Autres arrêts',
    category: 'ARRET',
    colorHex: '#64748B',
    bgClass: 'bg-slate-500',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-500',
    badgeClass: 'bg-slate-200 text-slate-800 border border-slate-300',
    barClass: 'bg-slate-500',
  },
};

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  if (mins > 0) {
    return `${mins} min`;
  }
  return `${seconds}s`;
}

export function formatDateTimeFr(isoStr?: string | null): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr.endsWith('Z') ? isoStr : `${isoStr}Z`);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeFr(isoStr?: string | null): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr.endsWith('Z') ? isoStr : `${isoStr}Z`);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
