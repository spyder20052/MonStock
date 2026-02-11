import React, { useState, useMemo } from 'react';
import { Calendar, FileText, Printer, ChevronLeft, ChevronRight, Phone, DollarSign, RefreshCw, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from '../../utils/helpers';
import { PERMISSIONS, hasPermission } from '../../utils/permissions';

const HistoryView = ({ sales, setViewingReceipt, deleteSale, userProfile, showNotification }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [deletingSale, setDeletingSale] = useState(null); // Sale to confirm deletion

    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0];
    };

    const filteredSales = useMemo(() => {
        const selectedKey = formatDateKey(selectedDate);
        return sales.filter(sale => {
            const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
            return formatDateKey(saleDate) === selectedKey;
        });
    }, [sales, selectedDate]);

    const dayTotal = filteredSales.reduce((sum, s) => {
        if (s.type === 'repayment') return sum + (s.total || 0);
        if (s.isCredit) return sum + (s.amountPaid || 0);
        return sum + (s.total || 0);
    }, 0);

    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        if (newDate <= new Date()) setSelectedDate(newDate);
    };

    const goToToday = () => setSelectedDate(new Date());

    const isToday = formatDateKey(selectedDate) === formatDateKey(new Date());

    // Generate last 7 days for quick access
    const recentDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }, []);

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("Rapport des Ventes", 14, 22);
        doc.setFontSize(11);
        doc.text(`Date: ${selectedDate.toLocaleDateString('fr-FR')}`, 14, 30);
        doc.text(`Total: ${formatMoney(dayTotal)}`, 14, 38);

        // Table
        const tableColumn = ["Heure", "Client", "Articles", "Méthode", "Montant"];
        const tableRows = [];

        filteredSales.forEach(sale => {
            const saleData = [
                (sale.date?.toDate ? sale.date.toDate() : new Date(sale.date)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                sale.customerName || 'Anonyme',
                sale.items?.length || 0,
                sale.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Espèces',
                formatMoney(sale.total)
            ];
            tableRows.push(saleData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
        });

        doc.save(`ventes_${formatDateKey(selectedDate)}.pdf`);
    };

    const exportToCSV = () => {
        const headers = ["Date", "Heure", "Client", "Articles", "Méthode", "Montant"];
        const rows = filteredSales.map(sale => {
            const dateObj = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
            return [
                dateObj.toLocaleDateString('fr-FR'),
                dateObj.toLocaleTimeString('fr-FR'),
                sale.customerName || 'Anonyme',
                sale.items?.length || 0,
                sale.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Espèces',
                sale.total
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ventes_${formatDateKey(selectedDate)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteSale = async () => {
        if (!deletingSale || !deleteSale) return;
        await deleteSale(deletingSale);
        setDeletingSale(null);
    };

    const canDelete = hasPermission(userProfile, PERMISSIONS.MANAGE_SALES);

    return (
        <div className="space-y-4">
            {/* Date Navigation Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-600" />
                        Historique des ventes
                    </h2>
                    {!isToday && (
                        <button
                            onClick={goToToday}
                            className="text-sm text-indigo-600 font-medium hover:underline"
                        >
                            Aujourd'hui
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={exportToCSV}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Exporter CSV"
                        >
                            <FileText size={20} />
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Exporter PDF"
                        >
                            <Printer size={20} />
                        </button>
                    </div>
                </div>

                {/* Day Selector */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <button
                        onClick={goToPreviousDay}
                        className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-slate-600" />
                    </button>

                    <div className="flex-1 text-center">
                        <p className="text-lg font-bold text-slate-800">
                            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-sm text-slate-500">
                            {selectedDate.getFullYear()}
                        </p>
                    </div>

                    <button
                        onClick={goToNextDay}
                        disabled={isToday}
                        className={`p-2 rounded-lg transition-colors ${isToday
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Quick Day Access */}
                <div className="flex gap-2 overflow-x-auto pb-2 date-scroll">
                    {recentDays.map((date, idx) => {
                        const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(date)}
                                className={`flex-shrink-0 px-3 py-2 rounded-lg text-center transition-all ${isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <div className="text-xs font-medium">
                                    {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                                </div>
                                <div className="text-sm font-bold">
                                    {date.getDate()}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Day Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total du jour</p>
                    <p className="text-2xl font-bold text-slate-800">{formatMoney(dayTotal)}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500">Nombre de ventes</p>
                    <p className="text-2xl font-bold text-indigo-600">{filteredSales.length}</p>
                </div>
            </div>

            {/* Sales List */}
            <div className="space-y-2">
                {filteredSales.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <FileText size={40} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400">Aucune vente ce jour</p>
                    </div>
                ) : (
                    filteredSales.map(sale => (
                        <div key={sale.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sale.paymentMethod === 'mobile_money' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                    {sale.paymentMethod === 'mobile_money' ? <Phone size={18} /> : <DollarSign size={18} />}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {(sale.date?.toDate ? sale.date.toDate() : new Date(sale.date)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500">
                                            {sale.customerName !== 'Anonyme' ? sale.customerName : 'Client Anonyme'} • {sale.items?.length || 0} art.
                                        </p>
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
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-slate-800">{formatMoney(sale.total)}</span>
                                <button
                                    onClick={() => setViewingReceipt(sale)}
                                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                                >
                                    <Printer size={16} />
                                </button>
                                {canDelete && (
                                    <button
                                        onClick={() => setDeletingSale(sale)}
                                        className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="Supprimer cette vente"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deletingSale && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle size={28} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Supprimer cette vente ?</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Vente de <strong>{formatMoney(deletingSale.total)}</strong> pour <strong>{deletingSale.customerName || 'Client Anonyme'}</strong>
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    Le stock sera restauré et les statistiques du client seront mises à jour. Cette action est irréversible.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeletingSale(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteSale}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryView;
