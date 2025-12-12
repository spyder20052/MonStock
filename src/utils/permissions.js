export const PERMISSIONS = {
    // Dashboard & Vue Globale
    VIEW_DASHBOARD: 'VIEW_DASHBOARD',

    // Finance (Sensible)
    VIEW_FINANCIAL_ANALYTICS: 'VIEW_FINANCIAL_ANALYTICS', // Vues "Bénéfice", "Marges"
    MANAGE_EXPENSES: 'MANAGE_EXPENSES',                   // Ajouter/Modifier dépenses
    VIEW_EXPENSES: 'VIEW_EXPENSES',

    // Gestion d'Équipe (Admin rights)
    MANAGE_TEAM: 'MANAGE_TEAM',         // Créer/Modifier utilisateurs

    // Ventes & POS
    ACCESS_POS: 'ACCESS_POS',           // Accès à la caisse
    MANAGE_SALES: 'MANAGE_SALES',       // Rembourser, Supprimer une vente
    VIEW_SALES_HISTORY: 'VIEW_SALES_HISTORY',

    // Stocks (Produits & Ingrédients)
    VIEW_STOCK: 'VIEW_STOCK',
    MANAGE_STOCK: 'MANAGE_STOCK',       // Créer, Modifier, Supprimer produits/ingrédients
    MANAGE_INVENTORY: 'MANAGE_INVENTORY', // Faire des inventaires (ajustements quantité)

    // Clients
    VIEW_CUSTOMERS: 'VIEW_CUSTOMERS',
    MANAGE_CUSTOMERS: 'MANAGE_CUSTOMERS', // Modifier/Supprimer clients
    MANAGE_CUSTOMER_DEBTS: 'MANAGE_CUSTOMER_DEBTS', // Gérer les dettes/crédits

    // Paramètres
    MANAGE_SETTINGS: 'MANAGE_SETTINGS'
};

export const ROLES = {
    ADMIN: 'admin',
    MANAGER_STOCK: 'manager_stock',
    COMPTABLE: 'comptable',
    MANAGER_VENTES: 'manager_ventes'
};

// Matrice des permissions par défaut
const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS), // Tout

    [ROLES.MANAGER_STOCK]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_STOCK,
        PERMISSIONS.MANAGE_STOCK,
        PERMISSIONS.MANAGE_INVENTORY,
        PERMISSIONS.VIEW_SALES_HISTORY // Pour voir ce qui sort
    ],

    [ROLES.COMPTABLE]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FINANCIAL_ANALYTICS,
        PERMISSIONS.VIEW_EXPENSES,
        PERMISSIONS.MANAGE_EXPENSES,
        PERMISSIONS.VIEW_SALES_HISTORY,
        PERMISSIONS.VIEW_STOCK, // Lecture seule
        PERMISSIONS.VIEW_CUSTOMERS
    ],

    [ROLES.MANAGER_VENTES]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.ACCESS_POS,
        PERMISSIONS.VIEW_SALES_HISTORY,
        PERMISSIONS.MANAGE_SALES, // Peut gérer les retours/remboursements
        PERMISSIONS.VIEW_STOCK,   // Pour voir dispo
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.MANAGE_CUSTOMERS,
        PERMISSIONS.MANAGE_CUSTOMER_DEBTS
    ]
};

// Helpers

/**
 * Vérifie si un utilisateur a une permission spécifique
 * @param {Object} userProfile - Le profil utilisateur chargé depuis Firestore (contient role et customPermissions)
 * @param {string} permission - La permission à vérifier (depuis PERMISSIONS)
 * @returns {boolean}
 */
export const hasPermission = (userProfile, permission) => {
    if (!userProfile) return false;

    // 1. Le propriétaire/Admin a toujours tout les droits
    if (userProfile.role === ROLES.ADMIN) return true;

    // 2. Vérifier les surcharges (Custom Permissions)
    // Si explicitement défini à true ou false dans le profil, ça l'emporte sur le rôle
    if (userProfile.customPermissions && userProfile.customPermissions[permission] !== undefined) {
        return userProfile.customPermissions[permission];
    }

    // 3. Vérifier les droits du rôle de base
    const rolePermissions = ROLE_PERMISSIONS[userProfile.role] || [];
    return rolePermissions.includes(permission);
};

export const getRoleLabel = (role) => {
    switch (role) {
        case ROLES.ADMIN: return 'Administrateur';
        case ROLES.MANAGER_STOCK: return 'Responsable Stock';
        case ROLES.COMPTABLE: return 'Comptable';
        case ROLES.MANAGER_VENTES: return 'Responsable Ventes';
        default: return 'Utilisateur';
    }
};
