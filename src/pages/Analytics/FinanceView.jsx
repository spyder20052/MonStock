import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatMoney } from '../../utils/helpers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';

const FinanceView = ({ workspaceId }) => {
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('this_month'); // this_month, last_month, year, all

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);

        const qSales = query(collection(db, 'users', workspaceId, 'sales'), orderBy('date', 'desc'));
        const qExpenses = query(collection(db, 'users', workspaceId, 'expenses'), orderBy('date', 'desc'));

        const unsubSales = onSnapshot(qSales, (snap) => {
            setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubExpenses = onSnapshot(qExpenses, (snap) => {
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => { unsubSales(); unsubExpenses(); };
    }, [workspaceId]);

    // Filter Data based on Range
    const filteredData = useMemo(() => {
        const now = new Date();
        const startOfPeriod = new Date();

        if (dateRange === 'this_month') {
            startOfPeriod.setDate(1);
        } else if (dateRange === 'last_month') {
            startOfPeriod.setMonth(now.getMonth() - 1);
            startOfPeriod.setDate(1);
            now.setDate(0); // End of last month
        } else if (dateRange === 'year') {
            startOfPeriod.setMonth(0);
            startOfPeriod.setDate(1);
        } else {
            startOfPeriod.setFullYear(2000); // All time
        }

        const filterFn = (item) => {
            const date = new Date(item.date);
            return date >= startOfPeriod && date <= now;
        };

        return {
            sales: sales.filter(filterFn),
            expenses: expenses.filter(filterFn)
        };
    }, [sales, expenses, dateRange]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalRevenue = filteredData.sales.reduce((sum, s) => sum + (s.total || 0), 0);
        // Fallback for old sales: cost = 0 (100% margin) or estimate? Let's use 0 to encourage updating.
        const totalCOGS = filteredData.sales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const grossMargin = totalRevenue - totalCOGS;
        const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const netProfit = grossMargin - totalExpenses;

        return { totalRevenue, totalCOGS, grossMargin, totalExpenses, netProfit };
    }, [filteredData]);

    // Charts Data
    const chartData = useMemo(() => {
        // Group by day
        const grouped = {};

        filteredData.sales.forEach(s => {
            const day = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (!grouped[day]) grouped[day] = { name: day, revenue: 0, profit: 0, expense: 0 };
            grouped[day].revenue += s.total || 0;
            const cost = s.totalCost || 0;
            grouped[day].profit += (s.total || 0) - cost;
        });

        filteredData.expenses.forEach(e => {
            const day = new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (!grouped[day]) grouped[day] = { name: day, revenue: 0, profit: 0, expense: 0 };
            grouped[day].expense += Number(e.amount) || 0;
            grouped[day].profit -= Number(e.amount) || 0; // Net profit per day
        });

        return Object.values(grouped).sort((a, b) => {
            const [da, ma] = a.name.split('/');
            const [db, mb] = b.name.split('/');
            return new Date(2024, ma - 1, da) - new Date(2024, mb - 1, db); // Rough sort
        });
    }, [filteredData]);

    const expenseBreakdown = useMemo(() => {
        const cats = {};
        filteredData.expenses.forEach(e => {
            if (!cats[e.category]) cats[e.category] = 0;
            cats[e.category] += Number(e.amount);
        });
        return Object.entries(cats).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-0">
            {/* Header + Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Santé Financière</h1>
                    <p className="text-slate-500">Compte de résultat simplifié (P&L)</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                    {['this_month', 'last_month', 'year', 'all'].map(r => (
                        <button
                            key={r}
                            onClick={() => setDateRange(r)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === r ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {r === 'this_month' ? 'Ce mois' : r === 'last_month' ? 'Mois dernier' : r === 'year' ? 'Cette année' : 'Tout'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-4 bg-white border-l-4 border-l-indigo-500">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Chiffre d'Affaires</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">{formatMoney(kpis.totalRevenue)}</h3>
                    <div className="flex items-center gap-1 text-xs text-indigo-600 mt-2">
                        <DollarSign size={14} /> Ventes totales
                    </div>
                </Card>

                <Card className="p-4 bg-white border-l-4 border-l-orange-400">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Coût d'Achat (COGS)</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">{formatMoney(kpis.totalCOGS)}</h3>
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                        <Wallet size={14} /> Coût marchandises
                    </div>
                </Card>

                <Card className="p-4 bg-white border-l-4 border-l-green-400">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Marge Brute</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">{formatMoney(kpis.grossMargin)}</h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                        <TrendingUp size={14} /> {kpis.totalRevenue ? Math.round((kpis.grossMargin / kpis.totalRevenue) * 100) : 0}% du CA
                    </div>
                </Card>

                <Card className="p-4 bg-white border-l-4 border-l-red-500">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dépenses</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">{formatMoney(kpis.totalExpenses)}</h3>
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
                        <TrendingDown size={14} /> Charges fixes
                    </div>
                </Card>

                <Card className={`p-4 border-l-4 ${kpis.netProfit >= 0 ? 'bg-emerald-50 border-emerald-600' : 'bg-red-50 border-red-600'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Résultat Net</p>
                    <h3 className={`text-2xl font-bold mt-1 ${kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {kpis.netProfit > 0 ? '+' : ''}{formatMoney(kpis.netProfit)}
                    </h3>
                    <div className={`flex items-center gap-1 text-xs mt-2 font-medium ${kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {kpis.netProfit >= 0 ? 'Bénéfice' : 'Perte'}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Graph: Evolution */}
                <Card className="lg:col-span-2 p-6 bg-white shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Évolution Financière (Journalière)</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                <RechartsTooltip
                                    formatter={(val) => formatMoney(val)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" name="Ventes" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Dépenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                                {/* Profit Line on top */}
                                <Line type="monotone" dataKey="profit" name="Net" stroke="#10b981" strokeWidth={2} dot={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Expenses Breakdown */}
                <Card className="p-6 bg-white shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Répartition des Dépenses</h3>
                    <div className="h-64 w-full">
                        {expenseBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {expenseBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(val) => formatMoney(val)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Aucune dépense</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FinanceView;
