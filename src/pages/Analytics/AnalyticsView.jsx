import React, { useState, useMemo } from 'react';
import { TrendingUp, Package, Clock, DollarSign, Phone, AlertTriangle, Wallet } from 'lucide-react';
import { formatMoney } from '../../utils/helpers';

const AnalyticsView = ({ sales, products, setActiveTab, customers = [] }) => {
    const [period, setPeriod] = useState('7days');

    // Calculate sales data by day
    const salesByDay = useMemo(() => {
        const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
        const data = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const daySales = sales.filter(s => {
                const saleDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
                return saleDate.toISOString().split('T')[0] === dateStr;
            });

            data.push({
                date: dateStr,
                label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
                total: daySales.reduce((sum, s) => {
                    if (s.type === 'repayment') return sum + (s.total || 0);
                    if (s.isCredit) return sum + (s.amountPaid || 0);
                    return sum + (s.total || 0);
                }, 0),
                count: daySales.length
            });
        }
        return data;
    }, [sales, period]);

    const maxSale = Math.max(...salesByDay.map(d => d.total), 1);

    // Top 5 products
    const topProducts = useMemo(() => {
        const productSales = {};
        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = { name: item.name, qty: 0, revenue: 0 };
                }
                productSales[item.id].qty += item.qty;
                productSales[item.id].revenue += item.price * item.qty;
            });
        });
        return Object.entries(productSales)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [sales]);

    const maxQty = Math.max(...topProducts.map(p => p.qty), 1);

    // Peak hours
    const salesByHour = useMemo(() => {
        const hours = Array(24).fill(0);
        sales.forEach(sale => {
            const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
            const hour = saleDate.getHours();
            if (sale.type === 'repayment') {
                hours[hour] += sale.total || 0;
            } else if (sale.isCredit) {
                hours[hour] += sale.amountPaid || 0;
            } else {
                hours[hour] += sale.total || 0;
            }
        });
        return hours;
    }, [sales]);

    const maxHourSale = Math.max(...salesByHour, 1);

    // Stock depletion prediction
    const stockPredictions = useMemo(() => {
        const days30Ago = new Date();
        days30Ago.setDate(days30Ago.getDate() - 30);

        const predictions = [];

        products.forEach(product => {
            if (product.isComposite) return; // Skip composite products

            // Count how many were sold in last 30 days
            let soldQty = 0;
            sales.forEach(sale => {
                const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                if (saleDate >= days30Ago) {
                    (sale.items || []).forEach(item => {
                        if (item.id === product.id) soldQty += item.qty;
                    });
                }
            });

            const dailyRate = soldQty / 30;
            const currentStock = product.stock || 0;
            const daysUntilEmpty = dailyRate > 0 ? Math.floor(currentStock / dailyRate) : Infinity;

            if (daysUntilEmpty < 30 && currentStock > 0) {
                predictions.push({
                    name: product.name,
                    stock: currentStock,
                    dailyRate: dailyRate.toFixed(1),
                    daysLeft: daysUntilEmpty
                });
            }
        });

        return predictions.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
    }, [products, sales]);

    // Account Tracking (Cash vs Mobile Money)
    const accountStats = useMemo(() => {
        const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        let cashTotal = 0;
        let mobileMoneyTotal = 0;

        sales.forEach(sale => {
            const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
            if (saleDate >= startDate) {
                if (sale.isCredit) {
                    // For credit sales, count payments from payments array
                    if (sale.payments && sale.payments.length > 0) {
                        sale.payments.forEach(payment => {
                            if (payment.method === 'mobile_money') {
                                mobileMoneyTotal += payment.amount;
                            } else {
                                cashTotal += payment.amount;
                            }
                        });
                    }
                } else {
                    // Non-credit sales use original payment method
                    const amount = sale.total || 0;
                    if (sale.paymentMethod === 'mobile_money') {
                        mobileMoneyTotal += amount;
                    } else {
                        cashTotal += amount;
                    }
                }
            }
        });

        return { cashTotal, mobileMoneyTotal };
    }, [sales, period]);

    // Cash Management (Change Owed)
    const cashManagement = useMemo(() => {
        const totalChangeOwed = customers.reduce((sum, c) => sum + (c.changeOwed || 0), 0);
        // Net cash = all money we have (cash + mobile money + change we're holding)
        const netCash = accountStats.cashTotal + accountStats.mobileMoneyTotal + totalChangeOwed;

        return { totalChangeOwed, netCash };
    }, [customers, accountStats]);

    return (
        <div className="space-y-5">
            {/* Period Selector */}
            <div className="flex gap-2">
                {[
                    { key: '7days', label: '7 jours' },
                    { key: '30days', label: '30 jours' },
                    { key: '90days', label: '90 jours' }
                ].map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPeriod(p.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p.key
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Account Tracking Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-emerald-500 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Caisse Espèces</p>
                        <h3 className="text-2xl font-bold text-slate-800">{formatMoney(accountStats.cashTotal)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                        <DollarSign size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-blue-500 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Compte Mobile Money</p>
                        <h3 className="text-2xl font-bold text-slate-800">{formatMoney(accountStats.mobileMoneyTotal)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <Phone size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-amber-500 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Monnaie à rendre</p>
                        <h3 className="text-2xl font-bold text-amber-700">{formatMoney(cashManagement.totalChangeOwed)}</h3>
                        <p className="text-xs text-slate-400 mt-1">{customers.filter(c => (c.changeOwed || 0) > 0).length} clients</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                        <Wallet size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-indigo-500 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Net en caisse</p>
                        <h3 className="text-2xl font-bold text-indigo-700">{formatMoney(cashManagement.netCash)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            {/* Sales Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600" />
                    Évolution des ventes
                </h3>
                <div className="h-48 flex items-end gap-1">
                    {salesByDay.slice(-14).map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer group relative"
                                style={{ height: `${(day.total / maxSale) * 100}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                    {formatMoney(day.total)}
                                </div>
                            </div>
                            <span className="text-[9px] text-slate-400 truncate w-full text-center">{day.label.split(' ')[0]}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
                    <span className="text-slate-500">Total période</span>
                    <span className="font-bold text-indigo-600">{formatMoney(salesByDay.reduce((s, d) => s + d.total, 0))}</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                {/* Top Products */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Package size={18} className="text-emerald-600" />
                        Top 5 Produits
                    </h3>
                    {topProducts.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Aucune vente enregistrée</p>
                    ) : (
                        <div className="space-y-3">
                            {topProducts.map((product, i) => (
                                <div key={product.id} className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-slate-700 truncate">{product.name}</span>
                                            <span className="text-xs text-slate-500">{product.qty} vendus</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${(product.qty / maxQty) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Peak Hours */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" />
                        Heures de pointe
                    </h3>
                    <div className="grid grid-cols-12 gap-1">
                        {salesByHour.slice(6, 22).map((amount, i) => {
                            const hour = i + 6;
                            const intensity = amount / maxHourSale;
                            return (
                                <div
                                    key={hour}
                                    className="aspect-square rounded flex items-center justify-center text-[9px] font-medium cursor-pointer group relative"
                                    style={{
                                        backgroundColor: intensity > 0
                                            ? `rgba(79, 70, 229, ${0.2 + intensity * 0.8})`
                                            : '#f1f5f9',
                                        color: intensity > 0.5 ? 'white' : '#64748b'
                                    }}
                                >
                                    {hour}h
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                        {formatMoney(amount)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>Moins actif</span>
                        <div className="flex gap-1">
                            {[0.2, 0.4, 0.6, 0.8, 1].map(i => (
                                <div key={i} className="w-4 h-2 rounded" style={{ backgroundColor: `rgba(79, 70, 229, ${i})` }} />
                            ))}
                        </div>
                        <span>Plus actif</span>
                    </div>
                </div>
            </div>

            {/* Stock Predictions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" />
                    Prévision de rupture
                </h3>
                {stockPredictions.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Aucun produit à risque de rupture dans les 30 prochains jours 🎉</p>
                ) : (
                    <div className="space-y-2">
                        {stockPredictions.map(pred => (
                            <div key={pred.name} className={`flex items-center justify-between p-3 rounded-lg ${pred.daysLeft <= 7 ? 'bg-red-50' : 'bg-amber-50'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${pred.daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {pred.daysLeft}j
                                    </span>
                                    <div>
                                        <span className="font-medium text-slate-700">{pred.name}</span>
                                        <p className="text-xs text-slate-500">{pred.stock} en stock • ~{pred.dailyRate}/jour</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveTab('inventory')}
                                    className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    Réapprovisionner
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsView;
