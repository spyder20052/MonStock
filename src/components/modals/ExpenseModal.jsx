import React, { useState, useEffect } from 'react';
import { X, Save, Loader, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAction, LOG_ACTIONS } from '../../utils/logger';

const EXPENSE_CATEGORIES = [
    'Loyer',
    'Électricité/Eau',
    'Salaires',
    'Matériel',
    'Approvisionnement (Transport)',
    'Entretien/Réparations',
    'Marketing/Pub',
    'Internet/Téléphone',
    'Taxes/Impôts',
    'Autre'
];

const ExpenseModal = ({ isOpen, onClose, expenseToEdit, workspaceId, showNotification, user, userProfile }) => {
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Autre',
        date: new Date().toISOString().split('T')[0]
    });
    const [saving, setSaving] = useState(false);

    // Reset form when modal opens or when editing expense changes
    useEffect(() => {
        if (isOpen) {
            if (expenseToEdit) {
                setFormData({
                    description: expenseToEdit.description || '',
                    amount: expenseToEdit.amount || '',
                    category: expenseToEdit.category || 'Autre',
                    date: expenseToEdit.date ? expenseToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]
                });
            } else {
                // Reset form for new expense
                setFormData({
                    description: '',
                    amount: '',
                    category: 'Autre',
                    date: new Date().toISOString().split('T')[0]
                });
            }
        }
    }, [isOpen, expenseToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        console.log("Submitting expense with data:", formData);
        console.log("Workspace ID:", workspaceId);

        try {
            const data = {
                description: formData.description,
                amount: Number(formData.amount),
                category: formData.category,
                date: new Date(formData.date).toISOString(),
                updatedAt: serverTimestamp()
            };

            console.log("Prepared data for Firestore:", data);

            if (expenseToEdit) {
                await updateDoc(doc(db, 'users', workspaceId, 'expenses', expenseToEdit.id), data);
                // Log the update action
                if (user && userProfile) {
                    await logAction(db, workspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.EXPENSE_UPDATED, `Dépense modifiée: ${data.description} (${data.amount} FCFA)`, { expenseId: expenseToEdit.id });
                }
                showNotification('Dépense modifiée');
            } else {
                data.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, 'users', workspaceId, 'expenses'), data);
                console.log("Successfully created expense with ID:", docRef.id);
                // Log the creation action
                if (user && userProfile) {
                    await logAction(db, workspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.EXPENSE_CREATED, `Dépense créée: ${data.description} (${data.amount} FCFA)`, { expenseId: docRef.id });
                }
                showNotification('Dépense ajoutée');
            }
            onClose();
        } catch (error) {
            console.error("Error saving expense:", error);
            showNotification("Erreur lors de l'enregistrement", 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">
                        {expenseToEdit ? 'Modifier la dépense' : 'Nouvelle Dépense'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Montant (FCFA) *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="number"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 text-lg font-bold text-slate-800 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors"
                                placeholder="0"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Description *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm min-h-[80px]"
                                placeholder="Ex: Loyer magasin Janvier"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Catégorie</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm appearance-none bg-white"
                                >
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                            {expenseToEdit ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseModal;
