import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  UserCheck,
  Play,
  PauseCircle,
  Wrench,
  Clock,
  AlertOctagon,
  MessageSquarePlus,
  CheckCircle2,
  X,
  RefreshCw,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';
import {
  Machine,
  User,
  DeclarationStatusType,
  STATUS_CONFIG,
  formatDateTimeFr,
} from '../types';

interface ShopFloorTerminalProps {
  machines: Machine[];
  operators: User[];
  currentUser: User;
  onActionCompleted: () => void;
}

export const ShopFloorTerminal: React.FC<ShopFloorTerminalProps> = ({
  machines,
  operators,
  currentUser,
  onActionCompleted,
}) => {
  const [activeOperator, setActiveOperator] = useState<User>(currentUser);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showStopSubmenu, setShowStopSubmenu] = useState<boolean>(false);
  const [showOtherReasonInput, setShowOtherReasonInput] = useState<boolean>(false);
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [orderRefText, setOrderRefText] = useState<string>('');
  const [showOperatorModal, setShowOperatorModal] = useState<boolean>(false);
  const [targetMachineForSwitch, setTargetMachineForSwitch] = useState<number | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedbackToast({ type, message });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  const openMachineModal = (machine: Machine) => {
    setSelectedMachine(machine);
    setShowStopSubmenu(false);
    setShowOtherReasonInput(false);
    setOtherReasonText('');
    setOrderRefText(machine.current_order_reference || '');
  };

  const handleSendDeclaration = async (
    statusType: DeclarationStatusType,
    customReason?: string
  ) => {
    if (!selectedMachine) return;
    if (statusType === 'STOP_OTHER' && (!customReason || !customReason.trim())) {
      showToast('error', "Veuillez préciser le motif en texte pour 'Autres arrêts'.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createDeclaration({
        machine_id: selectedMachine.id,
        user_id: activeOperator.id,
        status_type: statusType,
        reason_detail: customReason?.trim() || undefined,
        order_reference: orderRefText.trim() || undefined,
      });

      showToast(
        'success',
        `Déclaration [${STATUS_CONFIG[statusType].label}] envoyée pour ${selectedMachine.code} par ${activeOperator.first_name} ${activeOperator.last_name}`
      );
      setSelectedMachine(null);
      onActionCompleted();
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la déclaration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOperatorSwitch = async (newOp: User) => {
    setSubmitting(true);
    try {
      await api.logOperatorChange({
        user_id: newOp.id,
        previous_user_id: activeOperator.id,
        machine_id: targetMachineForSwitch || selectedMachine?.id || undefined,
        pin_code: pinInput.trim() || undefined,
        notes: `Changement d'opérateur : ${activeOperator.first_name} ${activeOperator.last_name} -> ${newOp.first_name} ${newOp.last_name}`,
      });
      setActiveOperator(newOp);
      setShowOperatorModal(false);
      setPinInput('');
      showToast(
        'success',
        `Changement d'opérateur enregistré côté serveur : ${newOp.first_name} ${newOp.last_name}`
      );
      onActionCompleted();
    } catch (err: any) {
      showToast('error', err.message || 'Code PIN ou changement opérateur refusé');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
              feedbackToast.type === 'success'
                ? 'bg-[#00305B] text-white border-sky-400/30'
                : 'bg-red-600 text-white border-red-400'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{feedbackToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête Terminal Opérateur : Identification + Bouton Changement d'Opérateur */}
      <div className="bg-gradient-to-r from-[#00305B] via-[#00284D] to-[#001F3D] text-white rounded-3xl p-6 shadow-ermeto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-7 h-7 text-sky-300" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
              <span>Terminal Atelier & Miroir Application Android</span>
            </div>
            <h2 className="text-2xl font-extrabold mt-0.5">
              Sélectionnez une Machine pour Déclarer une Action
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Chaque action met à jour instantanément le tableau hebdomadaire sur le serveur.
            </p>
          </div>
        </div>

        {/* Bloc Opérateur Actif + Bouton Changement d'Opérateur */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-400 text-[#001F3D] font-extrabold text-base flex items-center justify-center">
              {activeOperator.first_name[0]}
              {activeOperator.last_name[0]}
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-sky-200 block font-semibold">
                Opérateur Identifié :
              </span>
              <span className="text-base font-extrabold text-white">
                {activeOperator.first_name} {activeOperator.last_name.toUpperCase()}
              </span>
              <span className="block text-[11px] text-slate-300">
                ID: {activeOperator.username} • Rôle: {activeOperator.role}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setTargetMachineForSwitch(null);
              setShowOperatorModal(true);
            }}
            className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#001F3D] font-extrabold text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 shrink-0"
          >
            <UserCheck className="w-4 h-4" />
            <span>Changement d&apos;opérateur</span>
          </button>
        </div>
      </div>

      {/* Grille des Machines (Cliquer sur un nom de machine affiche les boutons actions/déclarations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {machines.map((machine) => {
          const st =
            STATUS_CONFIG[machine.current_status] || STATUS_CONFIG.PAUSE;
          return (
            <motion.div
              key={machine.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => openMachineModal(machine)}
              className="bg-white rounded-3xl shadow-sm hover:shadow-ermeto border-2 border-slate-200/80 hover:border-[#00305B] transition cursor-pointer overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Barre supérieure de couleur statut */}
                <div className={`h-2.5 w-full ${st.bgClass}`} />

                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-3 py-1 rounded-lg bg-[#00305B] text-white text-xs font-extrabold tracking-wide">
                      {machine.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${st.bgClass} animate-pulse`} />
                      {st.label}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#00305B] group-hover:text-[#00A3E0] transition">
                    {machine.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    📍 {machine.workshop_sector}
                  </p>

                  {machine.current_reason && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                      Motif en cours : “{machine.current_reason}”
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-400 block">Opérateur sur poste :</span>
                  <span className="font-bold text-slate-800">
                    {machine.current_operator
                      ? `${machine.current_operator.first_name} ${machine.current_operator.last_name}`
                      : 'Non assigné'}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#00305B] group-hover:translate-x-1 transition">
                  <span>Déclarer</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MODALE D'ACTIONS / DÉCLARATIONS AU CLIC SUR UNE MACHINE */}
      <AnimatePresence>
        {selectedMachine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedMachine(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200"
            >
              {/* Header Machine */}
              <div className="bg-[#00305B] text-white p-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-white/15 text-sky-300 text-xs font-extrabold">
                      {selectedMachine.code}
                    </span>
                    <span className="text-xs text-slate-300">
                      {selectedMachine.workshop_sector}
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold mt-1">
                    {selectedMachine.name}
                  </h3>
                  <p className="text-xs text-sky-200 mt-1">
                    Opérateur déclarant :{' '}
                    <strong className="text-white">
                      {activeOperator.first_name} {activeOperator.last_name.toUpperCase()}
                    </strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Champ optionnel Ordre de Fabrication */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Référence OF / Lot (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={orderRefText}
                    onChange={(e) => setOrderRefText(e.target.value)}
                    placeholder="ex: OF-2026-8501"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-medium outline-none"
                  />
                </div>

                {/* Boutons principaux : Production / Pause / Arrêt */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Choisissez l&apos;action / déclaration à envoyer :
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* PRODUCTION */}
                    <button
                      disabled={submitting}
                      onClick={() => handleSendDeclaration('PRODUCTION')}
                      className="p-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-left shadow-lg shadow-emerald-600/20 transition flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <div className="text-lg leading-tight">Production</div>
                        <div className="text-xs font-normal text-emerald-100 mt-0.5">
                          Cycle d&apos;usinage actif
                        </div>
                      </div>
                    </button>

                    {/* PAUSE */}
                    <button
                      disabled={submitting}
                      onClick={() => handleSendDeclaration('PAUSE')}
                      className="p-5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-white font-extrabold text-left shadow-lg shadow-amber-500/20 transition flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <PauseCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg leading-tight">Pause</div>
                        <div className="text-xs font-normal text-amber-100 mt-0.5">
                          Pause équipe / repas
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* BOUTON ARRÊT -> OUVRE LES 4 SOUS-BOUTONS D'ARRÊT */}
                  <div className="mt-3.5">
                    <button
                      type="button"
                      onClick={() => setShowStopSubmenu(!showStopSubmenu)}
                      className={`w-full p-4 rounded-2xl font-extrabold text-left transition flex items-center justify-between border-2 ${
                        showStopSubmenu
                          ? 'bg-red-600 text-white border-red-600 shadow-lg'
                          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AlertOctagon className="w-6 h-6" />
                        <div>
                          <div className="text-base">Déclarer un Arrêt Machine</div>
                          <div
                            className={`text-xs font-normal ${
                              showStopSubmenu ? 'text-red-100' : 'text-red-600'
                            }`}
                          >
                            Changement d&apos;outil, Attentes, Panne, Autres arrêts (précisé en
                            texte)
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${
                          showStopSubmenu ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {showStopSubmenu && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden"
                        >
                          {/* 1. Changement d'outil */}
                          <button
                            disabled={submitting}
                            onClick={() => handleSendDeclaration('STOP_TOOL_CHANGE')}
                            className="p-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-left transition flex items-center gap-3 shadow-md"
                          >
                            <Wrench className="w-5 h-5 shrink-0" />
                            <div>
                              <div className="text-sm font-extrabold">
                                Changement d&apos;outil
                              </div>
                              <div className="text-[11px] text-indigo-100">
                                Réglage / plaquettes / outillage
                              </div>
                            </div>
                          </button>

                          {/* 2. Attentes */}
                          <button
                            disabled={submitting}
                            onClick={() => handleSendDeclaration('STOP_WAITING')}
                            className="p-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-left transition flex items-center gap-3 shadow-md"
                          >
                            <Clock className="w-5 h-5 shrink-0" />
                            <div>
                              <div className="text-sm font-extrabold">Attentes</div>
                              <div className="text-[11px] text-orange-100">
                                Matière, contrôle, programme
                              </div>
                            </div>
                          </button>

                          {/* 3. Panne */}
                          <button
                            disabled={submitting}
                            onClick={() => handleSendDeclaration('STOP_BREAKDOWN')}
                            className="p-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-left transition flex items-center gap-3 shadow-md"
                          >
                            <AlertOctagon className="w-5 h-5 shrink-0" />
                            <div>
                              <div className="text-sm font-extrabold">Panne</div>
                              <div className="text-[11px] text-red-100">
                                Arrêt maintenance / anomalie
                              </div>
                            </div>
                          </button>

                          {/* 4. Autres arrêt (précisé en texte) */}
                          <button
                            type="button"
                            onClick={() => setShowOtherReasonInput(true)}
                            className="p-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-left transition flex items-center gap-3 shadow-md"
                          >
                            <MessageSquarePlus className="w-5 h-5 shrink-0" />
                            <div>
                              <div className="text-sm font-extrabold">Autres arrêts</div>
                              <div className="text-[11px] text-slate-300">
                                Précisé en texte obligatoire
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Zone de saisie texte pour "Autres arrêt (précisé en texte)" */}
                    <AnimatePresence>
                      {showOtherReasonInput && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 p-4 rounded-2xl bg-slate-100 border border-slate-300 space-y-3"
                        >
                          <label className="block text-xs font-extrabold uppercase text-[#00305B]">
                            Précisez le motif de l&apos;arrêt en texte :
                          </label>
                          <textarea
                            rows={2}
                            value={otherReasonText}
                            onChange={(e) => setOtherReasonText(e.target.value)}
                            placeholder="Ex: Nettoyage 5S, réunion îlot, maintenance préventive..."
                            className="w-full p-3 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-medium outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowOtherReasonInput(false)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() =>
                                handleSendDeclaration('STOP_OTHER', otherReasonText)
                              }
                              className="px-5 py-2 rounded-xl bg-[#00305B] hover:bg-[#004B8D] text-white text-xs font-extrabold shadow"
                            >
                              Valider & Envoyer l&apos;Arrêt
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Bouton Changement d'opérateur rapide sur cette machine */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Un autre opérateur prend le relais sur cette machine ?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMachineForSwitch(selectedMachine.id);
                      setShowOperatorModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00305B]/10 hover:bg-[#00305B] text-[#00305B] hover:text-white text-xs font-extrabold transition"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Changement d&apos;opérateur</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE CHANGEMENT D'OPÉRATEUR (LOGGER CÔTÉ SERVEUR) */}
      <AnimatePresence>
        {showOperatorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOperatorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
            >
              <div className="bg-[#00305B] text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Changement d&apos;Opérateur
                    </h3>
                    <p className="text-xs text-sky-200">
                      Sélectionnez qui vous êtes (action journalisée côté serveur)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOperatorModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {operators.map((op) => {
                    const isCurrent = op.id === activeOperator.id;
                    return (
                      <button
                        key={op.id}
                        disabled={submitting}
                        onClick={() => handleOperatorSwitch(op)}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                          isCurrent
                            ? 'border-[#00305B] bg-[#00305B]/10'
                            : 'border-slate-200 hover:border-[#00305B] hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#00305B] text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {op.first_name[0]}
                          {op.last_name[0]}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-extrabold text-sm text-slate-900 truncate">
                            {op.first_name} {op.last_name.toUpperCase()}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {op.username} • {op.role}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
