import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, Clock, User, Shield, Activity, Search, RefreshCw, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityLogView = ({ userProfile, workspaceId }) => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');

    useEffect(() => {
        if (!workspaceId) return;

        // Base query
        const q = query(
            collection(db, 'users', workspaceId, 'logs'),
            orderBy('timestamp', 'desc'),
            limit(100) // Limit to last 100 for performance
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

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter = filterAction === 'ALL' || log.action === filterAction;

        return matchesSearch && matchesFilter;
    });

    const getActionColor = (action) => {
        if (action.includes('CREATED')) return 'text-emerald-600 bg-emerald-50';
        if (action.includes('UPDATED')) return 'text-blue-600 bg-blue-50';
        if (action.includes('DELETED')) return 'text-red-600 bg-red-50';
        if (action.includes('SALE')) return 'text-indigo-600 bg-indigo-50';
        return 'text-slate-600 bg-slate-50';
    };

    const formatActionName = (action) => {
        return action.replace(/_/g, ' ');
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Activity size={20} className="text-slate-800" />
                        <h1 className="text-xl font-bold text-slate-800">Journal d'Activité</h1>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-white border-b border-slate-200 sticky top-[60px] z-[5]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par utilisateur ou détails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <RefreshCw className="animate-spin mb-2" size={24} />
                            <p>Chargement des logs...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <p>Aucune activité enregistrée.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Horodatage</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Utilisateur</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Action</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Détails</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} />
                                                    {log.timestamp ? format(log.timestamp.toDate(), 'dd MMM HH:mm', { locale: fr }) : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {(log.userName || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700">{log.userName}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase">{log.userRole}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-bold tracking-wide ${getActionColor(log.action)}`}>
                                                    {formatActionName(log.action)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogView;
