import React, { useState } from 'react';
import { Mail, Lock, User, Loader, Sparkles } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthPage = ({ auth, db }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const getErrorMessage = (errorCode) => {
        const messages = {
            'auth/email-already-in-use': 'Cet email est déjà utilisé',
            'auth/invalid-email': 'Email invalide',
            'auth/user-not-found': 'Utilisateur non trouvé',
            'auth/wrong-password': 'Mot de passe incorrect',
            'auth/weak-password': 'Mot de passe trop court (min 6 caractères)',
            'auth/invalid-credential': 'Email ou mot de passe incorrect',
            'auth/popup-closed-by-user': 'Connexion annulée',
            'auth/configuration-not-found': 'Activez cette méthode dans Firebase Console'
        };
        return messages[errorCode] || 'Une erreur est survenue';
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
            } else {
                if (!formData.name) {
                    setError('Le nom est requis');
                    setLoading(false);
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    formData.email,
                    formData.password
                );

                await updateProfile(userCredential.user, {
                    displayName: formData.name
                });

                await setDoc(doc(db, 'users', userCredential.user.uid, 'profile', 'info'), {
                    name: formData.name,
                    email: formData.email,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError('');

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            await setDoc(doc(db, 'users', result.user.uid, 'profile', 'info'), {
                name: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                createdAt: serverTimestamp()
            }, { merge: true });

        } catch (err) {
            console.error('Google auth error:', err);
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full"></div>
                <div className="absolute bottom-10 right-10 w-48 h-48 border-4 border-white rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-24 h-24 border-4 border-white rounded-full"></div>
            </div>

            <div className="w-full max-w-sm relative z-10">
                {/* Logo & Title - Compact */}
                <div className="text-center mb-4">
                    <div className="w-14 h-14 mx-auto mb-3 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">StockPro</h1>
                    <p className="text-white/70 text-sm">Gestion de stock intelligente</p>
                </div>

                {/* Auth Card - Compact */}
                <div className="bg-white rounded-2xl shadow-2xl p-5">
                    {/* Toggle */}
                    <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => { setIsLogin(true); setError(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-white text-indigo-600 shadow' : 'text-slate-600'
                                }`}
                        >
                            Connexion
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow' : 'text-slate-600'
                                }`}
                        >
                            Inscription
                        </button>
                    </div>

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50 mb-4"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loading ? 'Chargement...' : 'Continuer avec Google'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-xs text-slate-400">ou</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-3">
                        {!isLogin && (
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Nom complet"
                                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email"
                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Mot de passe"
                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader className="animate-spin" size={16} />}
                            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-white/60 mt-3">
                    ✨ Conditions d'utilisation
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
