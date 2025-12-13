import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

/**
 * Logs a user action to the 'logs' subcollection in the workspace.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} workspaceId - The ID of the current workspace (ownerId)
 * @param {Object} user - The current user object (from auth/profile) containing uid, displayName/name, role
 * @param {string} actionType - CONSTANT string for the action (e.g., 'SALE_CREATED', 'PRODUCT_UPDATED')
 * @param {string} details - Human readable details
 * @param {Object} metadata - Optional extra data (targetId, values, etc.)
 */
export const logAction = async (db, workspaceId, user, actionType, details, metadata = {}) => {
    try {
        if (!workspaceId) {
            console.warn("Cannot log action: No workspaceId provided");
            return;
        }

        const logEntry = {
            action: actionType,
            details: details,
            userId: user.uid,
            userName: user.name || user.displayName || user.email || 'Inconnu',
            userRole: user.role || 'unknown',
            metadata: metadata,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'users', workspaceId, 'logs'), logEntry);
    } catch (error) {
        // We generally don't want to break the app if logging fails, but we should know about it.
        console.error("Failed to log action:", error);
    }
};

export const LOG_ACTIONS = {
    // Auth
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',

    // Inventory
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_DELETED: 'PRODUCT_DELETED',
    STOCK_UPDATED: 'STOCK_UPDATED', // Quick update

    // Sales
    SALE_CREATED: 'SALE_CREATED',
    SALE_DELETED: 'SALE_DELETED', // If we implement refund/delete
    CHANGE_GIVEN: 'CHANGE_GIVEN',

    // Customers
    CUSTOMER_CREATED: 'CUSTOMER_CREATED',
    CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
    CUSTOMER_DELETED: 'CUSTOMER_DELETED',
    DEBT_REPAID: 'DEBT_REPAID',

    // Team
    USER_INVITED: 'USER_INVITED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
    USER_REMOVED: 'USER_REMOVED',

    // Finance
    EXPENSE_CREATED: 'EXPENSE_CREATED',
    EXPENSE_UPDATED: 'EXPENSE_UPDATED',

    // Ingredients
    INGREDIENT_CREATED: 'INGREDIENT_CREATED',
    INGREDIENT_UPDATED: 'INGREDIENT_UPDATED',
    INGREDIENT_DELETED: 'INGREDIENT_DELETED'
};
