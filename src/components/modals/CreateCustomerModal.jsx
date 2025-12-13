import React, { useState } from 'react';
import { UserPlus, X, Save, Check } from 'lucide-react';

const CreateCustomerModal = ({ onClose, createCustomer, showNotification }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        notes: ''
    });
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.name.trim()) {
            const newCustomer = await createCustomer({
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                notes: formData.notes
            });

            if (newCustomer) {
                setSuccessMessage(`Client "${formData.name}" ajouté avec succès !`);
                if (showNotification) showNotification('success', `Client "${formData.name}" ajouté`);

                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    notes: ''
                });

                setTimeout(() => setSuccessMessage(''), 3000);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-indigo-50 sticky top-0">
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                        <UserPlus size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                        <span className="truncate">Nouveau client</span>
                    </h3>
                    <button onClick={onClose} className="p-1.5 sm:p-1 hover:bg-indigo-100 rounded-lg text-slate-500 hover:text-slate-700 flex-shrink-0">
                        <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {successMessage && (
                        <div className="bg-emerald-50 text-emerald-700 p-2.5 sm:p-3 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <Check size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{successMessage}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Nom du client *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="Ex: Jean Dupont"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="+229 XX XX XX XX"
                        />
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="email@exemple.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base"
                            rows={2}
                            placeholder="Notes ou préférences..."
                        />
                    </div>

                    <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm sm:text-base font-medium"
                        >
                            Fermer
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base"
                        >
                            <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                            <span>Enregistrer</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCustomerModal;
