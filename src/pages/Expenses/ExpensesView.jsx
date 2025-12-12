import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign, Trash2, Filter, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatMoney } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ExpenseModal from '../../components/modals/ExpenseModal';

const ExpensesView = ({ workspaceId, showNotification, user, userProfile }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [dateFilter, setDateFilter] = useState('this_month'); // this_month, last_month, all

    useEffect(() => {
        if (!workspaceId) return;

        setLoading(true);
        // Basic query - improved filtering can be done client-side for flexibility or composite indexes
        const q = query(
            collection(db, 'users', workspaceId, 'expenses'),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expenseList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setExpenses(expenseList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses:", error);
            showNotification('error', "Erreur chargement dépenses");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [workspaceId]);

    const handleDelete = async (id) => {
        if (!confirm('Supprimer cette dépense ?')) return;
        try {
            await deleteDoc(doc(db, 'users', workspaceId, 'expenses', id));
            showNotification('Dépense supprimée');
        } catch (error) {
            console.error("Delete error:", error);
            showNotification('error', "Erreur suppression");
        }
    };

    // Filter Logic
    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch =
            expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.category.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        const expenseDate = new Date(expense.date);
        const now = new Date();

        if (dateFilter === 'this_month') {
            return expenseDate.getMonth() === now.getMonth() &&
                expenseDate.getFullYear() === now.getFullYear();
        }
        if (dateFilter === 'last_month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return expenseDate.getMonth() === lastMonth.getMonth() &&
                expenseDate.getFullYear() === lastMonth.getFullYear();
        }

        return true;
    });

    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20 lg:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dépenses</h1>
                    <p className="text-slate-500">Gérez vos charges (loyer, factures, salaires...)</p>
                </div>
                <Button onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>
                    <Plus size={20} />
                    Nouvelle Dépense
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-white border-l-4 border-l-red-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-lg text-red-600">
                            <ArrowDownRight size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Dépenses (Période)</p>
                            <h3 className="text-2xl font-bold text-slate-800">{formatMoney(totalExpenses)}</h3>
                        </div>
                    </div>
                </Card>
                {/* Placeholder for future budget logic or comparisons */}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une dépense..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="this_month">Ce mois</option>
                        <option value="last_month">Mois dernier</option>
                        <option value="all">Tout l'historique</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Description</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Montant</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Wallet size={32} className="opacity-20" />
                                            <p>Aucune dépense trouvée pour cette période</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(expense.date).toLocaleDateString('fr-FR')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                            {expense.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">
                                            - {formatMoney(expense.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                >
                                                    <Filter size={16} className="rotate-180" /> {/* Edit Icon replacement */}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ExpenseModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    expenseToEdit={editingExpense}
                    workspaceId={workspaceId}
                    showNotification={showNotification}
                    user={user}
                    userProfile={userProfile}
                />
            )}
        </div>
    );
};

export default ExpensesView;
