export const PERMISSIONS = {
    // Dashboard & Vue Globale
    VIEW_DASHBOARD: 'VIEW_DASHBOARD',

    // Finance (Sensible)
    VIEW_FINANCIAL_ANALYTICS: 'VIEW_FINANCIAL_ANALYTICS',
    MANAGE_EXPENSES: 'MANAGE_EXPENSES',
    VIEW_EXPENSES: 'VIEW_EXPENSES',

    // Gestion d'Équipe (Admin rights)
    MANAGE_TEAM: 'MANAGE_TEAM',

    // Ventes & POS
    ACCESS_POS: 'ACCESS_POS',
    MANAGE_SALES: 'MANAGE_SALES',
    VIEW_SALES_HISTORY: 'VIEW_SALES_HISTORY',

    // Stocks (Produits & Ingrédients)
    VIEW_STOCK: 'VIEW_STOCK',
    MANAGE_STOCK: 'MANAGE_STOCK',
    MANAGE_INVENTORY: 'MANAGE_INVENTORY',

    // Clients
    VIEW_CUSTOMERS: 'VIEW_CUSTOMERS',
    MANAGE_CUSTOMERS: 'MANAGE_CUSTOMERS',
    MANAGE_CUSTOMER_DEBTS: 'MANAGE_CUSTOMER_DEBTS',

    // Messagerie
    VIEW_MESSAGES: 'VIEW_MESSAGES',

    // Paramètres
    MANAGE_SETTINGS: 'MANAGE_SETTINGS'
};

export const PERMISSION_METADATA = {
    [PERMISSIONS.VIEW_DASHBOARD]: {
        label: "Voir le Tableau de Bord",
        description: "Accès à la vue d'ensemble des activités.",
        category: "Général"
    },
    [PERMISSIONS.VIEW_FINANCIAL_ANALYTICS]: {
        label: "Voir les Analyses Financières",
        description: "Accès aux rapports P&L, marges et bénéfices.",
        category: "Finance"
    },
    [PERMISSIONS.MANAGE_EXPENSES]: {
        label: "Gérer les Dépenses",
        description: "Ajouter, modifier ou supprimer des dépenses.",
        category: "Finance"
    },
    [PERMISSIONS.VIEW_EXPENSES]: {
        label: "Voir les Dépenses",
        description: "Consulter l'historique des dépenses.",
        category: "Finance"
    },
    [PERMISSIONS.MANAGE_TEAM]: {
        label: "Gérer l'Équipe",
        description: "Inviter des membres, modifier les rôles et permissions.",
        category: "Administration"
    },
    [PERMISSIONS.ACCESS_POS]: {
        label: "Accès à la Caisse (POS)",
        description: "Enregistrer des ventes et encaisser des clients.",
        category: "Ventes"
    },
    [PERMISSIONS.MANAGE_SALES]: {
        label: "Gérer les Ventes",
        description: "Rembourser ou supprimer des tickets de vente.",
        category: "Ventes"
    },
    [PERMISSIONS.VIEW_SALES_HISTORY]: {
        label: "Voir l'Historique des Ventes",
        description: "Consulter la liste des ventes passées.",
        category: "Ventes"
    },
    [PERMISSIONS.VIEW_STOCK]: {
        label: "Voir le Stock",
        description: "Consulter la liste des produits et ingrédients.",
        category: "Stock"
    },
    [PERMISSIONS.MANAGE_STOCK]: {
        label: "Gérer le Stock",
        description: "Créer, modifier ou supprimer des produits/ingrédients.",
        category: "Stock"
    },
    [PERMISSIONS.MANAGE_INVENTORY]: {
        label: "Faire des Inventaires",
        description: "Ajuster manuellement les quantités en stock.",
        category: "Stock"
    },
    [PERMISSIONS.VIEW_CUSTOMERS]: {
        label: "Voir les Clients",
        description: "Accéder à la liste des clients.",
        category: "Clients"
    },
    [PERMISSIONS.MANAGE_CUSTOMERS]: {
        label: "Gérer les Clients",
        description: "Créer, modifier ou supprimer des fiches clients.",
        category: "Clients"
    },
    [PERMISSIONS.MANAGE_CUSTOMER_DEBTS]: {
        label: "Gérer les Dettes/Crédits",
        description: "Enregistrer des remboursements de dettes.",
        category: "Clients"
    },
    [PERMISSIONS.VIEW_MESSAGES]: {
        label: "Accéder à la Messagerie",
        description: "Envoyer et recevoir des messages avec l'équipe.",
        category: "Communication"
    },
    [PERMISSIONS.MANAGE_SETTINGS]: {
        label: "Gérer les Paramètres",
        description: "Accéder aux réglages globaux de l'application.",
        category: "Général"
    }
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
        PERMISSIONS.VIEW_SALES_HISTORY, // Pour voir ce qui sort
        PERMISSIONS.VIEW_MESSAGES
    ],

    [ROLES.COMPTABLE]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FINANCIAL_ANALYTICS,
        PERMISSIONS.VIEW_EXPENSES,
        PERMISSIONS.MANAGE_EXPENSES,
        PERMISSIONS.VIEW_SALES_HISTORY,
        PERMISSIONS.VIEW_STOCK, // Lecture seule
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.VIEW_MESSAGES
    ],

    [ROLES.MANAGER_VENTES]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.ACCESS_POS,
        PERMISSIONS.VIEW_SALES_HISTORY,
        PERMISSIONS.MANAGE_SALES, // Peut gérer les retours/remboursements
        PERMISSIONS.VIEW_STOCK,   // Pour voir dispo
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.MANAGE_CUSTOMERS,
        PERMISSIONS.MANAGE_CUSTOMER_DEBTS,
        PERMISSIONS.VIEW_MESSAGES
    ]
};

