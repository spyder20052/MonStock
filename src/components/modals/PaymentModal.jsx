import React, { useState, useMemo } from 'react';
import { DollarSign, Phone, Clock, AlertTriangle, Check } from 'lucide-react';
import { formatMoney } from '../../utils/helpers';

const PaymentModal = ({ total, onClose, onConfirm, selectedCustomer }) => {
    const [method, setMethod] = useState('cash'); // cash, mobile_money, credit
    const [received, setReceived] = useState('');
    const [creditPaymentMethod, setCreditPaymentMethod] = useState('cash'); // For credit down payments
    const [holdChange, setHoldChange] = useState(false); // Don't give change immediately

    // Logic for change and debt
    const receivedAmount = parseFloat(received) || 0;
    const change = method === 'cash' && receivedAmount > total ? receivedAmount - total : 0;
    const debt = method === 'credit' && receivedAmount < total ? total - receivedAmount : 0;

    // Validation
    const isValid = useMemo(() => {
        if (method === 'mobile_money') return true;
        if (method === 'cash') {
            // Must receive enough money
            if (receivedAmount < total) return false;
            // If holding change, must have a customer selected
            if (holdChange && !selectedCustomer) return false;
            return true;
        }
        if (method === 'credit') {
            // Must have a customer selected for credit
            if (!selectedCustomer) return false;
            // Amount paid must be less than total (otherwise it's just a cash sale)
            return receivedAmount < total;
        }
        return false;
    }, [method, receivedAmount, total, selectedCustomer, holdChange]);

    const handleConfirm = () => {
        if (!isValid) return;
        onConfirm({
            method: method === 'credit' ? creditPaymentMethod : method,
            received: method === 'mobile_money' ? total : receivedAmount,
            change,
            isCredit: method === 'credit',
            creditAmount: debt,
            holdChange: holdChange && change > 0 && selectedCustomer  // Only hold if customer selected
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 p-6 text-white text-center">
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total à payer</p>
                    <h2 className="text-4xl font-bold">{formatMoney(total)}</h2>
                    {selectedCustomer && (
                        <div className="mt-2 text-xs bg-slate-800 inline-block px-2 py-1 rounded text-slate-300">
                            Client: {selectedCustomer.name}
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Payment Method Selector */}
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setMethod('cash')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${method === 'cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                }`}
                        >
                            <DollarSign size={24} />
                            <span className="text-xs font-bold">Espèces</span>
                        </button>
                        <button
                            onClick={() => setMethod('mobile_money')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${method === 'mobile_money' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                }`}
                        >
                            <Phone size={24} />
                            <span className="text-xs font-bold">Mobile Money</span>
                        </button>
                        <button
                            onClick={() => setMethod('credit')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${method === 'credit' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                }`}
                        >
                            <Clock size={24} />
                            <span className="text-xs font-bold">Crédit / Dette</span>
                        </button>
                    </div>

                    {/* Amount Input (Cash & Credit) */}
                    {(method === 'cash' || method === 'credit') && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {method === 'credit' ? 'Montant versé (Acompte)' : 'Montant reçu'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={received}
                                        onChange={(e) => setReceived(e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 text-lg font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        placeholder="0"
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">FCFA</span>
                                </div>
                            </div>

                            {/* Info Display */}
                            {method === 'cash' && change > 0 && (
                                <div className="space-y-3">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                                        <span className="text-emerald-700 font-medium">Monnaie à rendre</span>
                                        <span className="text-2xl font-bold text-emerald-700">{formatMoney(change)}</span>
                                    </div>

                                    {/* Option to hold change - ALWAYS visible when there's change */}
                                    <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={holdChange}
                                            onChange={(e) => setHoldChange(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-blue-700">Garder la monnaie</p>
                                            <p className="text-xs text-blue-600">Le client récupèrera sa monnaie plus tard</p>
                                        </div>
                                    </label>

                                    {/* Warning if no customer selected but holding change */}
                                    {holdChange && !selectedCustomer && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-bottom-2">
                                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                            <span>Veuillez sélectionner un client pour garder la monnaie.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {method === 'credit' && (
                                <div className="space-y-3">
                                    {!selectedCustomer ? (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3 text-red-700 text-sm">
                                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                            <span>Veuillez sélectionner un client pour faire une vente à crédit.</span>
                                        </div>
                                    ) : (
                                        <>
                                            {receivedAmount > 0 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                                        Mode de paiement de l'acompte
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCreditPaymentMethod('cash')}
                                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${creditPaymentMethod === 'cash'
                                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            Espèces
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCreditPaymentMethod('mobile_money')}
                                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${creditPaymentMethod === 'mobile_money'
                                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            Mobile Money
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex justify-between items-center">
                                                <span className="text-amber-700 font-medium">Reste à payer (Dette)</span>
                                                <span className="text-2xl font-bold text-amber-700">{formatMoney(debt)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!isValid}
                            className={`px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isValid ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5' : 'bg-slate-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            <Check size={20} />
                            Confirmer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
