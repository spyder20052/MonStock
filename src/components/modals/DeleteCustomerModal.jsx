import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

const DeleteCustomerModal = ({ customer, onClose, deleteCustomer, onSuccess }) => {
    const handleDelete = async () => {
        await deleteCustomer(customer.id);
        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center bg-red-50">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-600" />
                        Confirmer la suppression
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-red-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <p className="text-center text-slate-700 mb-2">
                            Êtes-vous sûr de vouloir supprimer le client
                        </p>
                        <p className="text-center font-bold text-lg text-slate-900 mb-2">
                            {customer.name} ?
                        </p>
                        <p className="text-center text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                            Cette action est irréversible et supprimera tout l'historique de ce client.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                        >
                            Supprimer définitivement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteCustomerModal;
