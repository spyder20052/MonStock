import { addDoc, collection, serverTimestamp, updateDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { differenceInHours } from 'date-fns';

/**
 * Détermine si une suppression nécessite l'approbation d'un admin
 * 
 * @param {Object} item - L'élément à supprimer
 * @param {Object} user - L'utilisateur actuel { uid, role, ... }
 * @param {string} type - Type d'élément: 'PRODUCT' | 'CUSTOMER' | 'SALE' | 'INGREDIENT'
 * @param {Object} additionalData - Données additionnelles (ex: sales history pour customer)
 * @returns {Object} { required: boolean, reasons: string[] }
 */
export const requiresApproval = (item, user, type, additionalData = {}) => {
    const reasons = [];

    // Admin/propriétaire peut tout supprimer directement
    if (user.role === 'admin' || user.role === 'owner') {
        return { required: false, reasons: [] };
    }

    // Vérifier si l'élément est ancien (> 36h)
    if (item.createdAt || item.updatedAt) {
        const itemDate = (item.updatedAt || item.createdAt).toDate();
        const hoursSinceModification = differenceInHours(new Date(), itemDate);

        if (hoursSinceModification > 36) {
            reasons.push('ITEM_OLD');
        }
    }

    // Vérifier si l'utilisateur est le créateur
    if (item.createdBy && item.createdBy !== user.uid) {
        reasons.push('NOT_CREATOR');
    }

    // Règles spécifiques par type
    switch (type) {
        case 'PRODUCT':
            // Stock important
            if (item.stock && item.stock > 20) {
                reasons.push('HIGH_STOCK');
            }
            // Valeur importante
            if (item.price && item.stock && (item.price * item.stock) > 100000) {
                reasons.push('HIGH_VALUE');
            }
            break;

        case 'CUSTOMER':
            // Historique d'achats important
            if (additionalData.purchaseCount && additionalData.purchaseCount > 5) {
                reasons.push('CUSTOMER_HISTORY');
            }
            // Dette en cours
            if (item.debt && item.debt > 0) {
                reasons.push('CUSTOMER_DEBT');
            }
            // Montant total dépensé important
            if (item.totalSpent && item.totalSpent > 100000) {
                reasons.push('HIGH_VALUE_CUSTOMER');
            }
            break;

        case 'SALE':
            // Vente importante
            if (item.total && item.total > 50000) {
                reasons.push('HIGH_VALUE_SALE');
            }
            // Vente avec dette non remboursée
            if (item.amountPaid < item.total) {
                reasons.push('UNPAID_DEBT');
            }
            break;

        case 'INGREDIENT':
            // Stock important
            if (item.stock && item.minStock && item.stock > item.minStock * 10) {
                reasons.push('HIGH_STOCK');
            }
            // Valeur importante
            if (additionalData.estimatedValue && additionalData.estimatedValue > 100000) {
                reasons.push('HIGH_VALUE');
            }
            break;
    }

    // Utilisateur avec rôle limité (vendeur, comptable)
    if (user.role === 'vendeur' || user.role === 'comptable') {
        if (reasons.length === 0) {
            // Même sans autres raisons, certains rôles nécessitent approbation
            reasons.push('LIMITED_ROLE');
        }
    }

    return {
        required: reasons.length > 0,
        reasons
    };
};

/**
 * Crée une demande de suppression en attente d'approbation
 * Vérifie d'abord si une demande pending existe déjà pour cet élément
 * 
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {Object} item - L'élément à supprimer
 * @param {Object} user - L'utilisateur qui demande la suppression
 * @param {string} type - Type d'élément
 * @param {string[]} reasons - Raisons de l'approbation requise
 * @returns {Promise<string>} ID de la demande créée ou existante
 */
export const createDeletionRequest = async (db, workspaceId, item, user, type, reasons) => {
    // Vérifier si une demande pending existe déjà pour cet élément
    const { query: firestoreQuery, where, getDocs } = await import('firebase/firestore');

    const existingRequestsQuery = firestoreQuery(
        collection(db, 'users', workspaceId, 'pendingDeletions'),
        where('itemId', '==', item.id),
        where('type', '==', type),
        where('status', '==', 'pending')
    );

    const existingRequests = await getDocs(existingRequestsQuery);

    // Si une demande pending existe déjà, retourner son ID
    if (!existingRequests.empty) {
        return existingRequests.docs[0].id;
    }

    // Créer une nouvelle demande
    const request = {
        type,
        itemId: item.id,
        itemData: {
            ...item,
            // Convertir les timestamps en ISO strings pour le stockage
            createdAt: item.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: item.updatedAt?.toDate?.()?.toISOString() || null
        },
        requestedBy: {
            userId: user.uid,
            userName: user.displayName || user.email,
            userRole: user.role
        },
        status: 'pending',
        approvalReasons: reasons,
        createdAt: serverTimestamp(),
        processedAt: null,
        processedBy: null,
        reason: null,
        metadata: {}
    };

    const docRef = await addDoc(
        collection(db, 'users', workspaceId, 'pendingDeletions'),
        request
    );

    return docRef.id;
};

/**
 * Approuve une demande de suppression et supprime l'élément
 * 
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {string} requestId - ID de la demande
 * @param {Object} adminUser - L'admin qui approuve
 * @param {Function} deletionCallback - Fonction qui effectue la suppression réelle
 * @returns {Promise<void>}
 */
export const approveDeletion = async (db, workspaceId, requestId, adminUser, deletionCallback) => {
    // Mettre à jour le statut de la demande
    const requestRef = doc(db, 'users', workspaceId, 'pendingDeletions', requestId);
    await updateDoc(requestRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: adminUser.uid
    });

    // Exécuter la suppression via le callback
    await deletionCallback();

    // Optionnel: supprimer la demande après traitement
    // await deleteDoc(requestRef);
};

