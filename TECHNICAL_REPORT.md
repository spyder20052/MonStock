# Rapport Technique de Développement - MonStock

**Version du document :** 1.0.0
**Date :** 13 Décembre 2025
**Projet :** MonStock - Solution de Gestion Point de Vente (POS) & Stock
**Auteur :** Assistant IA (Antigravity) pour Lead Developer

---

## 1. Vue d'ensemble de l'Architecture

MonStock est une **Single Page Application (SPA)** moderne, conçue pour la performance et la scalabilité. L'application repose sur une architecture **Serverless** via Firebase, déportant la logique backend, l’authentification et la base de données vers le cloud de Google, garantissant une haute disponibilité et une maintenance réduite.

### Stack Technologique

*   **Frontend Core :** React 18 (Hooks, Functional Components)
*   **Build Tool :** Vite (HMR ultra-rapide, build optimisé ESModule)
*   **Langage :** JavaScript (ES6+)
*   **Styling :** Tailwind CSS (Utility-first, responsive design, dark mode ready)
*   **Iconographie :** Lucide React (Pack d'icônes SVG légers et cohérents)
*   **Visualisation :** Recharts (Graphiques de données pour l'analytics)
*   **Backend & Infrastructure :** Firebase (Google Cloud)
    *   *Authentication* : Gestion identité, sessions sécurisées.
    *   *Firestore* : Base de données NoSQL temps réel.
    *   *Hosting* : Déploiement statique (implied).

---

## 2. Structure des Données (Firestore NoSQL)

L'architecture des données est **Multi-Tenant (isolée par Workspace)**. Chaque entreprise possède son propre nœud racine, garantissant l'étanchéité des données entre les clients.

**Racine :** `users/{workspaceId}/` (où workflowId est l'UID du créateur initial)

### Collections Principales

#### 1. `products` (Catalogue)
Objet central de l'inventaire.
```json
{
  "id": "uuid",
  "name": "Sandwich Poulet",
  "category": "Snack",
  "price": 2500, (Prix de vente)
  "purchasePrice": 1200, (Coût de revient/achat)
  "stock": 15, (Calculé ou manuel)
  "minStock": 5, (Trigger alerte)
  "isComposite": true, (Flag pour produits transformés)
  "recipe": [ (Si isComposite = true)
    { "ingredientId": "ref_id", "quantityPerProduct": 0.5 }
  ],
  "createdAt": "ISOString"
}
```

#### 2. `ingredients` (Raw Materials)
Sert à la gestion des produits composés.
```json
{
  "id": "uuid",
  "name": "Pain Baguette",
  "trackingType": "quantity" | "unit", (Suivi au poids ou à l'unité)
  "stock": 50,
  "cost": 150, (Coût unitaire pour calcul de marge)
  "unit": "pièce"
}
```

#### 3. `sales` (Transactions)
Snapshot immuable d'une vente.
```json
{
  "id": "uuid",
  "items": [...], (Copie complète des produits au moment de la vente)
  "total": 5000,
  "totalCost": 2400, (Calculé pour figer la marge à l'instant T)
  "profit": 2600,
  "paymentMethod": "cash" | "card" | "credit",
  "customerId": "ref_client_opt",
  "cashierId": "uid_user",
  "date": "ISOString"
}
```

#### 4. `customers` (CRM)
```json
{
  "id": "uuid",
  "name": "Jean Dupont",
  "phone": "+225...",
  "debt": 0, (Solde débiteur)
  "totalSpent": 150000, (Agrégat pour calcul VIP)
  "visitCount": 12
}
```

#### 5. `logs` (Audit Trail)
Traçabilité pour la sécurité.
```json
{
  "action": "PRODUCT_DELETED",
  "details": "Suppression produit X",
  "userId": "uid",
  "userRole": "manager",
  "timestamp": "ServerTimestamp"
}
```

---

## 3. Implémentations Clés & Pattern Design

### A. Gestion d'État (State Management)
L'application utilise une approche mixte :
1.  **Local State (useState)** : Pour les interactions UI immédiates (modales, formulaires).
2.  **Lifted State (App.jsx)** : `App.jsx` agit actuellement comme un "Store" centralisé qui détient les collections (`products`, `sales`, `cart`).
    *   *Note Technique :* À mesure que l'application grandit, une migration vers React Context ou Redux/Zustand serait recommandée pour éviter le "Prop Drilling".

### B. Système de Permissions (RBAC)
La sécurité est gérée côté client via un utilitaire strict (`utils/permissions.js`).
*   **Rôles :** `admin`, `manager`, `employee`.
*   **Constantes :** Définition centralisée des droits (`PERMISSIONS.MANAGE_STOCK`, `PERMISSIONS.VIEW_FINANCE`).
*   **Helper :** `hasPermission(userProfile, permission)` est utilisé pour le rendu conditionnel des composants et routes protégées.

### C. Algorithme des Produits Composés
Une des fonctionnalités les plus complexes.
1.  **Décrémentation :** Lors d'une vente, le système vérifie `isComposite`.
2.  **Liaison :** Si oui, il itère sur le tableau `recipe`.
3.  **Atomicté :** Il décrémente les stocks dans la collection `ingredients` au lieu de la collection `products`.
4.  **Stock Virtuel :** Le stock affiché d'un produit composé est calculé à la volée (`min(ingredientStock / usagePerProduct)`), affichant ainsi le nombre *théorique* de produits fabricables.

### D. Système d'Approbation
Pattern implémenté pour les actions destructives (Suppression).
*   Si un `employee` tente de supprimer une donnée critique, l'action est interceptée.
*   Une requête est créée dans la collection `approvals`.
*   L'interface de l'admin notifie la demande.
*   Validation ou Rejet met à jour l'état final.

---

## 4. Organisation du Code (Directory Structure)

```
src/
├── components/          # Composants UI Réutilisables
│   ├── modals/          # Formulaires transactionnels (Add Product, Pay...)
│   └── ui/              # Briques de base (Button, Card...)
├── pages/               # Vues principales (Routage)
│   ├── Dashboard/       # KPIs et graphiques
│   ├── POS/             # Interface de Caisse
│   ├── Inventory/       # Gestion Stock & Produits
│   ├── Help/            # Documentation dynamique
│   └── Admin/           # Logs & Approbations
├── utils/               # Logique métier pure
│   ├── firebase.js      # Configuration & Instances
│   ├── helpers.js       # Formatteurs, Calculeurs
│   ├── logger.js        # Système de logging centralisé
│   └── permissions.js   # RBAC logic
└── App.jsx              # Point d'entrée, Routing, State Global
```

---

## 5. Performance & UX

### Optimisations Actuelles
*   **Lazy Loading non-implémenté (Piste d'amélioration)** : Actuellement l'app charge tout le bundle.
*   **Virtual DOM (React)** : Assure la fluidité même avec des listes de produits conséquentes.
*   **Deboucing** : Utilisé sur la recherche pour éviter les re-renders excessifs.

### Mobile First
*   Utilisation extensive de **Grid** et **Flexbox** pour transformer les tableaux de données (Desktop) en cartes (Mobile).
*   Navigation adaptative (Sidebar vs Bottom/Burger Menu).
*   Touch targets agrandis pour l'usage sur tablette en mode caisse.

---

## 6. Dette Technique & Recommandations Futures

En tant que lead développeur virtuel, voici les points d'attention pour la V2 :

1.  **Refactoring App.jsx** : Le fichier est devenu volumineux (>1300 lignes). Il faut extraire les Hooks personnalisés (ex: `useProducts`, `useCart`) pour aérer le composant racine.
2.  **Validation de Données** : Implémenter Zod ou Yup pour sécuriser les entrées formulaires de manière plus stricte.
3.  **Sécurité Backend** : Implémenter les **Firestore Security Rules** pour répliquer les permissions frontend côté serveur (empêcher un employé malin de modifier la DB via la console).
4.  **Tests** : Ajouter Vitest/Jest pour les tests unitaires des fonctions critiques (calcul marge, stock).

---
*Fin du rapport.*
