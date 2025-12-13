import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    ArrowLeft, Clock, Activity, Search, Download, ShoppingCart, Package,
    Users, DollarSign, Trash2, Edit3, CheckCircle, XCircle, Calendar,
    Filter, ChevronDown, Eye, EyeOff, MoreVertical, RefreshCw, TrendingUp,
    BarChart2, Star, AlertTriangle, Zap, Settings, SortAsc, SortDesc,
    FileText, Share2, Bookmark, BookmarkCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isThisWeek, isThisMonth, parseISO, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityLogView = ({ userProfile, workspaceId }) => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({
        period: 'all',
        actions: [],
        users: []
    });
    const [showStatsPanel, setShowStatsPanel] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc'); // desc or asc
    const [viewMode, setViewMode] = useState('timeline'); // timeline or compact
    const [bookmarkedLogs, setBookmarkedLogs] = useState(new Set());
    const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [highlightRecent, setHighlightRecent] = useState(true);

    useEffect(() => {
        if (!workspaceId) return;

        const q = query(
            collection(db, 'users', workspaceId, 'logs'),
            orderBy('timestamp', 'desc'),
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [workspaceId]);

    // Get unique users
    const uniqueUsers = useMemo(() => {
        const users = new Set();
        logs.forEach(log => {
            if (log.userName) users.add(log.userName);
        });
        return Array.from(users);
    }, [logs]);

    // Filter and sort logs
    const filteredLogs = useMemo(() => {
        let filtered = logs.filter(log => {
            // Bookmarked filter
            if (showOnlyBookmarked && !bookmarkedLogs.has(log.id)) return false;

            // Search
            const matchesSearch = !searchTerm ||
                (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase()));

            // Period
            let matchesPeriod = true;
            if (log.timestamp && selectedFilters.period !== 'all') {
                const logDate = log.timestamp.toDate();
                if (selectedFilters.period === 'today') matchesPeriod = isToday(logDate);
                else if (selectedFilters.period === 'week') matchesPeriod = isThisWeek(logDate, { locale: fr });
                else if (selectedFilters.period === 'month') matchesPeriod = isThisMonth(logDate);
            }

            // Actions
            const matchesAction = selectedFilters.actions.length === 0 ||
                selectedFilters.actions.some(filter => log.action && log.action.includes(filter));

            // Users
            const matchesUser = selectedFilters.users.length === 0 ||
                selectedFilters.users.includes(log.userName);

            return matchesSearch && matchesPeriod && matchesAction && matchesUser;
        });

        // Sort
        filtered.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            const diff = a.timestamp.toDate() - b.timestamp.toDate();
            return sortOrder === 'desc' ? -diff : diff;
        });

        return filtered;
    }, [logs, searchTerm, selectedFilters, sortOrder, showOnlyBookmarked, bookmarkedLogs]);

    // Group by date
    const groupedLogs = useMemo(() => {
        const groups = {};
        filteredLogs.forEach(log => {
            if (!log.timestamp) return;
            const dateKey = format(log.timestamp.toDate(), 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(log);
        });
        return groups;
    }, [filteredLogs]);

    // Statistics
    const stats = useMemo(() => {
        const todayLogs = logs.filter(log => log.timestamp && isToday(log.timestamp.toDate()));
        const weekLogs = logs.filter(log => log.timestamp && isThisWeek(log.timestamp.toDate(), { locale: fr }));

        // Activity trend (comparing today vs yesterday)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayLogs = logs.filter(log => {
            if (!log.timestamp) return false;
            const logDate = log.timestamp.toDate();
            return logDate >= startOfDay(yesterday) && logDate <= endOfDay(yesterday);
        });
        const trend = todayLogs.length - yesterdayLogs.length;

        // Most active hour today
        const hourCounts = new Array(24).fill(0);
        todayLogs.forEach(log => {
            if (log.timestamp) {
                const hour = log.timestamp.toDate().getHours();
                hourCounts[hour]++;
            }
        });
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

        return {
            today: todayLogs.length,
            week: weekLogs.length,
            total: logs.length,
            creations: logs.filter(l => l.action && l.action.includes('CREATED')).length,
            modifications: logs.filter(l => l.action && l.action.includes('UPDATED')).length,
            suppressions: logs.filter(l => l.action && l.action.includes('DELETED')).length,
            ventes: logs.filter(l => l.action && l.action === 'SALE_CREATED').length,
            users: uniqueUsers.length,
            trend,
            peakHour,
            bookmarked: bookmarkedLogs.size
        };
    }, [logs, uniqueUsers, bookmarkedLogs]);

    const actionCategories = [
        { key: 'CREATED', label: 'Créations', icon: CheckCircle, color: 'emerald' },
        { key: 'UPDATED', label: 'Modifications', icon: Edit3, color: 'blue' },
        { key: 'DELETED', label: 'Suppressions', icon: XCircle, color: 'red' },
        { key: 'SALE', label: 'Ventes', icon: ShoppingCart, color: 'indigo' },
        { key: 'DEBT', label: 'Remboursements', icon: DollarSign, color: 'purple' }
    ];

    const toggleFilter = (type, value) => {
        setSelectedFilters(prev => {
            const current = prev[type];
            const newValue = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [type]: newValue };
        });
    };

    const clearAllFilters = () => {
        setSelectedFilters({ period: 'all', actions: [], users: [] });
        setSearchTerm('');
        setShowOnlyBookmarked(false);
    };

    const toggleBookmark = (logId) => {
        setBookmarkedLogs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const getActionIcon = (action) => {
        if (action.includes('SALE')) return ShoppingCart;
        if (action.includes('PRODUCT')) return Package;
        if (action.includes('CUSTOMER')) return Users;
        if (action.includes('EXPENSE')) return DollarSign;
        if (action.includes('CREATED')) return CheckCircle;
        if (action.includes('UPDATED')) return Edit3;
        if (action.includes('DELETED')) return Trash2;
        return Activity;
    };

    const getActionColor = (action) => {
        if (action.includes('CREATED')) return 'emerald';
        if (action.includes('UPDATED')) return 'blue';
        if (action.includes('DELETED')) return 'red';
        if (action.includes('SALE')) return 'indigo';
        if (action.includes('DEBT')) return 'purple';
        return 'slate';
    };

    const formatActionName = (action) => {
        const names = {
            'PRODUCT_CREATED': 'Produit créé',
            'PRODUCT_UPDATED': 'Produit modifié',
            'PRODUCT_DELETED': 'Produit supprimé',
            'CUSTOMER_CREATED': 'Client créé',
            'CUSTOMER_UPDATED': 'Client modifié',
            'CUSTOMER_DELETED': 'Client supprimé',
            'SALE_CREATED': 'Vente enregistrée',
            'EXPENSE_CREATED': 'Dépense créée',
            'EXPENSE_UPDATED': 'Dépense modifiée',
            'INGREDIENT_CREATED': 'Ingrédient créé',
            'INGREDIENT_UPDATED': 'Ingrédient modifié',
            'INGREDIENT_DELETED': 'Ingrédient supprimé',
            'DEBT_REPAID': 'Dette remboursée'
        };
        return names[action] || action;
    };

    const isRecent = (log) => {
        if (!log.timestamp || !highlightRecent) return false;
        const minutesAgo = differenceInMinutes(new Date(), log.timestamp.toDate());
        return minutesAgo <= 5; // Last 5 minutes
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Heure', 'Utilisateur', 'Rôle', 'Action', 'Détails'];
        const rows = filteredLogs.map(log => [
            log.timestamp ? format(log.timestamp.toDate(), 'dd/MM/yyyy') : '',
            log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : '',
            log.userName || '',
            log.userRole || '',
            formatActionName(log.action || ''),
            log.details || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `activites-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
        link.click();
    };

    const exportToJSON = () => {
        const data = filteredLogs.map(log => ({
            date: log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : null,
            user: log.userName,
            role: log.userRole,
            action: log.action,
            details: log.details,
            metadata: log.metadata
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `activites-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
        link.click();
    };

    const activeFiltersCount = selectedFilters.actions.length + selectedFilters.users.length +
        (selectedFilters.period !== 'all' ? 1 : 0) + (showOnlyBookmarked ? 1 : 0);

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Activity size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800">Journal d'Activité</h1>
                                <p className="text-xs text-slate-500">
                                    {autoRefresh ? '🔴 Temps réel' : '⏸️ Pause'} • {filteredLogs.length} activité{filteredLogs.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Mode */}
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('timeline')}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'timeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                                    }`}
                            >
                                Timeline
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'compact' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                                    }`}
                            >
                                Compact
                            </button>
                        </div>

                        {/* Controls */}
                        <button
                            onClick={() => setShowStatsPanel(!showStatsPanel)}
                            className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {showStatsPanel ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        {/* Export Menu */}
                        <div className="relative group">
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium">
                                <Download size={16} />
                                <span className="hidden sm:inline">Exporter</span>
                                <ChevronDown size={14} />
                            </button>
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                    onClick={exportToCSV}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-t-lg"
                                >
                                    <FileText size={14} />
                                    CSV
                                </button>
                                <button
                                    onClick={exportToJSON}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-b-lg"
                                >
                                    <FileText size={14} />
                                    JSON
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Panel */}
            {showStatsPanel && (
                <div className="bg-white border-b border-slate-200 px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                            <p className="text-xs text-indigo-600 font-medium mb-1">Aujourd'hui</p>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold text-indigo-700">{stats.today}</p>
                                {stats.trend !== 0 && (
                                    <span className={`text-xs font-semibold ${stats.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {stats.trend > 0 ? '+' : ''}{stats.trend}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                            <p className="text-xs text-purple-600 font-medium mb-1">7 jours</p>
                            <p className="text-2xl font-bold text-purple-700">{stats.week}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <p className="text-xs text-emerald-600 font-medium mb-1">Créations</p>
                            <p className="text-2xl font-bold text-emerald-700">{stats.creations}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-blue-600 font-medium mb-1">Modifications</p>
                            <p className="text-2xl font-bold text-blue-700">{stats.modifications}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                            <p className="text-xs text-red-600 font-medium mb-1">Suppressions</p>
                            <p className="text-2xl font-bold text-red-700">{stats.suppressions}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                            <p className="text-xs text-indigo-600 font-medium mb-1">Ventes</p>
                            <p className="text-2xl font-bold text-indigo-700">{stats.ventes}</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-amber-600 font-medium mb-1">Heure pointe</p>
                            <p className="text-lg font-bold text-amber-700">{stats.peakHour}h</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 font-medium mb-1">Utilisateurs</p>
                            <p className="text-2xl font-bold text-slate-700">{stats.users}</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                            <p className="text-xs text-yellow-600 font-medium mb-1 flex items-center gap-1">
                                <Star size={12} />
                                Favoris
                            </p>
                            <p className="text-2xl font-bold text-yellow-700">{stats.bookmarked}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3">
                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par utilisateur, action ou détails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    {/* Filter Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                            <Filter size={14} />
                            <span>Filtres:</span>
                        </div>

                        {/* Period */}
                        <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-slate-500" />
                            {['all', 'today', 'week', 'month'].map(period => (
                                <button
                                    key={period}
                                    onClick={() => setSelectedFilters(prev => ({ ...prev, period }))}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${selectedFilters.period === period
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {period === 'all' ? 'Tout' : period === 'today' ? 'Aujourd\'hui' : period === 'week' ? 'Semaine' : 'Mois'}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-6 bg-slate-200"></div>

                        {/* Action Types */}
                        {actionCategories.map(cat => {
                            const Icon = cat.icon;
                            const isActive = selectedFilters.actions.includes(cat.key);
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => toggleFilter('actions', cat.key)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${isActive
                                            ? `bg-${cat.color}-600 text-white`
                                            : `bg-${cat.color}-50 text-${cat.color}-600 hover:bg-${cat.color}-100`
                                        }`}
                                >
                                    <Icon size={12} />
                                    {cat.label}
                                </button>
                            );
                        })}

                        <div className="w-px h-6 bg-slate-200"></div>

                        {/* Bookmarked Filter */}
                        <button
                            onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${showOnlyBookmarked
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                }`}
                        >
                            <Star size={12} />
                            Favoris
                        </button>

                        {/* Sort */}
                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium hover:bg-slate-200 transition-colors flex items-center gap-1"
                        >
                            {sortOrder === 'desc' ? <SortDesc size={12} /> : <SortAsc size={12} />}
                            {sortOrder === 'desc' ? 'Récent' : 'Ancien'}
                        </button>

                        {/* Highlight Recent */}
                        <button
                            onClick={() => setHighlightRecent(!highlightRecent)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${highlightRecent
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                }`}
                        >
                            <Zap size={12} />
                            Nouveau
                        </button>

                        {/* Clear Filters */}
                        {activeFiltersCount > 0 && (
                            <>
                                <div className="w-px h-6 bg-slate-200"></div>
                                <button
                                    onClick={clearAllFilters}
                                    className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors"
                                >
                                    Effacer ({activeFiltersCount})
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <RefreshCw className="animate-spin text-indigo-600 mb-3" size={32} />
                        <p className="text-slate-500">Chargement...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20">
                        <Activity size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium">Aucune activité trouvée</p>
                        <p className="text-slate-400 text-sm mt-1">Essayez de modifier vos filtres</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto space-y-6">
                        {Object.entries(groupedLogs).map(([dateKey, dayLogs]) => (
                            <div key={dateKey}>
                                {/* Date Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <h2 className="text-sm font-bold text-slate-700 uppercase">
                                        {format(parseISO(dateKey), 'EEEE dd MMMM yyyy', { locale: fr })}
                                    </h2>
                                    <div className="flex-1 h-px bg-slate-200"></div>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {dayLogs.length} activité{dayLogs.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Logs */}
                                <div className={viewMode === 'compact' ? 'space-y-1' : 'space-y-2'}>
                                    {dayLogs.map(log => {
                                        const Icon = getActionIcon(log.action);
                                        const color = getActionColor(log.action);
                                        const isExpanded = expandedLog === log.id;
                                        const isBookmarked = bookmarkedLogs.has(log.id);
                                        const recent = isRecent(log);

                                        return (
                                            <div
                                                key={log.id}
                                                className={`bg-white rounded-lg border transition-all ${recent ? 'border-orange-300 shadow-md shadow-orange-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className={viewMode === 'compact' ? 'p-3' : 'p-4'}>
                                                    <div className="flex items-start gap-3">
                                                        {/* Icon */}
                                                        <div className={`${viewMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-${color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                            <Icon className={`text-${color}-600`} size={viewMode === 'compact' ? 16 : 20} />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={`inline-block px-2 py-0.5 bg-${color}-50 text-${color}-700 rounded text-xs font-semibold`}>
                                                                            {formatActionName(log.action)}
                                                                        </span>
                                                                        {recent && (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-semibold">
                                                                                <Zap size={10} />
                                                                                Nouveau
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className={`${viewMode === 'compact' ? 'text-xs' : 'text-sm'} text-slate-700 font-medium`}>{log.details}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                        <Clock size={12} />
                                                                        {log.timestamp && format(log.timestamp.toDate(), 'HH:mm')}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => toggleBookmark(log.id)}
                                                                        className={`p-1 hover:bg-slate-100 rounded transition-colors ${isBookmarked ? 'text-yellow-500' : 'text-slate-400'
                                                                            }`}
                                                                    >
                                                                        {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                                                                    </button>
                                                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                                        <button
                                                                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                                                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                                                                        >
                                                                            <MoreVertical size={14} className="text-slate-400" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* User */}
                                                            {viewMode === 'timeline' && (
                                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                    <span className="font-medium">{log.userName}</span>
                                                                    <span>•</span>
                                                                    <span className="uppercase">{log.userRole}</span>
                                                                </div>
                                                            )}

                                                            {/* Metadata */}
                                                            {isExpanded && log.metadata && (
                                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                                    <p className="text-xs font-semibold text-slate-500 mb-2">Détails techniques</p>
                                                                    <div className="bg-slate-50 rounded p-2 space-y-1">
                                                                        {Object.entries(log.metadata).map(([key, value]) => (
                                                                            <div key={key} className="flex items-center gap-2 text-xs">
                                                                                <span className="text-slate-500">{key}:</span>
                                                                                <span className="text-slate-700 font-mono">{String(value)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogView;
