import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Plus,
  Edit3,
  Power,
  CheckCircle2,
  X,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { api } from '../services/api';
import { Machine, STATUS_CONFIG } from '../types';

interface MachinesManagerProps {
  machines: Machine[];
  onMachinesChanged: () => void;
}

export const MachinesManager: React.FC<MachinesManagerProps> = ({
  machines,
  onMachinesChanged,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [workshopSector, setWorkshopSector] = useState('Îlot Tournage Aéronautique');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingMachine(null);
    setCode('');
    setName('');
    setWorkshopSector('Îlot Tournage Aéronautique');
    setDescription('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (m: Machine) => {
    setEditingMachine(m);
    setCode(m.code);
    setName(m.name);
    setWorkshopSector(m.workshop_sector);
    setDescription(m.description || '');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (editingMachine) {
        await api.updateMachine(editingMachine.id, {
          code,
          name,
          workshop_sector: workshopSector,
          description,
        });
      } else {
        await api.createMachine({
          code,
          name,
          workshop_sector: workshopSector,
          description,
        });
      }
      setShowModal(false);
      onMachinesChanged();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (m: Machine) => {
    try {
      await api.updateMachine(m.id, { is_active: !m.is_active });
      onMachinesChanged();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête Gestion Machines */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00305B] text-white flex items-center justify-center shadow-md">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A3E0]">
              Configuration du Parc Industriel
            </span>
            <h2 className="text-xl font-extrabold text-[#00305B]">
              Gestion & Création des Machines ({machines.length})
            </h2>
            <p className="text-xs text-slate-500">
              Toute nouvelle machine créée ici est immédiatement visible sur l&apos;application
              Android et dans le tableau hebdomadaire.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-xl bg-[#00305B] hover:bg-[#004B8D] text-white font-extrabold text-sm shadow-lg shadow-[#00305B]/20 transition flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Créer une Nouvelle Machine</span>
        </button>
      </div>

      {/* Grille des machines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {machines.map((m) => {
          const st = STATUS_CONFIG[m.current_status] || STATUS_CONFIG.PAUSE;
          return (
            <motion.div
              key={m.id}
              layout
              className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between transition ${
                m.is_active
                  ? 'border-slate-200/80 hover:border-[#00305B]/40'
                  : 'border-slate-200 bg-slate-100 opacity-65'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-lg bg-[#00305B] text-white text-xs font-extrabold">
                    {m.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${st.badgeClass}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${st.bgClass}`} />
                    {st.shortLabel}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900">{m.name}</h3>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00305B] mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#00A3E0]" />
                  <span>{m.workshop_sector}</span>
                </div>

                {m.description && (
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    m.is_active ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {m.is_active ? '● Active sur Android' : '○ Archivée / Inactive'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(m)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-[#00305B] text-slate-700 hover:text-white transition"
                    title="Modifier la machine"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(m)}
                    className={`p-2 rounded-lg transition ${
                      m.is_active
                        ? 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white'
                        : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white'
                    }`}
                    title={m.is_active ? 'Désactiver' : 'Réactiver'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modale Création / Édition Machine */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
            >
              <div className="bg-[#00305B] text-white p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Parc Machines Senior Aerospace Ermeto
                  </span>
                  <h3 className="text-xl font-extrabold mt-0.5">
                    {editingMachine
                      ? `Modifier ${editingMachine.code}`
                      : 'Ajouter une Nouvelle Machine'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Code Machine Unique *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ex: CNC-MAZAK-07"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] font-bold text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Nom complet de la Machine *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Tour CNC Mazak Quick Turn 250"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] font-medium text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Îlot / Secteur d&apos;Atelier *
                  </label>
                  <input
                    type="text"
                    required
                    value={workshopSector}
                    onChange={(e) => setWorkshopSector(e.target.value)}
                    placeholder="ex: Îlot Tournage Aéronautique"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] font-medium text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Description / Spécificités techniques
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Usinage raccords haute pression, outillage spécifique..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] font-medium text-sm outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-[#00305B] hover:bg-[#004B8D] text-white text-xs font-extrabold shadow-lg transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {loading
                        ? 'Enregistrement...'
                        : editingMachine
                        ? 'Enregistrer les modifications'
                        : 'Créer la Machine'}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
