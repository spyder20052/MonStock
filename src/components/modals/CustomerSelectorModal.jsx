import React, { useState } from 'react';
import { Users, X, Search, Plus } from 'lucide-react';
import { formatMoney } from '../../utils/helpers';

const CustomerSelectorModal = ({ onClose, onSelectCustomer, customers, createCustomer }) => {
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;

        const customer = await createCustomer({
            name: newCustomerName,
            phone: newCustomerPhone
        });

        if (customer) {
            onSelectCustomer(customer);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        Sélectionner un client
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou téléphone..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Quick Add Form */}
                    <form onSubmit={handleQuickAdd} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <p className="text-xs font-medium text-indigo-700 mb-2">Nouveau client rapide</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nom"
                                className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                            />
                            <input
                                type="tel"
                                placeholder="Téléphone (opt.)"
                                className="w-32 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300"
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </form>

                    {/* Customer List */}
                    <div className="space-y-2">
                        {/* Anonymous Option */}
                        <button
                            onClick={() => { onSelectCustomer(null); onClose(); }}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-left border border-slate-200 transition-colors"
                        >
                            <p className="font-medium text-slate-600">Client Anonyme</p>
                            <p className="text-xs text-slate-400">Vente sans client</p>
                        </button>

                        {filteredCustomers.length === 0 && searchQuery ? (
                            <p className="text-center text-slate-400 text-sm py-4">Aucun client trouvé</p>
                        ) : (
                            filteredCustomers.map(customer => (
                                <button
                                    key={customer.id}
                                    onClick={() => { onSelectCustomer(customer); onClose(); }}
                                    className="w-full p-3 bg-white hover:bg-indigo-50 rounded-lg text-left border border-slate-200 hover:border-indigo-300 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-800">{customer.name}</p>
                                            {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">{customer.totalPurchases || 0} achats</p>
                                            <p className="text-xs font-medium text-indigo-600">{formatMoney(customer.totalSpent || 0)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerSelectorModal;