// Matrice de permissions par page (chemin => permission(s) requise(s))
export const PAGE_PERMISSIONS = {
    '/dashboard': PERMISSIONS.VIEW_DASHBOARD,
    '/analytics': PERMISSIONS.VIEW_FINANCIAL_ANALYTICS,
    '/finance': PERMISSIONS.VIEW_FINANCIAL_ANALYTICS,
    '/pos': PERMISSIONS.ACCESS_POS,
    '/inventory': PERMISSIONS.VIEW_STOCK,
    '/history': PERMISSIONS.VIEW_SALES_HISTORY,
    '/customers': PERMISSIONS.VIEW_CUSTOMERS,
    '/ingredients': PERMISSIONS.VIEW_STOCK,
    '/expenses': PERMISSIONS.VIEW_EXPENSES,
    '/team': PERMISSIONS.MANAGE_TEAM,
    '/activity-log': PERMISSIONS.MANAGE_TEAM, // Admin only
    '/pending-approvals': PERMISSIONS.MANAGE_TEAM, // Admin only
    '/messages': PERMISSIONS.VIEW_MESSAGES,
    '/profile': null, // Accessible à tous
    '/help': null // Accessible à tous
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

/**
 * Vérifie si un utilisateur peut accéder à une page spécifique
 * @param {Object} userProfile - Le profil utilisateur
 * @param {string} pagePath - Le chemin de la page (ex: '/dashboard', '/pos')
 * @returns {boolean}
 */
export const canAccessPage = (userProfile, pagePath) => {
    if (!userProfile) return false;

    // Admin a accès à tout
    if (userProfile.role === ROLES.ADMIN) return true;

    // Pages publiques (profile, help) accessibles à tous les utilisateurs authentifiés
    const requiredPermission = PAGE_PERMISSIONS[pagePath];
    if (requiredPermission === null || requiredPermission === undefined) {
        return true;
    }

    // Vérifier la permission requise
    return hasPermission(userProfile, requiredPermission);
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
