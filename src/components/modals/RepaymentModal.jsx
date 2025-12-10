import React, { useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatMoney } from '../../utils/helpers';

const RepaymentModal = ({ customer, onClose, user, showNotification, sale = null }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');

    // Calculate max repayable amount
    const maxRepayAmount = sale
        ? (sale.total - (sale.amountPaid || 0))
        : (customer.debt || 0);

    const handleRepayment = async () => {
        const repayAmount = parseFloat(amount);
        if (!repayAmount || repayAmount <= 0 || repayAmount > maxRepayAmount) return;

        try {
            const batch = writeBatch(db);

            // 1. Update customer debt
            const customerRef = doc(db, 'users', user.uid, 'customers', customer.id);
            batch.update(customerRef, {
                debt: increment(-repayAmount)
            });

            // 2. Update sale with payment
            if (sale) {
                const saleRef = doc(db, 'users', user.uid, 'sales', sale.id);

                // Add payment to payments array
                const payment = {
                    date: new Date().toISOString(),
                    amount: repayAmount,
                    method: method
                };

                // Update sale with new payment and increment amountPaid
                const currentPayments = sale.payments || [];
                batch.update(saleRef, {
                    amountPaid: increment(repayAmount),
                    payments: [...currentPayments, payment],
                    lastPaymentDate: new Date().toISOString()
                });
            }

            await batch.commit();

            showNotification("Remboursement enregistré !", "success");
            onClose();
        } catch (error) {
            console.error("Repayment error:", error);
            showNotification("Erreur lors du remboursement", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center bg-emerald-50">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-emerald-800">
                        <DollarSign size={20} className="text-emerald-600" />
                        {sale ? 'Rembourser une vente' : 'Rembourser une dette'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-emerald-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex justify-between items-center">
                        <span className="text-amber-800 font-medium">
                            {sale ? 'Reste à payer (Vente)' : 'Dette totale'}
                        </span>
                        <span className="text-xl font-bold text-amber-700">{formatMoney(maxRepayAmount)}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Montant du remboursement</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={maxRepayAmount}
                                className="w-full pl-4 pr-12 py-3 text-lg font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="0"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">FCFA</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setMethod('cash')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${method === 'cash' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            Espèces
                        </button>
                        <button
                            onClick={() => setMethod('mobile_money')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${method === 'mobile_money' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            Mobile Money
                        </button>
                    </div>

                    <button
                        onClick={handleRepayment}
                        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxRepayAmount}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                    >
                        Confirmer le remboursement
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RepaymentModal;
