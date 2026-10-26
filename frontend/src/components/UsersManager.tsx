import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Edit3,
  Power,
  Shield,
  Smartphone,
  KeyRound,
  CreditCard,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

interface UsersManagerProps {
  users: User[];
  currentUser: User;
  onUsersChanged: () => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({
  users,
  currentUser,
  onUsersChanged,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('1234');
  const [badgeCode, setBadgeCode] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setFirstName('');
    setLastName('');
    setPassword('ermeto2026');
    setPinCode('1234');
    setBadgeCode('');
    setRole('OPERATOR');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFirstName(u.first_name);
    setLastName(u.last_name);
    setPassword('');
    setPinCode(u.pin_code || '0000');
    setBadgeCode(u.badge_code || '');
    setRole(u.role);
    setIsActive(u.is_active);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          first_name: firstName,
          last_name: lastName,
          password: password.trim() || undefined,
          pin_code: pinCode,
          badge_code: badgeCode,
          role,
          is_active: isActive,
        });
      } else {
        await api.createUser({
          username,
          password,
          pin_code: pinCode,
          first_name: firstName,
          last_name: lastName,
          badge_code: badgeCode.trim() || undefined,
          role,
          is_active: isActive,
        });
      }
      setShowModal(false);
      onUsersChanged();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === currentUser.id) return;
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      onUsersChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Shield className="w-3 h-3" /> Administrateur
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <Shield className="w-3 h-3" /> Responsable Îlot
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Smartphone className="w-3 h-3" /> Opérateur Android
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête Gestion des Comptes Utilisateurs & Opérateurs Android */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00305B] text-white flex items-center justify-center shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A3E0]">
              Administration des Comptes Web & Android
            </span>
            <h2 className="text-xl font-extrabold text-[#00305B]">
              Gestion des Utilisateurs & Opérateurs ({users.length})
            </h2>
            <p className="text-xs text-slate-500">
              Créez ici les opérateurs de l&apos;application Android (avec Code PIN et Badge) ainsi
              que les superviseurs Web.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-xl bg-[#00305B] hover:bg-[#004B8D] text-white font-extrabold text-sm shadow-lg shadow-[#00305B]/20 transition flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          <span>Créer un Utilisateur / Opérateur Android</span>
        </button>
      </div>

      {/* Tableau des Utilisateurs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#00305B] text-white text-xs uppercase tracking-wider">
                <th className="py-4 px-5 font-bold">Nom & Prénom</th>
                <th className="py-4 px-4 font-bold">Identifiant</th>
                <th className="py-4 px-4 font-bold">Rôle / Accès</th>
                <th className="py-4 px-4 font-bold">Code PIN Android</th>
                <th className="py-4 px-4 font-bold">Code Badge NFC/QR</th>
                <th className="py-4 px-4 font-bold">Statut</th>
                <th className="py-4 px-5 font-bold text-right">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-slate-50 transition ${
                    !u.is_active ? 'opacity-50 bg-slate-50' : ''
                  }`}
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#00305B] text-white font-extrabold text-xs flex items-center justify-center">
                        {u.first_name[0]}
                        {u.last_name[0]}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">
                          {u.last_name.toUpperCase()} {u.first_name}
                        </div>
                        <div className="text-xs text-slate-400">ID #{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-[#00305B]">
                    {u.username}
                  </td>
                  <td className="py-4 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      {u.pin_code || '0000'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {u.badge_code ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#00305B] font-mono text-xs font-bold border border-sky-200">
                        <CreditCard className="w-3.5 h-3.5 text-[#00A3E0]" />
                        {u.badge_code}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        u.is_active ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {u.is_active ? '● Actif' : '○ Désactivé'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-[#00305B] text-slate-700 hover:text-white transition"
                        title="Modifier l'utilisateur"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-2 rounded-lg transition ${
                            u.is_active
                              ? 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white'
                              : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white'
                          }`}
                          title={u.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale Création / Modification Utilisateur */}
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
                    Administration des Comptes
                  </span>
                  <h3 className="text-xl font-extrabold mt-0.5">
                    {editingUser
                      ? `Modifier ${editingUser.first_name} ${editingUser.last_name}`
                      : 'Créer un Nouvel Utilisateur / Opérateur'}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="ex: Thomas"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Nom de Famille *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="ex: Bernard"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Identifiant Login *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="ex: t.bernard"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-mono font-bold outline-none disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Rôle Applicatif *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-bold outline-none"
                    >
                      <option value="OPERATOR">Opérateur Android / Atelier</option>
                      <option value="MANAGER">Responsable d&apos;Îlot (Web)</option>
                      <option value="ADMIN">Administrateur Complet</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      {editingUser ? 'Nouveau Mot de Passe (optionnel)' : 'Mot de Passe Web *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? 'Laisser vide pour conserver' : '••••••••'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Code PIN Application Android
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="ex: 1234"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Code Badge NFC / QR Code (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={badgeCode}
                    onChange={(e) => setBadgeCode(e.target.value.toUpperCase())}
                    placeholder="ex: BADGE-OP-108"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00305B] text-sm font-mono outline-none"
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
                        : editingUser
                        ? 'Enregistrer'
                        : 'Créer le Compte'}
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
