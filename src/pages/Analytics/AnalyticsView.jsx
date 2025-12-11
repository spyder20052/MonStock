import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Package, Clock, AlertTriangle, Calendar, Phone, Wallet } from 'lucide-react';
import { formatMoney } from '../../utils/helpers';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

            // Find peak hour for this day
            const hours = {};
            daySales.forEach(s => {
                const saleDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
                const hour = saleDate.getHours();
                const amount = s.type === 'repayment' ? (s.total || 0) :
                    s.isCredit ? (s.amountPaid || 0) : (s.total || 0);
                hours[hour] = (hours[hour] || 0) + amount;
            });

            let peakHour = null;
            let maxHourTotal = 0;
            Object.entries(hours).forEach(([h, total]) => {
                if (total > maxHourTotal) {
                    maxHourTotal = total;
                    peakHour = h;
                }
            });

            data.push({
                date: dateStr,
                label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
                shortLabel: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
                total: daySales.reduce((sum, s) => {
                    if (s.type === 'repayment') return sum + (Number(s.total) || 0);
                    if (s.isCredit) return sum + (Number(s.amountPaid) || 0);
                    return sum + (Number(s.total) || 0);
                }, 0),
                count: daySales.length,
                peakHour: peakHour
            });
        }
        return data;
    }, [sales, period]);

    const maxSale = Math.max(...salesByDay.map(d => d.total), 1);

    // Debug: Log sales data
    console.log('📊 Sales by day:', salesByDay.map(d => ({ label: d.label, total: d.total })));
    console.log('📈 Max sale:', maxSale);


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
            {/* Period Selector - Hidden on Mobile */}
            <div className="hidden lg:flex gap-2">
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

            {/* Account Tracking Cards - Compact 2x2 on mobile, 4 cols on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                <div className="bg-white rounded-lg lg:rounded-xl p-2.5 lg:p-4 border border-slate-200 border-l-4 border-l-emerald-500 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] lg:text-sm text-slate-500 font-medium truncate">Caisse Espèces</p>
                        <h3 className="text-base lg:text-2xl font-bold text-slate-800 truncate">{formatMoney(accountStats.cashTotal)}</h3>
                    </div>
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0 ml-2">
                        <DollarSign className="w-4 h-4 lg:w-6 lg:h-6" />
                    </div>
                </div>
                <div className="bg-white rounded-lg lg:rounded-xl p-2.5 lg:p-4 border border-slate-200 border-l-4 border-l-blue-500 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] lg:text-sm text-slate-500 font-medium truncate">Mobile Money</p>
                        <h3 className="text-base lg:text-2xl font-bold text-slate-800 truncate">{formatMoney(accountStats.mobileMoneyTotal)}</h3>
                    </div>
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0 ml-2">
                        <Phone className="w-4 h-4 lg:w-6 lg:h-6" />
                    </div>
                </div>
                <div className="bg-white rounded-lg lg:rounded-xl p-2.5 lg:p-4 border border-slate-200 border-l-4 border-l-amber-500 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] lg:text-sm text-slate-500 font-medium truncate">Monnaie à rendre</p>
                        <h3 className="text-base lg:text-2xl font-bold text-amber-700 truncate">{formatMoney(cashManagement.totalChangeOwed)}</h3>
                    </div>
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0 ml-2">
                        <Wallet className="w-4 h-4 lg:w-6 lg:h-6" />
                    </div>
                </div>
                <div className="bg-white rounded-lg lg:rounded-xl p-2.5 lg:p-4 border border-slate-200 border-l-4 border-l-indigo-500 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] lg:text-sm text-slate-500 font-medium truncate">Net en caisse</p>
                        <h3 className="text-base lg:text-2xl font-bold text-indigo-700 truncate">{formatMoney(cashManagement.netCash)}</h3>
                    </div>
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 flex-shrink-0 ml-2">
                        <DollarSign className="w-4 h-4 lg:w-6 lg:h-6" />
                    </div>
                </div>
            </div>

            {/* Sales Chart - Desktop: Recharts, Mobile: Simple List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-4 lg:mb-6">Évolution des ventes</h3>

                {/* Desktop: Recharts Bar Chart */}
                <div className="hidden lg:block h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesByDay}>
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                interval={period === '90days' ? 6 : period === '30days' ? 2 : 0}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-slate-800 text-white text-xs px-2 py-1.5 rounded shadow-lg">
                                                <div className="font-bold mb-0.5">{formatMoney(payload[0].value)}</div>
                                                {data.peakHour && (
                                                    <div className="text-slate-300 text-[10px] flex items-center gap-1">
                                                        <Clock size={10} />
                                                        Pointe: {data.peakHour}h
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                {salesByDay.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                                ))}
                            </Bar>
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Mobile: Horizontal Bars - Last 7 Days */}
                <div className="lg:hidden space-y-2">
                    {(() => {
                        const displayedDays = salesByDay.slice(-7);
                        const maxDisplayed = Math.max(...displayedDays.map(d => d.total), 1);
                        return displayedDays.map((day, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 font-medium w-14 flex-shrink-0">{day.shortLabel}</span>
                                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-lg flex items-center justify-end px-2"
                                        style={{ width: maxDisplayed > 0 ? `${Math.max((day.total / maxDisplayed) * 100, day.total > 0 ? 5 : 0)}%` : '0%' }}
                                    >
                                        {day.total > 0 && (
                                            <span className="text-white text-xs font-bold">{formatMoney(day.total)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
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
                                    <span className={`w - 6 h - 6 rounded - full flex items - center justify - center text - xs font - bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                        } `}>
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
                                                style={{ width: `${(product.qty / maxQty) * 100}% ` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Peak Hours - Hidden on Mobile */}
                <div className="hidden lg:block bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" />
                        Heures de pointe (24h)
                    </h3>
                    {/* All 24 hours in a 12x2 grid */}
                    <div className="grid grid-cols-12 gap-1">
                        {salesByHour.map((amount, hour) => {
                            const intensity = maxHourSale > 0 ? amount / maxHourSale : 0;
                            const isPeakHour = intensity > 0.7; // Top 30% are peak hours
                            return (
                                <div
                                    key={hour}
                                    className={`aspect-square rounded flex items-center justify-center text-[9px] font-medium cursor-pointer group relative ${isPeakHour ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                                    style={{
                                        backgroundColor: intensity > 0
                                            ? `rgba(79, 70, 229, ${0.15 + intensity * 0.85})`
                                            : '#f1f5f9',
                                        color: intensity > 0.4 ? 'white' : '#64748b'
                                    }}
                                >
                                    {hour}h
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                        {hour}h: {formatMoney(amount)}
                                        {isPeakHour && ' 🔥'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs text-slate-400">
                        <span>Moins actif</span>
                        <div className="flex items-center gap-1">
                            {[0.15, 0.35, 0.55, 0.75, 1].map(i => (
                                <div key={i} className="w-4 h-2 rounded" style={{ backgroundColor: `rgba(79, 70, 229, ${i})` }} />
                            ))}
                            <span className="ml-2 text-amber-500 font-medium">🔥 = Pointe</span>
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
                            <div key={pred.name} className={`flex items - center justify - between p - 3 rounded - lg ${pred.daysLeft <= 7 ? 'bg-red-50' : 'bg-amber-50'
                                } `}>
                                <div className="flex items-center gap-3">
                                    <span className={`w - 8 h - 8 rounded - lg flex items - center justify - center font - bold text - sm ${pred.daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        } `}>
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
