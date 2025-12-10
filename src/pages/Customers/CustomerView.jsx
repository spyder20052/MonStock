import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Edit3, Trash2, AlertTriangle, DollarSign, ChevronLeft, FileText, RefreshCw, Clock, Printer, Phone, Wallet } from 'lucide-react';
import { formatMoney } from '../../utils/helpers';
import EditCustomerModal from '../../components/modals/EditCustomerModal';
import DeleteCustomerModal from '../../components/modals/DeleteCustomerModal';
import RepaymentModal from '../../components/modals/RepaymentModal';
import ChangeRepaymentModal from '../../components/modals/ChangeRepaymentModal';

const CustomerView = ({
    customers,
    sales,
    updateCustomer,
    deleteCustomer,
    setShowCustomerModal,
    selectedCustomerDetail,
    setSelectedCustomerDetail,
    setRepaymentCustomer,
    setViewingReceipt,
    user,
    showNotification,
    setRepaymentSale,
    setReturnChangeCustomer
}) => {
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recent'); // recent, spent, purchases
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [deletingCustomer, setDeletingCustomer] = useState(null);

    const filteredCustomers = useMemo(() => {
        let filtered = customers.filter(c =>
            c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
            (c.phone && c.phone.includes(customerSearchTerm)) ||
            (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
        );

        // Sort
        switch (sortBy) {
            case 'spent':
                filtered.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
                break;
            case 'purchases':
                filtered.sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0));
                break;
            case 'recent':
            default:
                filtered.sort((a, b) => {
                    const dateA = a.lastPurchaseDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.lastPurchaseDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });
        }

        return filtered;
    }, [customers, customerSearchTerm, sortBy]);

    const customerStats = useMemo(() => {
        return {
            total: customers.length,
            totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
            totalDebt: customers.reduce((sum, c) => sum + (c.debt || 0), 0),
            avgSpent: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length : 0,
            topCustomer: customers.reduce((max, c) => (c.totalSpent || 0) > (max.totalSpent || 0) ? c : max, customers[0] || {})
        };
    }, [customers]);

    const getCustomerPurchases = (customerId) => {
        return sales.filter(s => s.customerId === customerId);
    };

    const getCustomerBadge = (customer) => {
        const spent = customer.totalSpent || 0;
        const purchases = customer.totalPurchases || 0;

        if (spent >= 100000) return { text: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        if (purchases >= 10) return { text: 'Régulier', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (purchases >= 3) return { text: 'Fidèle', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        return { text: 'Nouveau', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    if (selectedCustomerDetail) {
        const customer = customers.find(c => c.id === selectedCustomerDetail);
        if (!customer) {
            setSelectedCustomerDetail(null);
            return null;
        }

        const customerPurchases = getCustomerPurchases(customer.id);
        const badge = getCustomerBadge(customer);

        return (
            <div className="space-y-4">
                {/* Back Button */}
                <button
                    onClick={() => setSelectedCustomerDetail(null)}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    <ChevronLeft size={20} />
                    Retour à la liste
                </button>

                {/* Customer Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl font-bold text-indigo-600">
                                    {customer.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{customer.name}</h2>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {customer.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
                                    {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${badge.color}`}>
                                {badge.text}
                            </span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-indigo-50 p-4 rounded-lg">
                            <p className="text-xs text-indigo-600 font-medium">Total dépensé</p>
                            <p className="text-xl font-bold text-indigo-700">{formatMoney(customer.totalSpent || 0)}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg">
                            <p className="text-xs text-emerald-600 font-medium">Achats</p>
                            <p className="text-xl font-bold text-emerald-700">{customer.totalPurchases || 0}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium">Articles</p>
                            <p className="text-xl font-bold text-blue-700">{customer.totalItems || 0}</p>
                        </div>
                        <div className={`p-4 rounded-lg ${(customer.debt || 0) > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                            <p className={`text-xs font-medium ${(customer.debt || 0) > 0 ? 'text-red-600' : 'text-slate-500'}`}>Dette</p>
                            <p className={`text-xl font-bold ${(customer.debt || 0) > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                                {formatMoney(customer.debt || 0)}
                            </p>
                        </div>
                    </div>

                    {/* Change Owed Section */}
                    {(customer.changeOwed || 0) > 0 && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wallet size={18} className="text-amber-600" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Monnaie à rendre</p>
                                        <p className="text-xs text-amber-600">Le client a de la monnaie en attente</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-amber-700">{formatMoney(customer.changeOwed)}</span>
                                    <button
                                        onClick={() => setReturnChangeCustomer(customer)}
                                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <Wallet size={16} />
                                        Rendre
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Purchase History */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-slate-400" />
                        Historique d'achats ({customerPurchases.length})
                    </h3>
                    <div className="space-y-2">
                        {customerPurchases.length === 0 ? (
                            <p className="text-center text-slate-400 py-8">Aucun achat enregistré</p>
                        ) : (
                            customerPurchases.map(sale => (
                                <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-800">
                                                {new Date(sale.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${sale.isCredit
                                                ? ((sale.amountPaid || 0) >= sale.total
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : (sale.amountPaid || 0) > 0
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                        : 'bg-red-50 text-red-600 border-red-100')
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                {sale.isCredit ? (
                                                    <>
                                                        <Clock size={10} />
                                                        {(sale.amountPaid || 0) >= sale.total
                                                            ? 'Payé'
                                                            : (sale.amountPaid || 0) > 0
                                                                ? `Reste ${formatMoney(sale.total - (sale.amountPaid || 0))}`
                                                                : 'Non payé'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <DollarSign size={10} />
                                                        Payé
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">{sale.items?.length || 0} article(s)</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-lg text-slate-800">{formatMoney(sale.total)}</span>
                                        <button
                                            onClick={() => setViewingReceipt(sale)}
                                            className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                                        >
                                            <Printer size={16} className="text-slate-600" />
                                        </button>
                                        {sale.isCredit && (sale.amountPaid || 0) < sale.total && (
                                            <button
                                                onClick={() => setRepaymentSale(sale)}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1"
                                            >
                                                <DollarSign size={12} />
                                                Rembourser
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Total clients</p>
                    <p className="text-2xl font-bold text-slate-800">{customerStats.total}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Revenu total</p>
                    <p className="text-2xl font-bold text-indigo-600">{formatMoney(customerStats.totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Dettes totales</p>
                    <p className="text-2xl font-bold text-red-600">{formatMoney(customerStats.totalDebt)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Meilleur client</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{customerStats.topCustomer?.name || '-'}</p>
                </div>
            </div>

            {/* Search and Sort */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un client..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                        <option value="recent">Plus récents</option>
                        <option value="spent">Plus dépensé</option>
                        <option value="purchases">Plus d'achats</option>
                    </select>
                    <button
                        onClick={() => setShowCustomerModal(true)}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Nouveau client
                    </button>
                </div>
            </div>

            {/* Customer List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredCustomers.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <Users size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400">
                            {customerSearchTerm ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                        </p>
                    </div>
                ) : (
                    filteredCustomers.map(customer => {
                        const badge = getCustomerBadge(customer);
                        return (
                            <div
                                key={customer.id}
                                onClick={() => setSelectedCustomerDetail(customer.id)}
                                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all text-left cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg font-bold text-indigo-600">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-800 truncate">{customer.name}</h3>
                                                {(customer.debt || 0) > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold flex items-center gap-1">
                                                        <AlertTriangle size={10} />
                                                        {formatMoney(customer.debt)}
                                                    </span>
                                                )}
                                            </div>
                                            {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border flex-shrink-0 ${badge.color}`}>
                                        {badge.text}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-slate-50 p-2 rounded">
                                        <p className="text-[10px] text-slate-500 font-medium">Dépensé</p>
                                        <p className="text-sm font-bold text-slate-800">{formatMoney(customer.totalSpent || 0)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                        <p className="text-[10px] text-slate-500 font-medium">Achats</p>
                                        <p className="text-sm font-bold text-indigo-600">{customer.totalPurchases || 0}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                        <p className="text-[10px] text-slate-500 font-medium">Articles</p>
                                        <p className="text-sm font-bold text-blue-600">{customer.totalItems || 0}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                        <p className="text-[10px] text-slate-500 font-medium">Moyen</p>
                                        <p className="text-sm font-bold text-emerald-600">
                                            {formatMoney(customer.totalPurchases > 0 ? (customer.totalSpent / customer.totalPurchases) : 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCustomer(customer);
                                        }}
                                        className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Edit3 size={16} />
                                        Modifier
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingCustomer(customer);
                                        }}
                                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Trash2 size={16} />
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Customer Edit/Delete Modals */}
            {editingCustomer && (
                <EditCustomerModal
                    customer={editingCustomer}
                    onClose={() => setEditingCustomer(null)}
                    updateCustomer={updateCustomer}
                />
            )}
            {deletingCustomer && (
                <DeleteCustomerModal
                    customer={deletingCustomer}
                    onClose={() => setDeletingCustomer(null)}
                    deleteCustomer={deleteCustomer}
                />
            )}
        </div>
    );
};

export default CustomerView;
