import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    ArrowLeft, Clock, CheckCircle, XCircle, Package, Users, ShoppingCart,
    AlertTriangle, Eye, Filter, Search, RefreshCw, FileText, Calendar, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { approveDeletion, rejectDeletion, translateReasons, getTypeLabel } from '../../utils/approvalHelpers';
import { deleteDoc } from 'firebase/firestore';

const PendingApprovalsView = ({ userProfile, workspaceId, user, deleteProduct, deleteCustomer, deleteIngredient, showNotification }) => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!workspaceId) return;

        let q;
        if (filter === 'all') {
            q = query(
                collection(db, 'users', workspaceId, 'pendingDeletions'),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'users', workspaceId, 'pendingDeletions'),
                where('status', '==', filter)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (filter !== 'all') {
                fetchedRequests.sort((a, b) => {
                    if (!a.createdAt || !b.createdAt) return 0;
                    return b.createdAt.toMillis() - a.createdAt.toMillis();
                });
            }

            setRequests(fetchedRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching deletion requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [workspaceId, filter]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                (req.itemData?.name && req.itemData.name.toLowerCase().includes(searchLower)) ||
                (req.requestedBy?.userName && req.requestedBy.userName.toLowerCase().includes(searchLower)) ||
                (req.type && req.type.toLowerCase().includes(searchLower))
            );
        });
    }, [requests, searchTerm]);

    const stats = useMemo(() => {
        return {
            pending: requests.filter(r => r.status === 'pending').length,
            approved: requests.filter(r => r.status === 'approved').length,
            rejected: requests.filter(r => r.status === 'rejected').length,
            total: requests.length
        };
    }, [requests]);

    const handleApprove = async (request) => {
        setProcessing(true);
        try {
            const deletionCallback = async () => {
                const itemRef = doc(db, 'users', workspaceId, getCollectionName(request.type), request.itemId);
                await deleteDoc(itemRef);
            };

            await approveDeletion(db, workspaceId, request.id, user, deletionCallback);
            showNotification(`Suppression approuvée : ${request.itemData?.name || 'Élément'}`, 'success');
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error approving deletion:', error);
            showNotification('Erreur lors de l\'approbation', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (request, reason) => {
        setProcessing(true);
        try {
            await rejectDeletion(db, workspaceId, request.id, user, reason);
            showNotification(`Suppression refusée : ${request.itemData?.name || 'Élément'}`, 'success');
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error rejecting deletion:', error);
            showNotification('Erreur lors du refus', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const getCollectionName = (type) => {
        const collections = {
            'PRODUCT': 'products',
            'CUSTOMER': 'customers',
            'SALE': 'sales',
            'INGREDIENT': 'ingredients'
        };
        return collections[type] || 'unknown';
    };

    const getTypeIcon = (type) => {
        const icons = {
            'PRODUCT': Package,
            'CUSTOMER': Users,
            'SALE': ShoppingCart,
            'INGREDIENT': Package
        };
        return icons[type] || FileText;
    };

    const getTypeColor = (type) => {
        const colors = {
            'PRODUCT': 'indigo',
            'CUSTOMER': 'purple',
            'SALE': 'emerald',
            'INGREDIENT': 'amber'
        };
        return colors[type] || 'slate';
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'amber',
            'approved': 'emerald',
            'rejected': 'red'
        };
        return colors[status] || 'slate';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">Demandes de Suppression</h1>
                                <p className="text-xs text-slate-500">
                                    {stats.pending} demande{stats.pending > 1 ? 's' : ''} en attente
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-6xl mx-auto space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 font-medium mb-1">En attente</p>
                            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 font-medium mb-1">Approuvées</p>
                            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 font-medium mb-1">Refusées</p>
                            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 font-medium mb-1">Total</p>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, utilisateur ou type..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter size={14} className="text-slate-500" />
                                {['pending', 'approved', 'rejected', 'all'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilter(status)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === status
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {status === 'pending' ? 'En attente' :
                                            status === 'approved' ? 'Approuvées' :
                                                status === 'rejected' ? 'Refusées' : 'Toutes'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Requests List */}
                    {loading ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-3" size={32} />
                            <p className="text-slate-500">Chargement...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <AlertTriangle size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-400 font-medium">Aucune demande trouvée</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRequests.map(request => {
                                const Icon = getTypeIcon(request.type);
                                const color = getTypeColor(request.type);
                                const statusColor = getStatusColor(request.status);

                                return (
                                    <div
                                        key={request.id}
                                        className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all overflow-hidden"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start gap-3">
                                                {/* Icon */}
                                                <div className={`w-12 h-12 bg-${color}-50 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`text-${color}-600`} size={24} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={`px-2 py-0.5 bg-${color}-50 text-${color}-700 rounded text-xs font-semibold border border-${color}-100`}>
                                                                    {getTypeLabel(request.type)}
                                                                </span>
                                                                <span className={`px-2 py-0.5 bg-${statusColor}-50 text-${statusColor}-700 rounded text-xs font-semibold border border-${statusColor}-100`}>
                                                                    {request.status === 'pending' ? 'En attente' :
                                                                        request.status === 'approved' ? 'Approuvée' : 'Refusée'}
                                                                </span>
                                                            </div>
                                                            <h3 className="font-bold text-slate-800 mb-1">{request.itemData?.name || 'Sans nom'}</h3>
                                                            <p className="text-sm text-slate-600">
                                                                Demandé par : <span className="font-medium">{request.requestedBy?.userName}</span>
                                                                <span className="text-slate-400 mx-2">•</span>
                                                                <span className="uppercase text-xs">{request.requestedBy?.userRole}</span>
                                                            </p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                                <Clock size={12} />
                                                                {request.createdAt && format(request.createdAt.toDate(), 'dd MMM HH:mm', { locale: fr })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reasons */}
                                                    <div className="bg-amber-50 rounded-lg p-3 mb-3 border border-amber-100">
                                                        <p className="text-xs font-semibold text-amber-800 mb-2">Raisons requérant l'approbation :</p>
                                                        <ul className="space-y-1">
                                                            {translateReasons(request.approvalReasons || []).map((reason, idx) => (
                                                                <li key={idx} className="text-xs text-amber-700 flex items-start gap-2">
                                                                    <span className="text-amber-500 mt-0.5">•</span>
                                                                    <span>{reason}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Actions */}
                                                    {request.status === 'pending' && (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                onClick={() => setSelectedRequest(request)}
                                                                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye size={14} />
                                                                Détails
                                                            </button>
                                                            <button
                                                                onClick={() => handleApprove(request)}
                                                                disabled={processing}
                                                                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                <CheckCircle size={14} />
                                                                Approuver
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(request, 'Refusé par l\'administrateur')}
                                                                disabled={processing}
                                                                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                <XCircle size={14} />
                                                                Refuser
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Processed Info */}
                                                    {request.status !== 'pending' && request.processedAt && (
                                                        <div className="text-xs text-slate-500 mt-2">
                                                            {request.status === 'approved' ? 'Approuvée' : 'Refusée'} le{' '}
                                                            {format(request.processedAt.toDate(), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                                            {request.reason && ` - ${request.reason}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center sticky top-0">
                            <h3 className="font-bold text-lg">Détails de la demande</h3>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Item Info */}
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-2">Élément à supprimer</p>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <p className="font-bold text-slate-800 mb-2">{selectedRequest.itemData?.name}</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {Object.entries(selectedRequest.itemData || {})
                                            .filter(([key]) => !['id', 'name', 'createdAt', 'updatedAt'].includes(key))
                                            .slice(0, 6)
                                            .map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                    <span className="text-slate-500">{key}:</span>
                                                    <span className="text-slate-700 font-medium">{String(value)}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Requester */}
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-2">Demandé par</p>
                                <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3 border border-slate-200">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {(selectedRequest.requestedBy?.userName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{selectedRequest.requestedBy?.userName}</p>
                                        <p className="text-xs text-slate-500 uppercase">{selectedRequest.requestedBy?.userRole}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Reasons */}
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-2">Raisons de l'approbation</p>
                                <ul className="space-y-2">
                                    {translateReasons(selectedRequest.approvalReasons || []).map((reason, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Actions */}
                            {selectedRequest.status === 'pending' && (
                                <div className="flex items-center gap-3 pt-4 border-t">
                                    <button
                                        onClick={() => handleApprove(selectedRequest)}
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <CheckCircle size={18} />
                                        Approuver la suppression
                                    </button>
                                    <button
                                        onClick={() => handleReject(selectedRequest, 'Refusé après examen détaillé')}
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle size={18} />
                                        Refuser
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingApprovalsView;
