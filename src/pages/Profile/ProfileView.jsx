import React, { useState } from 'react';
import { Check, AlertTriangle, User, Mail, Loader, Save, Phone, Lock, Eye, EyeOff, Users } from 'lucide-react';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { writeBatch, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const ProfileView = ({
    user,
    products,
    sales,
    showNotification,
    customerManagementEnabled,
    setCustomerManagementEnabled,
    customers = [] // Add customers prop
}) => {
    const [profileData, setProfileData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
        whatsapp: '',
        browserNotifications: false
    });
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const handleResetData = async (type) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ces données ? Cette action est irréversible.')) return;

        setSaving(true);
        try {
            const batch = writeBatch(db);

            if (type === 'products' || type === 'all') {
                products.forEach(p => batch.delete(doc(db, 'users', user.uid, 'products', p.id)));
            }

            if (type === 'sales' || type === 'all') {
                sales.forEach(s => batch.delete(doc(db, 'users', user.uid, 'sales', s.id)));

                // Reset customer statistics when clearing sales
                customers.forEach(customer => {
                    batch.update(doc(db, 'users', user.uid, 'customers', customer.id), {
                        totalPurchases: 0,
                        totalSpent: 0,
                        totalItems: 0,
                        debt: 0,
                        lastPurchaseDate: null
                    });
                });
            }

            await batch.commit();
            setMessage({ type: 'success', text: 'Données supprimées avec succès' });
            showNotification('Données réinitialisées');
        } catch (error) {
            console.error("Error resetting data:", error);
            setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            if (profileData.displayName !== user.displayName) {
                await updateProfile(auth.currentUser, { displayName: profileData.displayName });
            }

            if (profileData.email !== user.email) {
                await updateEmail(auth.currentUser, profileData.email);
            }

            setMessage({ type: 'success', text: 'Profil mis à jour avec succès!' });
            showNotification('Profil mis à jour');
        } catch (error) {
            console.error('Update error:', error);
            if (error.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Reconnectez-vous pour modifier l\'email' });
            } else {
                setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
            return;
        }

        if (passwords.new.length < 6) {
            setMessage({ type: 'error', text: 'Le mot de passe doit avoir au moins 6 caractères' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const credential = EmailAuthProvider.credential(user.email, passwords.current);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, passwords.new);

            setPasswords({ current: '', new: '', confirm: '' });
            setMessage({ type: 'success', text: 'Mot de passe changé avec succès!' });
            showNotification('Mot de passe modifié');
        } catch (error) {
            console.error('Password change error:', error);
            if (error.code === 'auth/wrong-password') {
                setMessage({ type: 'error', text: 'Mot de passe actuel incorrect' });
            } else {
                setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-bold text-indigo-600">
                                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-slate-800 truncate">{user?.displayName || 'Utilisateur'}</h2>
                        <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                        <p className="text-xs text-slate-400 mt-1">Membre depuis {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'récemment'}</p>
                    </div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Profile Info Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={18} className="text-slate-400" />
                    Informations personnelles
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Nom complet</label>
                        <input
                            type="text"
                            value={profileData.displayName}
                            onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                            placeholder="Votre nom"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Adresse email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                placeholder="votre@email.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                        Enregistrer les modifications
                    </button>
                </form>
            </div>

            {/* WhatsApp Notifications */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Phone size={18} className="text-emerald-500" />
                    Alertes WhatsApp
                </h3>

                <p className="text-sm text-slate-500 mb-4">
                    Recevez une alerte quotidienne sur WhatsApp lorsqu'un produit est en stock bas.
                    Les alertes sont envoyées une fois par jour jusqu'à résolution.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Numéro WhatsApp (Bénin)</label>
                        <div className="flex gap-2">
                            <div className="flex items-center px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
                                +229
                            </div>
                            <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="tel"
                                    value={profileData.whatsapp || ''}
                                    onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value.replace(/\D/g, '') })}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                                    placeholder="97 00 00 00"
                                    maxLength={8}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">8 chiffres sans l'indicatif</p>
                    </div>

                    {/* Browser Notifications */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium text-sm text-slate-700">Notifications navigateur</p>
                            <p className="text-xs text-slate-500">Alertes automatiques sur cet appareil</p>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!profileData.browserNotifications) {
                                    const permission = await Notification.requestPermission();
                                    if (permission === 'granted') {
                                        setProfileData({ ...profileData, browserNotifications: true });
                                        new Notification('MonStock', { body: 'Notifications activées !' });
                                    }
                                } else {
                                    setProfileData({ ...profileData, browserNotifications: false });
                                }
                            }}
                            className={`relative w-12 h-6 rounded-full transition-colors ${profileData.browserNotifications ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileData.browserNotifications ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    {profileData.browserNotifications && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-sm text-emerald-700 flex items-center gap-2">
                                <Check size={16} />
                                Vous recevrez une alerte quand un produit sera en stock bas
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Customer Management Toggle */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users size={18} className="text-indigo-500" />
                    Gestion des clients
                </h3>

                <p className="text-sm text-slate-500 mb-4">
                    Activez cette fonctionnalité pour suivre vos clients, leurs achats, et leurs statistiques en détail.
                </p>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                        <p className="font-medium text-sm text-slate-700">Activer la gestion des clients</p>
                        <p className="text-xs text-slate-500">Affiche l'onglet Clients et le sélecteur dans la caisse</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const newValue = !customerManagementEnabled;
                            setCustomerManagementEnabled(newValue);
                            localStorage.setItem(`customerMgmt_${user?.uid}`, String(newValue));
                            showNotification(newValue ? 'Gestion clients activée' : 'Gestion clients désactivée');
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${customerManagementEnabled ? 'bg-indigo-500' : 'bg-slate-300'
                            }`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${customerManagementEnabled ? 'left-7' : 'left-1'
                            }`} />
                    </button>
                </div>

                {customerManagementEnabled && (
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 mt-3">
                        <p className="text-sm text-indigo-700 flex items-center gap-2">
                            <Check size={16} />
                            L'onglet Clients est maintenant accessible et vous pouvez associer des clients à vos ventes
                        </p>
                    </div>
                )}
            </div>

            {/* Password Change Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-slate-400" />
                    Changer le mot de passe
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Mot de passe actuel</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Nouveau mot de passe</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmer le nouveau mot de passe</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving || !passwords.current || !passwords.new}
                        className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader className="animate-spin" size={16} /> : <Lock size={16} />}
                        Changer le mot de passe
                    </button>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Zone de Danger
                </h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                        <div>
                            <p className="font-medium text-sm text-slate-700">Réinitialiser les produits</p>
                            <p className="text-xs text-slate-500">Supprime tous les produits de l'inventaire</p>
                        </div>
                        <button
                            onClick={() => handleResetData('products')}
                            disabled={saving}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                        >
                            Supprimer
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                        <div>
                            <p className="font-medium text-sm text-slate-700">Réinitialiser les ventes</p>
                            <p className="text-xs text-slate-500">Supprime tout l'historique des ventes</p>
                        </div>
                        <button
                            onClick={() => handleResetData('sales')}
                            disabled={saving}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                        >
                            Supprimer
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                        <div>
                            <p className="font-medium text-sm text-slate-700">Tout supprimer</p>
                            <p className="text-xs text-slate-500">Produits, ventes et historique (Irreversible)</p>
                        </div>
                        <button
                            onClick={() => handleResetData('all')}
                            disabled={saving}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                            Tout Effacer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
