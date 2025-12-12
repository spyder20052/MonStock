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
                // Show success feedback
                setSuccessMessage(`Client "${formData.name}" ajouté avec succès !`);
                if (showNotification) showNotification('success', `Client "${formData.name}" ajouté`);

                // Clear form for next entry
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    notes: ''
                });

                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <UserPlus size={20} className="text-indigo-600" />
                        Nouveau client
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-lg text-slate-500 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {successMessage && (
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <Check size={16} />
                            {successMessage}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom du client *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Ex: Jean Dupont"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="+229 XX XX XX XX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="email@exemple.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Notes ou préférences..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Fermer
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <Save size={18} />
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCustomerModal;
