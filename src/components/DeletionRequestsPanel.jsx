import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, CheckCircle, XCircle, Clock, Package, Users, ShoppingCart, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTypeLabel, translateReasons } from '../utils/approvalHelpers';

const DeletionRequestsPanel = ({ user, workspaceId, isOpen, onClose }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !workspaceId) return;

        const q = query(
            collection(db, 'users', workspaceId, 'pendingDeletions'),
            where('requestedBy.userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            fetchedRequests.sort((a, b) => {
                if (!a.createdAt || !b.createdAt) return 0;
                return b.createdAt.toMillis() - a.createdAt.toMillis();
            });

            setRequests(fetchedRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, workspaceId]);

    const getTypeIcon = (type) => {
        const icons = {
            'PRODUCT': Package,
            'CUSTOMER': Users,
            'SALE': ShoppingCart,
            'INGREDIENT': Package
        };
        return icons[type] || Package;
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { icon: Clock, color: 'amber', label: 'En attente' };
            case 'approved':
                return { icon: CheckCircle, color: 'emerald', label: 'Approuvée' };
            case 'rejected':
                return { icon: XCircle, color: 'red', label: 'Refusée' };
            default:
                return { icon: AlertTriangle, color: 'slate', label: 'Inconnu' };
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Slide-out Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Mes demandes</h2>
                            <p className="text-xs text-slate-500">
                                {requests.filter(r => r.status === 'pending').length} en attente
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-slate-400">Chargement...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertTriangle size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-400 font-medium">Aucune demande</p>
                            <p className="text-slate-400 text-sm mt-1">
                                Vos demandes de suppression apparaîtront ici
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(request => {
                                const TypeIcon = getTypeIcon(request.type);
                                const statusInfo = getStatusInfo(request.status);
                                const StatusIcon = statusInfo.icon;

                                return (
                                    <div
                                        key={request.id}
                                        className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 bg-${statusInfo.color}-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-${statusInfo.color}-100`}>
                                                <TypeIcon className={`text-${statusInfo.color}-600`} size={20} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className={`px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700 border border-slate-200`}>
                                                        {getTypeLabel(request.type)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 bg-${statusInfo.color}-50 rounded text-xs font-semibold text-${statusInfo.color}-700 border border-${statusInfo.color}-100 flex items-center gap-1`}>
                                                        <StatusIcon size={12} />
                                                        {statusInfo.label}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-slate-800 mb-1 text-sm">
                                                    {request.itemData?.name || 'Sans nom'}
                                                </h4>

                                                <p className="text-xs text-slate-500 mb-2">
                                                    {request.createdAt && format(request.createdAt.toDate(), 'dd MMM à HH:mm', { locale: fr })}
                                                </p>

                                                {request.status === 'pending' && (
                                                    <div className="bg-amber-50 rounded-lg p-2 mt-2 border border-amber-100">
                                                        <p className="text-xs font-medium text-amber-800 mb-1">
                                                            Raisons :
                                                        </p>
                                                        <ul className="text-xs text-amber-700 space-y-0.5">
                                                            {translateReasons(request.approvalReasons || []).slice(0, 2).map((reason, idx) => (
                                                                <li key={idx} className="flex items-start gap-1">
                                                                    <span className="text-amber-500">•</span>
                                                                    <span>{reason}</span>
                                                                </li>
                                                            ))}
                                                            {request.approvalReasons?.length > 2 && (
                                                                <li className="text-slate-400">
                                                                    +{request.approvalReasons.length - 2} autre{request.approvalReasons.length - 2 > 1 ? 's' : ''}
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                                {request.status === 'approved' && (
                                                    <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 mt-2 border border-emerald-100">
                                                        ✓ Votre demande a été approuvée. L'élément a été supprimé.
                                                    </p>
                                                )}

                                                {request.status === 'rejected' && (
                                                    <div className="bg-red-50 rounded-lg p-2 mt-2 border border-red-100">
                                                        <p className="text-xs font-medium text-red-700 mb-1">
                                                            ✗ Demande refusée
                                                        </p>
                                                        {request.reason && (
                                                            <p className="text-xs text-slate-600">
                                                                {request.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {requests.filter(r => r.status === 'pending').length > 0 && (
                    <div className="border-t border-slate-200 p-4 bg-white">
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-amber-700 flex items-center gap-2">
                                <Clock size={14} />
                                <span>
                                    <strong>{requests.filter(r => r.status === 'pending').length}</strong> demande{requests.filter(r => r.status === 'pending').length > 1 ? 's' : ''} en attente d'approbation admin
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default DeletionRequestsPanel;
