import React, { useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatMoney } from '../../utils/helpers';
import { logAction, LOG_ACTIONS } from '../../utils/logger';

const RepaymentModal = ({ customer, onClose, user, showNotification, sale = null, workspaceId, userProfile }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');

    // Calculate max repayable amount
    const maxRepayAmount = sale
        ? Math.max(0, (sale.total - (sale.amountPaid || 0)))
        : Math.max(0, (customer.debt || 0));

    const handleRepayment = async () => {
        const repayAmount = parseFloat(amount);
        if (!repayAmount || repayAmount <= 0 || repayAmount > maxRepayAmount) return;

        try {
            // Fetch fresh data from Firestore to prevent double repayment
            const customerRef = doc(db, 'users', workspaceId, 'customers', customer.id);
            const freshCustomerSnap = await getDoc(customerRef);
            if (!freshCustomerSnap.exists()) {
                showNotification("Client introuvable", "error");
                return;
            }
            const freshCustomer = freshCustomerSnap.data();
            const currentDebt = freshCustomer.debt || 0;

            // If the debt is already 0 or negative, block repayment
            if (currentDebt <= 0) {
                showNotification("Ce client n'a aucune dette à rembourser", "error");
                onClose();
                return;
            }

            if (sale) {
                // Fetch fresh sale data to check if it's already fully paid
                const saleRef = doc(db, 'users', workspaceId, 'sales', sale.id);
                const freshSaleSnap = await getDoc(saleRef);
                if (!freshSaleSnap.exists()) {
                    showNotification("Vente introuvable", "error");
                    return;
                }
                const freshSale = freshSaleSnap.data();
                const remainingOnSale = freshSale.total - (freshSale.amountPaid || 0);

                // If the sale is already fully paid, block repayment
                if (remainingOnSale <= 0) {
                    showNotification("Cette vente est déjà entièrement payée", "error");
                    onClose();
                    return;
                }

                // Clamp repayment to not exceed what's actually remaining on the sale
                const actualRepayAmount = Math.min(repayAmount, remainingOnSale);
                // Also clamp to not make customer debt go below 0
                const debtDecrement = Math.min(actualRepayAmount, currentDebt);

                const batch = writeBatch(db);

                // 1. Update customer debt (clamped)
                batch.update(customerRef, {
                    debt: increment(-debtDecrement)
                });

                // 2. Update sale with payment
                const payment = {
                    date: new Date().toISOString(),
                    amount: actualRepayAmount,
                    method: method
                };

                const currentPayments = freshSale.payments || [];
                batch.update(saleRef, {
                    amountPaid: increment(actualRepayAmount),
                    payments: [...currentPayments, payment],
                    lastPaymentDate: new Date().toISOString()
                });

                await batch.commit();

                // Log the repayment action
                if (user && userProfile) {
                    await logAction(
                        db,
                        workspaceId,
                        { uid: user.uid, ...userProfile },
                        LOG_ACTIONS.DEBT_REPAID,
                        `Remboursement de ${formatMoney(actualRepayAmount)} par ${customer.name} (Vente #${sale.id.slice(-6)})`,
                        { customerId: customer.id, amount: actualRepayAmount, saleId: sale.id }
                    );
                }
            } else {
                // General debt repayment (no specific sale)
                // Clamp to not make customer debt go below 0
                const actualRepayAmount = Math.min(repayAmount, currentDebt);

                const batch = writeBatch(db);
                batch.update(customerRef, {
                    debt: increment(-actualRepayAmount)
                });
                await batch.commit();

                // Log the repayment action
                if (user && userProfile) {
                    await logAction(
                        db,
                        workspaceId,
                        { uid: user.uid, ...userProfile },
                        LOG_ACTIONS.DEBT_REPAID,
                        `Remboursement de ${formatMoney(actualRepayAmount)} par ${customer.name}`,
                        { customerId: customer.id, amount: actualRepayAmount }
                    );
                }
            }

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
