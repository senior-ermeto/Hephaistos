import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Smartphone,
  Cpu,
  Users,
  Tv,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  getStoredUser,
  getStoredToken,
  clearAuthSession,
} from './services/api';
import { User, Machine } from './types';
import { LoginPage } from './components/LoginPage';
import { WeeklyDashboard } from './components/WeeklyDashboard';
import { ShopFloorTerminal } from './components/ShopFloorTerminal';
import { MachinesManager } from './components/MachinesManager';
import { UsersManager } from './components/UsersManager';
import { AndonBoard } from './components/AndonBoard';

type NavView = 'dashboard' | 'terminal' | 'machines' | 'users' | 'andon';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const loadCoreData = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const [machinesList, usersList] = await Promise.all([
        api.getMachines(true),
        api.getUsers().catch(() => api.getOperators()),
      ]);
      setMachines(machinesList);
      setUsers(usersList);
    } catch (err) {
      console.error('Erreur chargement données principales:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadCoreData();
    }
  }, [currentUser, refreshTrigger, loadCoreData]);

  // Connexion WebSocket Temps Réel
  useEffect(() => {
    if (!currentUser) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = () => {
          setRefreshTrigger((prev) => prev + 1);
        };
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 4000);
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [currentUser]);

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isAdminOrManager =
    currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FA]">
      {/* Barre de Navigation Principale (#00305B) */}
      <header className="sticky top-0 z-40 bg-[#00305B] text-white shadow-ermeto border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Marque */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-2 rounded-xl shadow flex items-center justify-center shrink-0">
              <img
                src="/logo/logo_application_senior_aerospace_ermeto_vector.svg"
                alt="Senior Aerospace Ermeto"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">
                  HÉPHAÏSTOS
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-sky-400/20 text-sky-300 border border-sky-300/30">
                  Senior Aerospace Ermeto
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                Supervision & Suivi Hebdomadaire du Parc Machines
              </p>
            </div>
          </div>

          {/* Menu de Navigation Central */}
          <nav className="hidden xl:flex items-center gap-1.5 bg-[#001F3D] p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'dashboard'
                  ? 'bg-[#00A3E0] text-[#001F3D] shadow-md font-extrabold'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tableau Semaine & Suivi</span>
            </button>

            <button
              onClick={() => setActiveView('terminal')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'terminal'
                  ? 'bg-[#00A3E0] text-[#001F3D] shadow-md font-extrabold'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Terminal Atelier / Déclaration</span>
            </button>

            <button
              onClick={() => setActiveView('andon')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'andon'
                  ? 'bg-[#00A3E0] text-[#001F3D] shadow-md font-extrabold'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Écran Andon TV</span>
            </button>

            {isAdminOrManager && (
              <button
                onClick={() => setActiveView('machines')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeView === 'machines'
                    ? 'bg-[#00A3E0] text-[#001F3D] shadow-md font-extrabold'
                    : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Machines</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveView('users')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeView === 'users'
                    ? 'bg-[#00A3E0] text-[#001F3D] shadow-md font-extrabold'
                    : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Utilisateurs & Android</span>
              </button>
            )}
          </nav>

          {/* Infos Utilisateur & Statut Temps Réel */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                wsConnected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
              }`}
              title="Synchronisation Temps Réel WebSocket"
            >
              {wsConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Temps Réel Actif</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Mode Standard</span>
                </>
              )}
            </div>

            <button
              onClick={triggerGlobalRefresh}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Actualiser les données"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-white/15">
              <div className="w-9 h-9 rounded-xl bg-sky-400 text-[#001F3D] font-extrabold text-xs flex items-center justify-center">
                {currentUser.first_name[0]}
                {currentUser.last_name[0]}
              </div>
              <div className="text-xs leading-tight">
                <div className="font-bold text-white">
                  {currentUser.first_name} {currentUser.last_name}
                </div>
                <div className="text-[10px] text-sky-300 font-semibold uppercase">
                  {currentUser.role}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-400/30 transition"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Mobile / Tablette */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 bg-[#001F3D] border-t border-white/10">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'dashboard'
                ? 'bg-[#00A3E0] text-[#001F3D]'
                : 'text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tableau Semaine</span>
          </button>
          <button
            onClick={() => setActiveView('terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'terminal'
                ? 'bg-[#00A3E0] text-[#001F3D]'
                : 'text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Déclaration Atelier</span>
          </button>
          <button
            onClick={() => setActiveView('andon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'andon'
                ? 'bg-[#00A3E0] text-[#001F3D]'
                : 'text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Andon TV</span>
          </button>
          {isAdminOrManager && (
            <button
              onClick={() => setActiveView('machines')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'machines'
                  ? 'bg-[#00A3E0] text-[#001F3D]'
                  : 'text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Machines</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveView('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'users'
                  ? 'bg-[#00A3E0] text-[#001F3D]'
                  : 'text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Utilisateurs</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {activeView === 'dashboard' && (
              <WeeklyDashboard
                users={users}
                machines={machines.filter((m) => m.is_active)}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeView === 'terminal' && (
              <ShopFloorTerminal
                machines={machines.filter((m) => m.is_active)}
                operators={users.filter((u) => u.is_active)}
                currentUser={currentUser}
                onActionCompleted={triggerGlobalRefresh}
              />
            )}

            {activeView === 'andon' && <AndonBoard machines={machines} />}

            {activeView === 'machines' && (
              <MachinesManager
                machines={machines}
                onMachinesChanged={triggerGlobalRefresh}
              />
            )}

            {activeView === 'users' && (
              <UsersManager
                users={users}
                currentUser={currentUser}
                onUsersChanged={triggerGlobalRefresh}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Pied de page Senior Aerospace Ermeto */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/logo/logo_ermeto_classic_grand_vector.svg"
              alt="Senior Aerospace Ermeto"
              className="h-5 w-auto object-contain"
            />
            <span className="font-semibold text-[#00305B]">
              HÉPHAÏSTOS — Système de Suivi Machine & Atelier
            </span>
          </div>
          <div>
            Senior Aerospace Ermeto • Couleur Institutionnelle #00305B • React + FastAPI +
            PostgreSQL
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
