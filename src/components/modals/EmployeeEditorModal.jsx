import React, { useState } from 'react';
import { X, Save, Shield, Check, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { PERMISSIONS, ROLES, getRoleLabel, PERMISSION_METADATA } from '../../utils/permissions';

const EmployeeEditorModal = ({ member, onClose, workspaceId, showNotification, onUpdate }) => {
    const [role, setRole] = useState(member?.role || ROLES.MANAGER_STOCK);
    const [customPermissions, setCustomPermissions] = useState(member?.customPermissions || {});
    const [email, setEmail] = useState(member?.email || '');
    const [saving, setSaving] = useState(false);

    // Group permissions for better UI
    const permissionGroups = {
        'Vue Globale': [PERMISSIONS.VIEW_DASHBOARD],
        'Finance': [PERMISSIONS.VIEW_FINANCIAL_ANALYTICS, PERMISSIONS.MANAGE_EXPENSES, PERMISSIONS.VIEW_EXPENSES],
        'Ventes & Caisse': [PERMISSIONS.ACCESS_POS, PERMISSIONS.MANAGE_SALES, PERMISSIONS.VIEW_SALES_HISTORY],
        'Stock': [PERMISSIONS.VIEW_STOCK, PERMISSIONS.MANAGE_STOCK, PERMISSIONS.MANAGE_INVENTORY],
        'Clients': [PERMISSIONS.VIEW_CUSTOMERS, PERMISSIONS.MANAGE_CUSTOMERS, PERMISSIONS.MANAGE_CUSTOMER_DEBTS],
        'Admin': [PERMISSIONS.MANAGE_TEAM, PERMISSIONS.MANAGE_SETTINGS]
    };

    const handlePermissionToggle = (perm) => {
        setCustomPermissions(prev => {
            const current = prev[perm];
            if (current === undefined) return { ...prev, [perm]: true }; // Grant
            if (current === true) return { ...prev, [perm]: false };     // Deny
            // If false, remove to fallback to role default? Or keep explicit false?
            // Let's cycle: undefined (default) -> true (force grant) -> false (force deny) -> undefined
            const newPerms = { ...prev };
            delete newPerms[perm];
            return newPerms;
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // If editing existing member
            if (member?.id) {
                const userRef = doc(db, 'users_profiles', member.id);
                await updateDoc(userRef, {
                    role,
                    customPermissions
                });
                showNotification("Membre mis à jour");
            } else {
                // Creating new "Invite"
                if (!email) {
                    showNotification("error", "Veuillez entrer une adresse email");
                    setSaving(false);
                    return;
                }
                // Save to 'workspace_invites' collection with email as ID for easy lookup
                const inviteRef = doc(db, 'workspace_invites', email.toLowerCase().trim());
                await setDoc(inviteRef, {
                    email: email.toLowerCase().trim(),
                    role,
                    ownerId: workspaceId,
                    customPermissions,
                    createdAt: serverTimestamp(),
                    status: 'pending'
                });
                showNotification("Invitation envoyée (enregistrée)");
            }
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error("Error saving member:", error);
            showNotification('error', "Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-indigo-50 rounded-t-xl">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-900">
                        <Shield size={20} className="text-indigo-600" />
                        {member?.id ? `Gérer : ${member.email}` : 'Inviter un membre'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-lg transition-colors">
                        <X size={20} className="text-indigo-600" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="editor-form" onSubmit={handleSave} className="space-y-6">

                        {/* Email Input for New Members */}
                        {!member?.id && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email du collaborateur</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ex: abdou@garage.com"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Une fois invité, cette personne devra se connecter avec cet email pour rejoindre votre équipe.
                                </p>
                            </div>
                        )}

                        {/* Role Selector */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Rôle Principal</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.values(ROLES).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${role === r
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-100 hover:border-indigo-200 text-slate-600'
                                            }`}
                                    >
                                        <div className="font-bold text-sm flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${role === r ? 'border-indigo-600' : 'border-slate-300'
                                                }`}>
                                                {role === r && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                            </div>
                                            {getRoleLabel(r)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                Permissions avancées (Surcharges)
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">
                                Vous pouvez accorder (+) ou retirer (-) des droits spécifiques indépendamment du rôle choisi.
                            </p>

                            <div className="space-y-6">
                                {Object.entries(permissionGroups).map(([group, perms]) => (
                                    <div key={group}>
                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{group}</h5>
                                        <div className="space-y-2">
                                            {perms.map(perm => {
                                                const status = customPermissions[perm]; // true, false, or undefined
                                                const metadata = PERMISSION_METADATA[perm] || { label: perm, description: '' };

                                                return (
                                                    <div key={perm} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group relative">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-slate-700">{metadata.label}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{metadata.description}</p>
                                                        </div>

                                                        <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomPermissions(p => ({ ...p, [perm]: false }))}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${status === false
                                                                    ? 'bg-red-100 text-red-700 shadow-sm'
                                                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                                title="Refuser explicitement"
                                                            >
                                                                Non
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const np = { ...customPermissions };
                                                                    delete np[perm];
                                                                    setCustomPermissions(np);
                                                                }}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${status === undefined
                                                                    ? 'bg-slate-100 text-slate-800 shadow-sm'
                                                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                                title="Utiliser la permission par défaut du rôle"
                                                            >
                                                                Auto
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomPermissions(p => ({ ...p, [perm]: true }))}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${status === true
                                                                    ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                                                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                                title="Accorder explicitement"
                                                            >
                                                                Oui
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="editor-form"
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeEditorModal;
