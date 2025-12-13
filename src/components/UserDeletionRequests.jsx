import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, CheckCircle, XCircle, Clock, Package, Users, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTypeLabel, translateReasons } from '../utils/approvalHelpers';

const UserDeletionRequests = ({ user, workspaceId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !workspaceId) return;

        // Récupérer toutes les demandes de l'utilisateur (pending, approved, rejected)
        const q = query(
            collection(db, 'users', workspaceId, 'pendingDeletions'),
            where('requestedBy.userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Tri par date (plus récent en premier)
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
                return {
                    icon: Clock,
                    color: 'amber',
                    label: 'En attente',
                    bgColor: 'bg-amber-50',
                    textColor: 'text-amber-700',
                    borderColor: 'border-amber-200'
                };
            case 'approved':
                return {
                    icon: CheckCircle,
                    color: 'emerald',
                    label: 'Approuvée',
                    bgColor: 'bg-emerald-50',
                    textColor: 'text-emerald-700',
                    borderColor: 'border-emerald-200'
                };
            case 'rejected':
                return {
                    icon: XCircle,
                    color: 'red',
                    label: 'Refusée',
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-700',
                    borderColor: 'border-red-200'
                };
            default:
                return {
                    icon: AlertTriangle,
                    color: 'slate',
                    label: 'Inconnu',
                    bgColor: 'bg-slate-50',
                    textColor: 'text-slate-700',
                    borderColor: 'border-slate-200'
                };
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-slate-400" />
                    Mes demandes de suppression
                </h3>
                <p className="text-sm text-slate-400">Chargement...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return null; // Ne rien afficher si aucune demande
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Mes demandes de suppression
            </h3>

            <div className="space-y-3">
                {requests.map(request => {
                    const TypeIcon = getTypeIcon(request.type);
                    const statusInfo = getStatusInfo(request.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                        <div
                            key={request.id}
                            className={`${statusInfo.bgColor} rounded-lg p-4 border ${statusInfo.borderColor}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border ${statusInfo.borderColor}`}>
                                    <TypeIcon className={statusInfo.textColor} size={20} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 bg-white rounded text-xs font-semibold ${statusInfo.textColor} border ${statusInfo.borderColor}`}>
                                            {getTypeLabel(request.type)}
                                        </span>
                                        <span className={`px-2 py-0.5 bg-white rounded text-xs font-semibold ${statusInfo.textColor} border ${statusInfo.borderColor} flex items-center gap-1`}>
                                            <StatusIcon size={12} />
                                            {statusInfo.label}
                                        </span>
                                    </div>

                                    <h4 className={`font-bold ${statusInfo.textColor} mb-1`}>
                                        {request.itemData?.name || 'Sans nom'}
                                    </h4>

                                    <p className="text-xs text-slate-600 mb-2">
                                        Demandé le {request.createdAt && format(request.createdAt.toDate(), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                    </p>

                                    {request.status === 'pending' && (
                                        <div className="bg-white/60 rounded p-2 mt-2">
                                            <p className="text-xs font-medium text-slate-600 mb-1">
                                                En attente d'approbation pour :
                                            </p>
                                            <ul className="text-xs text-slate-600 space-y-0.5">
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
                                        <p className="text-xs text-emerald-600 bg-white/60 rounded p-2 mt-2">
                                            ✓ Votre demande a été approuvée. L'élément a été supprimé.
                                        </p>
                                    )}

                                    {request.status === 'rejected' && (
                                        <div className="bg-white/60 rounded p-2 mt-2">
                                            <p className="text-xs font-medium text-red-600 mb-1">
                                                ✗ Demande refusée par l'administrateur
                                            </p>
                                            {request.reason && (
                                                <p className="text-xs text-slate-600">
                                                    Raison : {request.reason}
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

            {requests.filter(r => r.status === 'pending').length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 flex items-center gap-2">
                        <Clock size={14} />
                        <span>
                            Vous avez <strong>{requests.filter(r => r.status === 'pending').length}</strong> demande{requests.filter(r => r.status === 'pending').length > 1 ? 's' : ''} en attente d'approbation
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default UserDeletionRequests;