/**
 * Rejette une demande de suppression
 * 
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {string} requestId - ID de la demande
 * @param {Object} adminUser - L'admin qui rejette
 * @param {string} reason - Raison du rejet
 * @returns {Promise<void>}
 */
export const rejectDeletion = async (db, workspaceId, requestId, adminUser, reason) => {
    const requestRef = doc(db, 'users', workspaceId, 'pendingDeletions', requestId);
    await updateDoc(requestRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: adminUser.uid,
        reason: reason || 'Rejeté par l\'administrateur'
    });
};

/**
 * Vérifie si un utilisateur peut supprimer un élément directement
 * 
 * @param {Object} user - L'utilisateur
 * @returns {boolean}
 */
export const canDeleteDirectly = (user) => {
    return user.role === 'admin' || user.role === 'owner';
};

/**
 * Traduit les raisons d'approbation en français lisible
 * 
 * @param {string[]} reasons - Liste des raisons
 * @returns {string[]}
 */
export const translateReasons = (reasons) => {
    const translations = {
        'ITEM_OLD': 'Élément créé ou modifié il y a plus de 36 heures',
        'NOT_CREATOR': 'Vous n\'êtes pas le créateur de cet élément',
        'HIGH_STOCK': 'Stock important (> 20 unités)',
        'HIGH_VALUE': 'Valeur importante (> 100 000 FCFA)',
        'CUSTOMER_HISTORY': 'Client avec historique important (> 5 achats)',
        'CUSTOMER_DEBT': 'Client avec dette en cours',
        'HIGH_VALUE_CUSTOMER': 'Client à forte valeur (> 100 000 FCFA dépensés)',
        'HIGH_VALUE_SALE': 'Vente importante (> 50 000 FCFA)',
        'UNPAID_DEBT': 'Vente avec dette non remboursée',
        'LIMITED_ROLE': 'Votre rôle nécessite une approbation admin'
    };

    return reasons.map(r => translations[r] || r);
};

/**
 * Obtient le libellé d'un type d'élément
 * 
 * @param {string} type - Type d'élément
 * @returns {string}
 */
export const getTypeLabel = (type) => {
    const labels = {
        'PRODUCT': 'Produit',
        'CUSTOMER': 'Client',
        'SALE': 'Vente',
        'INGREDIENT': 'Ingrédient'
    };
    return labels[type] || type;
};
