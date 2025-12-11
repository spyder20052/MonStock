import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, ShoppingCart, AlertTriangle, Plus, Package, History, FileText, RefreshCw, Clock, Printer } from 'lucide-react';
import { formatMoney, formatDate, isIngredientLow, getProductStock } from '../../utils/helpers';

const DashboardView = ({ sales, stats, ingredients, products, setActiveTab, setViewingReceipt }) => {
    const [salesFilter, setSalesFilter] = useState('today');

    const filteredSales = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return sales.filter(sale => {
            const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);

            switch (salesFilter) {
                case 'today':
                    return saleDate >= today;
                case '7days':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return saleDate >= weekAgo;
                case '30days':
                    const monthAgo = new Date(today);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    return saleDate >= monthAgo;
                default:
                    return true;
            }
        });
    }, [sales, salesFilter]);

    const filteredTotal = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

    return (
        <div className="space-y-4">
            {/* Mobile: Single Main Stat Card */}
            <div className="lg:hidden">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                    <p className="text-indigo-100 text-sm font-medium mb-2">Ventes Aujourd'hui</p>
                    <h2 className="text-4xl font-bold mb-1">{formatMoney(stats.todayRevenue)}</h2>
                    <div className="flex items-center gap-4 mt-4 text-sm">
                        <div>
                            <p className="text-indigo-200">Total période</p>
                            <p className="font-semibold">{formatMoney(stats.totalRevenue)}</p>
                        </div>
                        <div className="w-px h-8 bg-indigo-400"></div>
                        <div>
                            <p className="text-indigo-200">Stock bas</p>
                            <p className={`font-semibold ${stats.lowStockCount > 0 ? 'text-yellow-300' : ''}`}>
                                {stats.lowStockCount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop: Full Stats Grid */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-indigo-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DollarSign size={20} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-500 text-xs font-medium">Chiffre d'affaires</p>
                            <h3 className="text-lg font-bold text-slate-800 truncate">{formatMoney(stats.totalRevenue)}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={20} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-500 text-xs font-medium">Bénéfice</p>
                            <h3 className="text-lg font-bold text-emerald-600 truncate">{formatMoney(stats.totalProfit)}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ShoppingCart size={20} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-500 text-xs font-medium">Aujourd'hui</p>
                            <h3 className="text-lg font-bold text-slate-800 truncate">{formatMoney(stats.todayRevenue)}</h3>
                        </div>
                    </div>
                </div>

                <div className={`bg-white rounded-xl p-4 border border-l-4 ${stats.lowStockCount > 0 ? 'border-red-200 border-l-red-500' : 'border-slate-200 border-l-slate-400'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stats.lowStockCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                            <AlertTriangle size={20} className={`${stats.lowStockCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-500 text-xs font-medium">Alertes stock</p>
                            <h3 className={`text-lg font-bold ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>{stats.lowStockCount}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Actions rapides</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 lg:gap-3 p-4 lg:p-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                        <ShoppingCart size={24} className="lg:hidden" />
                        <ShoppingCart size={18} className="hidden lg:block" />
                        <span className="font-semibold text-sm lg:font-medium">Nouvelle vente</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 lg:gap-3 p-4 lg:p-3 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <Package size={24} className="lg:hidden" />
                        <Package size={18} className="hidden lg:block" />
                        <span className="font-semibold text-sm lg:font-medium">Voir stock</span>
                    </button>

                    {/* Desktop only buttons */}
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className="hidden lg:flex items-center gap-3 p-3 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <Plus size={18} />
                        <span className="font-medium text-sm">Ajouter produit</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sales_history')}
                        className="hidden lg:flex items-center gap-3 p-3 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <History size={18} />
                        <span className="font-medium text-sm">Historique</span>
                    </button>
                </div>
            </div>

            {/* Ingredient Alerts - Hide on Mobile */}
            <div className="hidden lg:block">{(() => {
                const lowIngredients = ingredients.filter(i => isIngredientLow(i));
                if (lowIngredients.length === 0) return null;

                // Find products affected by low ingredients
                const affectedProducts = products.filter(p => {
                    if (!p.isComposite || !p.recipe) return false;
                    return p.recipe.some(r => lowIngredients.some(i => i.id === r.ingredientId));
                });

                return (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={20} className="text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-red-800 mb-2">Alerte ingrédients</h3>

                                <div className="mb-3">
                                    <p className="text-sm text-red-700 mb-2">{lowIngredients.length} ingrédient{lowIngredients.length > 1 ? 's' : ''} à réapprovisionner :</p>
                                    <div className="flex flex-wrap gap-2">
                                        {lowIngredients.map(ing => (
                                            <span key={ing.id} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                                                {ing.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {affectedProducts.length > 0 && (
                                    <div className="pt-3 border-t border-red-200">
                                        <p className="text-sm text-red-700 mb-2">Produits impactés :</p>
                                        <div className="flex flex-wrap gap-2">
                                            {affectedProducts.map(prod => (
                                                <span key={prod.id} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium flex items-center gap-1">
                                                    <Package size={12} />
                                                    {prod.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setActiveTab('ingredients')}
                                    className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium flex items-center gap-1"
                                >
                                    Voir les ingrédients →
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}</div>

            {/* Sales History with Date Filter - Simplified on Mobile */}
            <div className="bg-white rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-100 gap-3">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">Ventes récentes</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                            {formatMoney(filteredTotal)}
                        </span>
                    </div>

                    {/* Date Filter */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {[
                            { id: 'today', label: "Aujourd'hui" },
                            { id: '7days', label: '7 jours' },
                            { id: '30days', label: '30 jours' },
                            { id: 'all', label: 'Tout' },
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setSalesFilter(filter.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${salesFilter === filter.id
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredSales.length === 0 ? (
                    <div className="p-8 text-center">
                        <FileText size={40} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Aucune vente pour cette période</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {/* Mobile: Show only 3 sales, Desktop: Show 10 */}
                        {filteredSales.slice(0, window.innerWidth < 1024 ? 3 : 10).map(sale => (
                            <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FileText size={14} className="text-slate-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm text-slate-700">{formatDate(sale.date)}</p>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${sale.isCredit
                                                    ? ((sale.amountPaid || 0) >= sale.total
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : (sale.amountPaid || 0) > 0
                                                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                            : 'bg-red-50 text-red-600 border-red-100')
                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'  // Non-credit = always paid
                                                }`}>
                                                <Clock size={10} />
                                                {sale.isCredit
                                                    ? ((sale.amountPaid || 0) >= sale.total
                                                        ? 'Payé'
                                                        : (sale.amountPaid || 0) > 0
                                                            ? `Reste ${formatMoney(sale.total - (sale.amountPaid || 0))}`
                                                            : 'Non payé')
                                                    : 'Payé'  // Non-credit = always paid
                                                }
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{sale.items?.length || 0} article{(sale.items?.length || 0) > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 ml-2">
                                    <span className="font-bold text-sm text-slate-800">{formatMoney(sale.total)}</span>
                                    <button
                                        onClick={() => setViewingReceipt(sale)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <Printer size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredSales.length > 10 && (
                    <div className="p-3 border-t border-slate-100 text-center">
                        <button
                            onClick={() => setActiveTab('sales_history')}
                            className="text-sm text-indigo-600 font-medium hover:underline"
                        >
                            Voir tout l'historique →
                        </button>
                    </div>
                )}
            </div>

            {/* Products Overview - Clean table format */}
            <div className="bg-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Package size={18} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">Produits</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{products.length}</span>
                    </div>
                    <button onClick={() => setActiveTab('inventory')} className="text-sm text-indigo-600 font-medium hover:underline">
                        Tout voir →
                    </button>
                </div>

                {products.length === 0 ? (
                    <div className="p-8 text-center">
                        <Package size={40} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Aucun produit</p>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className="mt-3 text-sm text-indigo-600 font-medium hover:underline"
                        >
                            + Ajouter un produit
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {products.slice(0, 5).map(product => {
                            const stock = getProductStock(product, ingredients);
                            const isLow = product.isComposite ? stock <= 2 : stock <= product.minStock;
                            return (
                                <div key={product.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                        <span className="font-medium text-sm text-slate-700">{product.name}</span>
                                        {product.isComposite && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">Composé</span>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-semibold text-slate-800">{formatMoney(product.price)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${isLow ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {stock} en stock
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardView;
