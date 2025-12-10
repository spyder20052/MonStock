import React, { useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatMoney } from '../../utils/helpers';

const ChangeRepaymentModal = ({ customer, onClose, user, showNotification }) => {
    const [amount, setAmount] = useState('');

    const maxAmount = customer.changeOwed || 0;

    const handleReturn = async () => {
        const returnAmount = parseFloat(amount);
        if (!returnAmount || returnAmount <= 0 || returnAmount > maxAmount) return;

        try {
            const customerRef = doc(db, 'users', user.uid, 'customers', customer.id);

            await updateDoc(customerRef, {
                changeOwed: increment(-returnAmount),
                changeTransactions: arrayUnion({
                    date: new Date().toISOString(),
                    amount: returnAmount,
                    type: 'returned',
                    description: `Monnaie rendue`
                })
            });

            showNotification("Monnaie rendue !", "success");
            onClose();
        } catch (error) {
            console.error("Change return error:", error);
            showNotification("Erreur lors du retour de monnaie", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center bg-blue-50">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-blue-800">
                        <Wallet size={20} className="text-blue-600" />
                        Rendre la monnaie
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-blue-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex justify-between items-center">
                        <span className="text-amber-800 font-medium">
                            Monnaie à rendre
                        </span>
                        <span className="text-xl font-bold text-amber-700">{formatMoney(maxAmount)}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Montant à rendre</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={maxAmount}
                                className="w-full pl-4 pr-12 py-3 text-lg font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="0"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">FCFA</span>
                        </div>
                    </div>

                    <button
                        onClick={handleReturn}
                        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                    >
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeRepaymentModal;
