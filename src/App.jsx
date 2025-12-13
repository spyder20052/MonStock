import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, History, Settings,
  Plus, Trash2, Search, AlertTriangle, TrendingUp, DollarSign, BarChart2,
  Save, X, Minus, QrCode, Printer, Scan, Loader, FileText, Download, LogOut, Edit3,
  User, Mail, Lock, Eye, EyeOff, Check, ChevronLeft, ChevronRight, Calendar, Phone, Image, Users, Clock, Wifi, WifiOff, RefreshCw, Menu, BookOpen, HelpCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, where, orderBy, writeBatch, serverTimestamp, increment, enableIndexedDbPersistence, arrayUnion, getDoc, setDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ROLES, PERMISSIONS, hasPermission } from './utils/permissions';
import { logAction, LOG_ACTIONS } from './utils/logger';
import { requiresApproval, createDeletionRequest, canDeleteDirectly, translateReasons } from './utils/approvalHelpers';
import DashboardView from './pages/Dashboard/DashboardView';
import AnalyticsView from './pages/Analytics/AnalyticsView';
import POSView from './pages/POS/POSView';
import InventoryView from './pages/Inventory/InventoryView';
import HistoryView from './pages/History/HistoryView';
import CustomerView from './pages/Customers/CustomerView';
import IngredientsView from './pages/Ingredients/IngredientsView';
import ProfileView from './pages/Profile/ProfileView';
import TeamView from './pages/Team/TeamView';
import ExpensesView from './pages/Expenses/ExpensesView';
import FinanceView from './pages/Analytics/FinanceView';
import ActivityLogView from './pages/Admin/ActivityLogView';
import PendingApprovalsView from './pages/Admin/PendingApprovalsView';
import HelpView from './pages/Help/HelpView';
import DeletionRequestsPanel from './components/DeletionRequestsPanel';
import CreateCustomerModal from './components/modals/CreateCustomerModal';
import CustomerSelectorModal from './components/modals/CustomerSelectorModal';
import ScannerModal from './components/modals/ScannerModal';
import PaymentModal from './components/modals/PaymentModal';
import RepaymentModal from './components/modals/RepaymentModal';
import ChangeRepaymentModal from './components/modals/ChangeRepaymentModal';
import Receipt from './components/modals/Receipt';
import Button from './components/ui/Button';
import AuthPage from './components/AuthPage';



import { formatMoney, formatDate, getProductStock, getAvailableProductStock, isIngredientLow, getIngredientAvailableStock } from './utils/helpers';
import { Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { db, auth } from './firebase';

const appId = 'mon-stock-01';

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard'; // Derive activeTab from URL

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);

  // UI States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null); // Role & Permissions
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null); // Owner/Company ID to fetch data from
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Écouter les demandes de suppression pending de l'utilisateur
  useEffect(() => {
    if (!user || !currentWorkspaceId) return;

    const q = query(
      collection(db, 'users', currentWorkspaceId, 'pendingDeletions'),
      where('requestedBy.userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingDeletionCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user, currentWorkspaceId]);

  // Customer Management States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerManagementEnabled, setCustomerManagementEnabled] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null); // Moved from CustomerView to persist state
  const [repaymentCustomer, setRepaymentCustomer] = useState(null); // Moved from CustomerView
  const [repaymentSale, setRepaymentSale] = useState(null); // For specific sale repayment
  const [returnChangeCustomer, setReturnChangeCustomer] = useState(null); // For change return
  const [showMobileMenu, setShowMobileMenu] = useState(false); // Mobile overflow menu
  const [showDeletionPanel, setShowDeletionPanel] = useState(false); // Deletion requests panel
  const [pendingDeletionCount, setPendingDeletionCount] = useState(0); // Count of pending deletion requests

  // Ingredients States
  const [ingredients, setIngredients] = useState([]);

  // Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Payment States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // --- Authentification & Initialisation ---

  // Helper Component for Route Protection
  const ProtectedRoute = ({ permission, children }) => {
    if (loading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin" /></div>;
    if (!user) return <Navigate to="/" replace />;
    if (permission && !hasPermission(userProfile, permission)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setUserProfile(null);
        setCurrentWorkspaceId(null);
        setCustomerManagementEnabled(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Profile Listener (Real-time updates)
  useEffect(() => {
    if (!user) return; // Wait for user to be logged in

    const profileRef = doc(db, 'users_profiles', user.uid);

    const unsubProfile = onSnapshot(profileRef, async (profileSnap) => {
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setUserProfile(data);
        setCurrentWorkspaceId(data.ownerId);

        // Load settings
        const savedSetting = localStorage.getItem(`customerMgmt_${user.uid}`);
        setCustomerManagementEnabled(savedSetting === 'true');

        setLoading(false);
      } else {
        // Profile doesn't exist? Try to create it (Invite or New Owner)
        try {
          // Check for invite
          let newProfile = null;
          if (user.email) {
            const inviteRef = doc(db, 'workspace_invites', user.email.toLowerCase().trim());
            const inviteSnap = await getDoc(inviteRef);

            if (inviteSnap.exists()) {
              const inviteData = inviteSnap.data();
              newProfile = {
                uid: user.uid,
                email: user.email,
                role: inviteData.role || 'manager_stock',
                ownerId: inviteData.ownerId,
                customPermissions: inviteData.customPermissions || {},
                createdAt: serverTimestamp(),
                joinedAt: serverTimestamp()
              };
              await deleteDoc(inviteRef);
              showNotification('success', "Vous avez rejoint l'équipe !");
            }
          }

          if (!newProfile) {
            // Default Owner Profile
            newProfile = {
              uid: user.uid,
              email: user.email,
              role: ROLES.ADMIN,
              ownerId: user.uid,
              createdAt: serverTimestamp()
            };
          }

          // Create the profile (will trigger snapshot again)
          await setDoc(profileRef, newProfile);

        } catch (error) {
          console.error("Error creating profile:", error);
          setLoading(false); // Stop loading even on error to show UI (empty/error state)
        }
      }
    }, (error) => {
      console.error("Profile snapshot error:", error);
      setLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  // --- Syncronisation Firestore ---

  useEffect(() => {
    if (!currentWorkspaceId) return;

    // Produits - Workspace-scoped
    const qProducts = query(collection(db, 'users', currentWorkspaceId, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    }, (error) => console.error("Erreur produits:", error));

    // Ventes - Workspace-scoped
    const qSales = query(collection(db, 'users', currentWorkspaceId, 'sales'), orderBy('date', 'desc'));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(items);
    }, (error) => console.error("Erreur ventes:", error));

    // Customers - Workspace-scoped
    const qCustomers = query(collection(db, 'users', currentWorkspaceId, 'customers'), orderBy('createdAt', 'desc'));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(items);
    }, (error) => console.error("Erreur clients:", error));

    // Ingredients - Workspace-scoped
    const qIngredients = query(collection(db, 'users', currentWorkspaceId, 'ingredients'));
    const unsubIngredients = onSnapshot(qIngredients, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIngredients(items);
    }, (error) => console.error("Erreur ingrédients:", error));

    return () => {
      unsubProducts();
      unsubSales();
      unsubCustomers();
      unsubIngredients();
    };
  }, [user, currentWorkspaceId]);

  // --- Automatic Low Stock Alerts (3x per day at random intervals) ---

  useEffect(() => {
    if (!user || products.length === 0) return;

    // Check if notifications are supported and enabled
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const sendStockAlert = () => {
      // Find products with low stock
      const lowStockProducts = products.filter(p => p.stock <= p.minStock);

      if (lowStockProducts.length === 0) return; // No problem, no notification

      // Check alert count for today
      const today = new Date().toDateString();
      const alertData = JSON.parse(localStorage.getItem(`stockAlerts_${user.uid}`) || '{}');

      // Reset if new day
      if (alertData.date !== today) {
        alertData.date = today;
        alertData.count = 0;
        alertData.lastTime = 0;
      }

      // Max 3 alerts per day
      if (alertData.count >= 3) return;

      // Minimum 2 hours between alerts
      const now = Date.now();
      const minInterval = 2 * 60 * 60 * 1000; // 2 hours
      if (alertData.lastTime && (now - alertData.lastTime) < minInterval) return;

      // Send notification
      new Notification('⚠️ Alerte Stock - MonStock', {
        body: `${lowStockProducts.length} produit${lowStockProducts.length > 1 ? 's' : ''} en stock bas:\n${lowStockProducts.slice(0, 3).map(p => `• ${p.name}: ${p.stock} restant(s)`).join('\n')}${lowStockProducts.length > 3 ? `\n... et ${lowStockProducts.length - 3} autre(s)` : ''}`,
        icon: '/favicon.ico',
        tag: 'low-stock-alert-' + alertData.count,
        requireInteraction: true
      });

      // Update alert data
      alertData.count += 1;
      alertData.lastTime = now;
      localStorage.setItem(`stockAlerts_${user.uid}`, JSON.stringify(alertData));
    };

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(sendStockAlert, 5000);

    // Set up random interval checks (between 1-4 hours)
    const getRandomInterval = () => {
      const minHours = 1;
      const maxHours = 4;
      return (minHours + Math.random() * (maxHours - minHours)) * 60 * 60 * 1000;
    };

    let intervalId;
    const scheduleNextCheck = () => {
      const randomDelay = getRandomInterval();
      intervalId = setTimeout(() => {
        sendStockAlert();
        scheduleNextCheck(); // Schedule next random check
      }, randomDelay);
    };

    scheduleNextCheck();

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(intervalId);
    };
  }, [products, user]);

  // --- Helpers ---

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCart([]);
      setProducts([]);
      setSales([]);
      showNotification("Déconnexion réussie");
    } catch (error) {
      console.error('Logout error:', error);
      showNotification("Erreur lors de la déconnexion", "error");
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const playBeep = () => {
    // Petit bip sonore pour confirmer le scan
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // A5
    gainNode.gain.value = 0.1;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);
  };

  // --- Logique Métier ---

  const handleScan = (decodedText) => {
    // Le QR Code contient l'ID du produit
    const product = products.find(p => p.id === decodedText);

    if (product) {
      const stock = getProductStock(product, ingredients);
      if (stock <= 0) {
        showNotification(`Stock épuisé pour ${product.name}`, "error");
        return;
      }
      playBeep();
      addToCart(product);
      showNotification(`${product.name} ajouté !`);
    } else {
      showNotification("Produit inconnu", "error");
    }
  };

  const addProduct = async (productData) => {
    if (!user) return;
    try {
      const newProduct = {
        ...productData,
        stock: parseInt(productData.stock),
        price: parseFloat(productData.price),
        cost: parseFloat(productData.cost),
        minStock: parseInt(productData.minStock),
        createdAt: new Date().toISOString()
      };

      // On utilise l'ID généré par Firestore pour le QR code
      const docRef = await addDoc(collection(db, 'users', currentWorkspaceId, 'products'), newProduct);

      // Log action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.PRODUCT_CREATED, `Produit créé: ${newProduct.name}`, { productId: docRef.id });

      showNotification("Produit créé avec QR Code associé");
    } catch (e) {
      console.error(e);
      showNotification("Erreur sauvegarde", "error");
    }
  };

  const updateProduct = async (productData) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', currentWorkspaceId, 'products', productData.id);
      await updateDoc(ref, productData);

      // Log action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.PRODUCT_UPDATED, `Produit mis à jour: ${productData.name}`, { productId: productData.id });

      showNotification("Produit mis à jour");
    } catch (e) {
      console.error(e);
      showNotification('error', "Erreur lors de la mise à jour");
    }
  };

  const deleteProduct = async (id) => {
    if (!user) return;
    try {
      // Récupérer le produit
      const product = products.find(p => p.id === id);
      if (!product) {
        showNotification("Produit introuvable", "error");
        return;
      }

      // Vérifier si approbation nécessaire
      const approval = requiresApproval(product, { uid: user.uid, role: userProfile?.role, ...userProfile }, 'PRODUCT');

      if (approval.required) {
        // Créer une demande d'approbation
        await createDeletionRequest(db, currentWorkspaceId, product, { uid: user.uid, displayName: user.displayName || user.email, ...userProfile }, 'PRODUCT', approval.reasons);

        const reasonsText = translateReasons(approval.reasons).join(', ');
        showNotification(
          `Demande de suppression envoyée à l'admin. Raisons: ${reasonsText}`,
          "info"
        );
        return;
      }

      // Suppression directe si autorisé
      await deleteDoc(doc(db, 'users', currentWorkspaceId, 'products', id));

      // Log action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.PRODUCT_DELETED, `Produit supprimé: ${product.name}`, { productId: id });

      showNotification("Produit supprimé");
    } catch (e) {
      console.error(e);
      showNotification("Erreur lors de la suppression", "error");
    }
  };

  // --- Gestion Clients ---

  const createCustomer = async (data) => {
    if (!user) return null;
    try {
      const newCustomer = {
        ...data,
        createdAt: serverTimestamp(),
        totalSpent: 0,
        visitCount: 0,
        debt: 0
      };
      const docRef = await addDoc(collection(db, 'users', currentWorkspaceId, 'customers'), newCustomer);
      const customer = { id: docRef.id, ...newCustomer };

      // Log action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.CUSTOMER_CREATED, `Client créé: ${newCustomer.name}`, { customerId: docRef.id });

      showNotification("Client créé");
      return customer;
    } catch (e) {
      console.error(e);
      showNotification('error', "Erreur lors de la création du client");
      return null;
    }
  };

  const updateCustomer = async (id, data) => {
    if (!user) return;
    try {
      const customerData = { ...data };
      if (data.debt !== undefined) customerData.debt = Number(data.debt);

      await updateDoc(doc(db, 'users', currentWorkspaceId, 'customers', id), customerData);

      // Log action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.CUSTOMER_UPDATED, `Client modifié: ${data.name || 'Inconnu'}`, { customerId: id });

      showNotification("Client mis à jour");
    } catch (e) {
      console.error(e);
      showNotification('error', "Erreur mise à jour client");
    }
  };

  const deleteCustomer = async (id) => {
    if (!user) return;
    try {
      // Récupérer le client
      const customer = customers.find(c => c.id === id);
      if (!customer) {
        showNotification("Client introuvable", "error");
        return;
      }

      // Calculer l'historique d'achats
      const customerSales = sales.filter(s => s.customerId === id);
      const additionalData = {
        purchaseCount: customerSales.length
      };

      // Vérifier si approbation nécessaire
      const approval = requiresApproval(customer, { uid: user.uid, role: userProfile?.role, ...userProfile }, 'CUSTOMER', additionalData);

      if (approval.required) {
        // Créer une demande d'approbation
        await createDeletionRequest(db, currentWorkspaceId, customer, { uid: user.uid, displayName: user.displayName || user.email, ...userProfile }, 'CUSTOMER', approval.reasons);

        const reasonsText = translateReasons(approval.reasons).join(', ');
        showNotification(
          `Demande de suppression envoyée à l'admin. Raisons: ${reasonsText}`,
          "info"
        );
        return;
      }

      // Suppression directe si autorisé
      await deleteDoc(doc(db, 'users', currentWorkspaceId, 'customers', id));

      // Log action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.CUSTOMER_DELETED, `Client supprimé: ${customer.name}`, { customerId: id });

      showNotification("Client supprimé");
    } catch (e) {
      console.error(e);
      showNotification("Erreur suppression client", "error");
    }
  };

  // --- Gestion Ingrédients ---

  const addIngredient = async (data) => {
    if (!user) return;
    const ingredientData = {
      ...data,
      stock: Number(data.stock),
      minStock: Number(data.minStock),
      fullUnits: Number(data.fullUnits) || 0,
      currentUnitUsages: Number(data.currentUnitUsages) || 0,
      usagesPerUnit: Number(data.usagesPerUnit) || 20,
      minFullUnits: Number(data.minFullUnits) || 2,
    };
    const docRef = await addDoc(collection(db, 'users', currentWorkspaceId, 'ingredients'), ingredientData);

    // Log action
    await logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.INGREDIENT_CREATED, `Ingrédient créé: ${data.name}`, { ingredientId: docRef.id });

    showNotification("Ingrédient ajouté");
  };

  const updateIngredient = async (id, data) => {
    if (!user) return;
    const ingredientData = { ...data };
    if (ingredientData.stock) ingredientData.stock = Number(ingredientData.stock);
    await updateDoc(doc(db, 'users', currentWorkspaceId, 'ingredients', id), data);

    // Log action
    await logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.INGREDIENT_UPDATED, `Ingrédient mis à jour: ${data.name}`, { ingredientId: id });

    showNotification("Ingrédient mis à jour");
  };

  const deleteIngredient = async (id) => {
    if (!user) return;
    try {
      // Récupérer l'ingrédient
      const ingredient = ingredients.find(i => i.id === id);
      if (!ingredient) {
        showNotification("Ingrédient introuvable", "error");
        return;
      }

      // Calculer valeur estimée
      const estimatedValue = ingredient.stock && ingredient.cost ? ingredient.stock * ingredient.cost : 0;
      const additionalData = { estimatedValue };

      // Vérifier si approbation nécessaire
      const approval = requiresApproval(ingredient, { uid: user.uid, role: userProfile?.role, ...userProfile }, 'INGREDIENT', additionalData);

      if (approval.required) {
        // Créer une demande d'approbation
        await createDeletionRequest(db, currentWorkspaceId, ingredient, { uid: user.uid, displayName: user.displayName || user.email, ...userProfile }, 'INGREDIENT', approval.reasons);

        const reasonsText = translateReasons(approval.reasons).join(', ');
        showNotification(
          `Demande de suppression envoyée à l'admin. Raisons: ${reasonsText}`,
          "info"
        );
        return;
      }

      // Suppression directe si autorisé
      await deleteDoc(doc(db, 'users', currentWorkspaceId, 'ingredients', id));

      // Log action
      await logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.INGREDIENT_DELETED, `Ingrédient supprimé: ${ingredient.name}`, { ingredientId: id });

      showNotification("Ingrédient supprimé");
    } catch (e) {
      console.error(e);
      showNotification("Erreur lors de la suppression", "error");
    }
  };



  const addToCart = (product) => {
    const availableStock = getAvailableProductStock(product, cart, ingredients);

    if (availableStock <= 0) {
      showNotification("Stock insuffisant !", "error");
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateCartQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  // Helper: Decrement ingredient stock for a composite product
  const decrementIngredients = async (product, quantity) => {
    if (!product.isComposite || !product.recipe) return;

    for (const recipeItem of product.recipe) {
      const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
      if (!ingredient) continue;

      const totalUsage = recipeItem.quantityPerProduct * quantity;
      const ingredientRef = doc(db, 'users', currentWorkspaceId, 'ingredients', ingredient.id);

      if (ingredient.trackingType === 'quantity') {
        // Simple decrement
        await updateDoc(ingredientRef, {
          stock: ingredient.stock - totalUsage
        });
      } else {
        // Usage tracking: decrement from currentUnitUsages first, then fullUnits
        let remainingUsage = totalUsage;
        let newCurrentUsages = ingredient.currentUnitUsages;
        let newFullUnits = ingredient.fullUnits;

        // Use up current unit first
        if (newCurrentUsages >= remainingUsage) {
          newCurrentUsages -= remainingUsage;
          remainingUsage = 0;
        } else {
          remainingUsage -= newCurrentUsages;
          newCurrentUsages = 0;
        }

        // If still need more, open new units
        while (remainingUsage > 0 && newFullUnits > 0) {
          newFullUnits -= 1;
          newCurrentUsages = ingredient.usagesPerUnit;

          if (newCurrentUsages >= remainingUsage) {
            newCurrentUsages -= remainingUsage;
            remainingUsage = 0;
          } else {
            remainingUsage -= newCurrentUsages;
            newCurrentUsages = 0;
          }
        }

        await updateDoc(ingredientRef, {
          fullUnits: newFullUnits,
          currentUnitUsages: newCurrentUsages
        });
      }
    }
  };

  const processSale = async (paymentDetails) => {
    if (cart.length === 0 || !user) return;

    const totalSale = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    // Calculate total cost (COGS) using purchasePrice (new) or cost (legacy)
    const totalCost = cart.reduce((sum, item) => sum + ((item.purchasePrice || item.cost || 0) * item.qty), 0);

    try {
      // 1. Enregistrer la vente
      const saleData = {
        date: new Date().toISOString(),
        items: cart,
        total: totalSale,
        totalCost: totalCost, // Store total cost for easier aggregation
        profit: totalSale - totalCost,
        userId: user.uid,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Anonyme',
        paymentMethod: paymentDetails?.method || 'cash',
        amountReceived: paymentDetails?.received || totalSale,
        changeAmount: paymentDetails?.change || 0,
        isCredit: paymentDetails?.isCredit || false,
        creditAmount: paymentDetails?.creditAmount || 0,
        amountPaid: paymentDetails?.isCredit ? paymentDetails.received : totalSale,
        payments: paymentDetails?.isCredit
          ? (paymentDetails.received > 0 ? [{
            date: new Date().toISOString(),
            amount: paymentDetails.received,
            method: paymentDetails.method || 'cash'
          }] : [])
          : [{
            date: new Date().toISOString(),
            amount: totalSale,
            method: paymentDetails?.method || 'cash'
          }]
      };
      const saleRef = await addDoc(collection(db, 'users', currentWorkspaceId, 'sales'), saleData);

      // Log sale action
      logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.SALE_CREATED, `Vente #${saleRef.id} - Total: ${formatMoney(totalSale)}`, { saleId: saleRef.id, total: totalSale });

      // Log change given if applicable
      if (paymentDetails.change > 0) {
        logAction(db, currentWorkspaceId, { uid: user.uid, ...userProfile }, LOG_ACTIONS.CHANGE_GIVEN, `Monnaie rendue sur la vente #${saleRef.id}: ${formatMoney(paymentDetails.change)}`, { saleId: saleRef.id, amount: paymentDetails.change });
      }

      // 2. Mettre à jour les stocks (produits simples) ou décrémenter ingrédients (produits composés)
      for (const item of cart) {
        const currentProduct = products.find(p => p.id === item.id);
        if (!currentProduct) continue;

        if (currentProduct.isComposite) {
          // Decrement ingredients for composite products
          await decrementIngredients(currentProduct, item.qty);
        } else {
          // Normal stock update for simple products
          const productRef = doc(db, 'users', currentWorkspaceId, 'products', item.id);
          await updateDoc(productRef, { stock: currentProduct.stock - item.qty });
        }
      }

      // 3. Mettre à jour les statistiques du client
      if (selectedCustomer) {
        const customerRef = doc(db, 'users', currentWorkspaceId, 'customers', selectedCustomer.id);
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

        const updateData = {
          totalPurchases: increment(1),
          totalSpent: increment(totalSale),
          totalItems: increment(totalItems),
          lastPurchaseDate: serverTimestamp()
        };

        // If credit sale, increase debt
        if (paymentDetails?.isCredit && paymentDetails?.creditAmount > 0) {
          updateData.debt = increment(paymentDetails.creditAmount);
        }

        // If holding change, increase changeOwed
        if (paymentDetails?.holdChange && paymentDetails?.change > 0) {
          updateData.changeOwed = increment(paymentDetails.change);
          updateData.changeTransactions = arrayUnion({
            date: new Date().toISOString(),
            amount: paymentDetails.change,
            type: 'owed',
            saleId: saleRef.id,
            description: `Monnaie de la vente ${formatMoney(totalSale)}`
          });
        }

        await updateDoc(customerRef, updateData);
      }

      setCart([]);
      setSelectedCustomer(null); // Reset customer selection
      showNotification("Vente enregistrée !", "success");

      // Ouvrir le ticket
      setViewingReceipt({ id: saleRef.id, ...saleData });

    } catch (e) {
      console.error(e);
      showNotification("Erreur lors de la vente", "error");
    }
  };

  // --- Stats Dashboard ---

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysSales = sales.filter(s => s.date.startsWith(today));

    return {
      totalRevenue: sales.reduce((sum, s) => {
        if (s.type === 'repayment') return sum + (s.total || 0);
        if (s.isCredit) return sum + (s.amountPaid || 0);
        return sum + (s.total || 0);
      }, 0),
      totalProfit: sales.reduce((sum, s) => {
        if (s.type === 'repayment') return sum + (s.profit || 0); // Repayment profit is the full amount
        if (s.isCredit) return sum + ((s.profit || 0) - (s.total - (s.amountPaid || 0))); // Profit minus unpaid debt? No, cash based accounting is simpler:
        // Actually for profit, it's complex. Let's stick to cash flow for revenue.
        // For profit, let's assume profit is realized when sale is made (accrual) OR when paid (cash).
        // User wants "chiffre d'affaire" (revenue) to be cash-based.
        // Let's make profit cash-based too to be consistent.
        // Simplified: Profit = Revenue - Cost.
        // For credit sale: Revenue = amountPaid. Cost = full cost. So Profit might be negative initially.
        // For repayment: Revenue = amount. Cost = 0. Profit = amount.
        // This balances out eventually.

        // However, existing logic was: s.profit = total - cost.
        // If we use that for credit sales, we overstate profit before payment.
        // Let's adjust:
        if (s.type === 'repayment') return sum + (s.total || 0);
        if (s.isCredit) {
          // Calculate proportional profit? Or just count revenue - cost?
          // If amountPaid < cost, profit is negative.
          // Let's keep it simple: Profit follows Revenue.
          // But we don't have per-item cost easily here without re-calculating.
          // s.profit is stored as (total - totalCost).
          // Let's just use the stored profit for now, but maybe user only cares about Revenue being cash-based.
          // User complaint was specifically about "Chiffre d'affaire".
          // I will leave profit as is (accrual basis) or ask user?
          // The user said "C'est seulement que le client rembourse que sa s'ajoute au chiffre d'affaire".
          // I'll update Revenue strictly. For Profit, I'll leave it as Accrual (standard) unless asked, 
          // OR I can try to approximate it. 
          // Let's stick to fixing Revenue first as requested.
          return sum + (s.profit || 0);
        }
        return sum + (s.profit || 0);
      }, 0),
      todayRevenue: todaysSales.reduce((sum, s) => {
        if (s.type === 'repayment') return sum + (s.total || 0);
        if (s.isCredit) return sum + (s.amountPaid || 0);
        return sum + (s.total || 0);
      }, 0),
      lowStockCount: products.filter(p => {
        const stock = getProductStock(p, ingredients);
        return p.isComposite ? stock <= 2 : stock <= p.minStock;
      }).length
    };
  }, [sales, products, ingredients]); // Added ingredients dependency for getProductStock

  // --- Views ---




  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-100"><Loader className="animate-spin text-indigo-600" size={40} /></div>;

  // Show AuthPage if user is not authenticated
  if (!user) return <AuthPage auth={auth} db={db} />;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden lg:flex lg:w-64 bg-slate-900 text-white flex-col shadow-2xl z-40">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <Package size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">StockPro Cloud</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
            { id: 'analytics', icon: BarChart2, label: 'Analyses' },
            { id: 'pos', icon: ShoppingCart, label: 'Caisse (Scan)' },
            { id: 'inventory', icon: Package, label: 'Produits & QR' },
            { id: 'sales_history', icon: History, label: 'Historique' },
            ...(customerManagementEnabled ? [{ id: 'customers', icon: Users, label: 'Clients' }] : []),
            { id: 'ingredients', icon: Package, label: 'Ingrédients' },
            { id: 'profile', icon: User, label: 'Mon Profil' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/${item.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-800'
                }`}
            >
              <item.icon size={22} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          {/* Help Link */}
          <Link to="/help" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'help' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <HelpCircle size={22} />
            <span className="font-medium">Aide & Guide</span>
          </Link>

          {hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) && (
            <Link to="/team" className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeTab === 'team' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users size={20} />
              <span className="font-medium">Équipe</span>
            </Link>
          )}

          {/* Expenses Link */}
          {hasPermission(userProfile, PERMISSIONS.VIEW_FINANCIAL_ANALYTICS) && (
            <Link to="/expenses" className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeTab === 'expenses' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <DollarSign size={20} />
              <span className="font-medium">Dépenses</span>
            </Link>
          )}

          {/* Finance Dashboard Link */}
          {hasPermission(userProfile, PERMISSIONS.VIEW_FINANCIAL_ANALYTICS) && (
            <Link to="/finance" className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeTab === 'finance' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <BarChart2 size={20} />
              <span className="font-medium">Rapport P&L</span>
            </Link>
          )}

          {/* Activity Log Link (Admin Only) */}
          {hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) && (
            <Link to="/logs" className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeTab === 'logs' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Clock size={20} />
              <span className="font-medium">Journal d'Activité</span>
            </Link>
          )}

          {/* Pending Approvals Link (Admin Only) */}
          {hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) && (
            <Link to="/admin/approvals" className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeTab === 'admin/approvals' ? 'bg-amber-50 text-amber-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <AlertTriangle size={20} />
              <span className="font-medium">Approbations</span>
              {/* Note: A badge could be added here by listening to pendingDeletions collection */}
            </Link>
          )}

          {/* User Deletion Requests Notification */}
          {pendingDeletionCount > 0 && (
            <button
              onClick={() => setShowDeletionPanel(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg mb-1 transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-medium">Mes demandes</span>
              </div>
              <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingDeletionCount}
              </span>
            </button>
          )}
        </nav>


        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 truncate">{user?.displayName || user?.email}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all text-sm"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>

          {/* Offline Indicator */}
          <div className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden relative transition-transform duration-300 ease-out ${showMobileMenu ? 'lg:transform-none transform translate-x-64 scale-95' : ''
        }`}>
        {/* Mobile Header - With Menu Button */}
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-800 active:scale-95 transition-all"
            >
              <Menu size={24} />
            </button>

            <div className="lg:hidden w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <h2 className="text-base lg:text-xl font-bold text-slate-800 truncate">
              {activeTab === 'pos' ? 'Caisse' : activeTab === 'inventory' ? 'Stock' : activeTab === 'sales_history' ? 'Historique' : activeTab === 'customers' ? 'Clients' : activeTab === 'ingredients' ? 'Ingrédients' : activeTab === 'profile' ? 'Mon Profil' : 'Tableau de bord'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-50 text-indigo-700 px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-bold border border-indigo-100">
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </div>
            <button
              onClick={handleLogout}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-800 active:scale-95 transition-all"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header >

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-6 custom-scrollbar">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={hasPermission(userProfile, PERMISSIONS.VIEW_DASHBOARD) ? <DashboardView
              sales={sales}
              stats={stats}
              ingredients={ingredients}
              products={products}
              setActiveTab={(tab) => navigate(`/${tab}`)}
              setViewingReceipt={setViewingReceipt}
            /> : <Navigate to="/profile" replace />} />
            <Route path="/analytics" element={hasPermission(userProfile, PERMISSIONS.VIEW_FINANCIAL_ANALYTICS) ? <AnalyticsView
              sales={sales}
              products={products}
              customers={customers}
              setActiveTab={(tab) => navigate(`/${tab}`)}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/pos" element={hasPermission(userProfile, PERMISSIONS.ACCESS_POS) ? <POSView
              cart={cart}
              products={products}
              addToCart={addToCart}
              updateCartQty={updateCartQty}
              setShowCustomerModal={setShowCustomerModal}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setIsScannerOpen={setIsScannerOpen}
              ingredients={ingredients}
              customerManagementEnabled={customerManagementEnabled}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/inventory" element={hasPermission(userProfile, PERMISSIONS.VIEW_STOCK) ? <InventoryView
              products={products}
              ingredients={ingredients}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              addProduct={addProduct}
              updateProduct={updateProduct}
              deleteProduct={deleteProduct}
              showNotification={showNotification}
              userProfile={userProfile}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/sales_history" element={hasPermission(userProfile, PERMISSIONS.VIEW_SALES_HISTORY) ? <HistoryView
              sales={sales}
              setViewingReceipt={setViewingReceipt}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/customers" element={(customerManagementEnabled && hasPermission(userProfile, PERMISSIONS.VIEW_CUSTOMERS)) ? <CustomerView
              customers={customers}
              sales={sales}
              createCustomer={createCustomer}
              updateCustomer={updateCustomer}
              deleteCustomer={deleteCustomer}
              setShowCustomerModal={setShowCustomerModal}
              selectedCustomerDetail={selectedCustomerDetail}
              setSelectedCustomerDetail={setSelectedCustomerDetail}
              setRepaymentCustomer={setRepaymentCustomer}
              setViewingReceipt={setViewingReceipt}
              user={user}
              setRepaymentSale={setRepaymentSale}
              setReturnChangeCustomer={setReturnChangeCustomer}
              showNotification={showNotification}
              userProfile={userProfile}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/ingredients" element={hasPermission(userProfile, PERMISSIONS.VIEW_STOCK) ? <IngredientsView
              ingredients={ingredients}
              addIngredient={addIngredient}
              updateIngredient={updateIngredient}
              deleteIngredient={deleteIngredient}
              userProfile={userProfile}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/expenses" element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_FINANCIAL_ANALYTICS}>
                <ExpensesView
                  workspaceId={currentWorkspaceId}
                  showNotification={showNotification}
                  user={user}
                  userProfile={userProfile}
                />
              </ProtectedRoute>
            } />
            <Route path="/finance" element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_FINANCIAL_ANALYTICS}>
                <FinanceView workspaceId={currentWorkspaceId} />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={<ProfileView
              user={user}
              userProfile={userProfile}
              products={products}
              sales={sales}
              customers={customers}
              showNotification={showNotification}
              customerManagementEnabled={customerManagementEnabled}
              setCustomerManagementEnabled={setCustomerManagementEnabled}
              workspaceId={currentWorkspaceId}
            />} />
            <Route path="/team" element={hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) ? <TeamView
              user={user}
              userProfile={userProfile}
              workspaceId={currentWorkspaceId}
              showNotification={showNotification}
            /> : <Navigate to="/profile" replace />} />
            <Route path="/logs" element={hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) ? <ActivityLogView
              userProfile={userProfile}
              workspaceId={currentWorkspaceId}
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/admin/approvals" element={hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) ? <PendingApprovalsView
              userProfile={userProfile}
              workspaceId={currentWorkspaceId}
              user={user}
              deleteProduct={deleteProduct}
              deleteCustomer={deleteCustomer}
              deleteIngredient={deleteIngredient}
              showNotification={showNotification}
            /> : <Navigate to="/dashboard" replace />} />

            <Route path="/help" element={<HelpView userProfile={userProfile} customerManagementEnabled={customerManagementEnabled} />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        {/* Mobile Floating Cart Button - Only on POS View */}
        {
          activeTab === 'pos' && cart.length > 0 && (
            <button
              onClick={() => setShowMobileCart(!showMobileCart)}
              className="lg:hidden fixed bottom-20 right-4 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform"
            >
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.reduce((a, b) => a + b.qty, 0)}
                </span>
              </div>
            </button>
          )
        }

        {/* Mobile Cart Drawer */}
        {
          showMobileCart && activeTab === 'pos' && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowMobileCart(false)}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart size={18} /> Panier
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium ml-2">
                      {cart.reduce((a, b) => a + b.qty, 0)}
                    </span>
                  </h3>
                  <button onClick={() => setShowMobileCart(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-sm text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{formatMoney(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-2">
                        <button
                          onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, qty: Math.max(0, c.qty - 1) } : c).filter(c => c.qty > 0))}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold text-base w-6 text-center">{item.qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 border-t space-y-3 rounded-b-3xl">
                  {/* Customer Selector Mobile */}
                  {customerManagementEnabled && (
                    <div>
                      {selectedCustomer ? (
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <User size={16} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-800">{selectedCustomer.name}</p>
                              <p className="text-xs text-slate-500">{selectedCustomer.totalPurchases || 0} achats</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedCustomer(null)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCustomerModal(true)}
                          className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
                        >
                          <Users size={18} />
                          <span className="font-medium text-sm">Ajouter un client</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xl font-bold text-slate-800">
                    <span>Total</span>
                    <span className="text-indigo-600">{formatMoney(cart.reduce((sum, item) => sum + (item.price * item.qty), 0))}</span>
                  </div>
                  <Button
                    variant="success"
                    className="w-full py-4 text-lg"
                    onClick={() => {
                      setIsPaymentModalOpen(true);
                      setShowMobileCart(false);
                    }}
                  >
                    <Save size={20} /> Encaisser & Imprimer
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {
          notification && (
            <div className={`fixed bottom-24 lg:bottom-6 right-4 lg:right-6 px-4 lg:px-6 py-2 lg:py-3 rounded-lg shadow-lg text-white font-medium animate-bounce-in z-50 text-sm lg:text-base ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
              }`}>
              {notification.message}
            </div>
          )
        }
      </main >


      {/* Mobile Slide-Push Menu - Immersive Stack Effect */}
      {showMobileMenu && (
        <>
          {/* Backdrop - Subtle */}
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Sidebar Menu - Pushes Content */}
          <div className={`lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-slate-900 z-50 shadow-2xl transition-transform duration-300 ease-out flex flex-col`}>
            {/* Header - Fixed */}
            <div className="p-6 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">MonStock</h2>
                  <p className="text-slate-400 text-xs">POS Cloud</p>
                </div>
              </div>
            </div>

            {/* Navigation - Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              {/* Main Navigation */}
              <div className="px-3 space-y-1">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
                  { id: 'pos', icon: ShoppingCart, label: 'Caisse (Scan)' },
                  { id: 'inventory', icon: Package, label: 'Produits & QR' },
                  { id: 'sales_history', icon: History, label: 'Historique' },
                  { id: 'analytics', icon: BarChart2, label: 'Analyses' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(`/${item.id}`);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                    <span className={`text-sm ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-4 mx-3 border-t border-slate-800" />

              {/* Secondary Navigation */}
              <div className="px-3 space-y-1">
                {[
                  ...(customerManagementEnabled ? [{ id: 'customers', icon: Users, label: 'Clients' }] : []),
                  { id: 'ingredients', icon: Package, label: 'Ingrédients' },
                  { id: 'help', icon: HelpCircle, label: 'Aide & Guide' },
                  { id: 'profile', icon: Settings, label: 'Paramètres' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(`/${item.id}`);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                    <span className={`text-sm ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Admin Section */}
              {hasPermission(userProfile, PERMISSIONS.MANAGE_TEAM) && (
                <>
                  <div className="my-4 mx-3 border-t border-slate-800" />
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4">Admin</p>
                  </div>
                  <div className="px-3 space-y-1">
                    <button
                      onClick={() => {
                        navigate('/team');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'team'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Users size={20} strokeWidth={activeTab === 'team' ? 2.5 : 2} />
                      <span className={`text-sm ${activeTab === 'team' ? 'font-semibold' : 'font-medium'}`}>
                        Équipe
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/logs');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'logs'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Clock size={20} strokeWidth={activeTab === 'logs' ? 2.5 : 2} />
                      <span className={`text-sm ${activeTab === 'logs' ? 'font-semibold' : 'font-medium'}`}>
                        Journal d'Activité
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/admin/approvals');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'admin/approvals'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <AlertTriangle size={20} strokeWidth={2.5} />
                      <span className={`text-sm ${activeTab === 'admin/approvals' ? 'font-semibold' : 'font-medium'}`}>
                        Approbations
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* Finance Section */}
              {hasPermission(userProfile, PERMISSIONS.VIEW_FINANCIAL_ANALYTICS) && (
                <>
                  <div className="my-4 mx-3 border-t border-slate-800" />
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4">Finance</p>
                  </div>
                  <div className="px-3 space-y-1">
                    <button
                      onClick={() => {
                        navigate('/expenses');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'expenses'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <DollarSign size={20} strokeWidth={2.5} />
                      <span className={`text-sm ${activeTab === 'expenses' ? 'font-semibold' : 'font-medium'}`}>
                        Dépenses
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/finance');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'finance'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <BarChart2 size={20} strokeWidth={2.5} />
                      <span className={`text-sm ${activeTab === 'finance' ? 'font-semibold' : 'font-medium'}`}>
                        Rapport P&L
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* User Deletion Requests */}
              {pendingDeletionCount > 0 && (
                <>
                  <div className="my-4 mx-3 border-t border-slate-800" />
                  <div className="px-3 space-y-1">
                    <button
                      onClick={() => {
                        setShowDeletionPanel(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all bg-amber-900/30 text-amber-400 hover:bg-amber-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={20} strokeWidth={2.5} />
                        <span className="text-sm font-semibold">
                          Mes demandes
                        </span>
                      </div>
                      <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingDeletionCount}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer - User Profile - Fixed */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.displayName || 'Utilisateur'}</p>
                  <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Déconnexion"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {
        isScannerOpen && (
          <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
        )
      }

      {
        showCustomerModal && (
          <CustomerSelectorModal
            customers={customers}
            createCustomer={createCustomer}
            onClose={() => setShowCustomerModal(false)}
            onSelectCustomer={(customer) => {
              setSelectedCustomer(customer);
              setShowCustomerModal(false);
            }}
          />
        )
      }

      {
        viewingReceipt && (
          <Receipt sale={viewingReceipt} onClose={() => setViewingReceipt(null)} />
        )
      }

      {
        isPaymentModalOpen && (
          <PaymentModal
            total={cart.reduce((sum, item) => sum + (item.price * item.qty), 0)}
            onClose={() => setIsPaymentModalOpen(false)}
            onConfirm={(paymentDetails) => {
              setIsPaymentModalOpen(false);
              processSale(paymentDetails);
            }}
            selectedCustomer={selectedCustomer}
          />
        )
      }

      {
        repaymentCustomer && (
          <RepaymentModal
            customer={repaymentCustomer}
            onClose={() => setRepaymentCustomer(null)}
            db={db}
            user={user}
            userProfile={userProfile}
            workspaceId={currentWorkspaceId}
            showNotification={showNotification}
          />
        )
      }

      {/* Repayment Modal - Rendered at root level for proper z-index */}
      {repaymentSale && (
        <RepaymentModal
          customer={customers.find(c => c.id === repaymentSale.customerId)}
          sale={repaymentSale}
          onClose={() => setRepaymentSale(null)}
          user={user}
          userProfile={userProfile}
          workspaceId={currentWorkspaceId}
          showNotification={showNotification}
        />
      )}

      {/* Change Repayment Modal - Rendered at root level for proper z-index */}
      {returnChangeCustomer && (
        <ChangeRepaymentModal
          customer={returnChangeCustomer}
          onClose={() => setReturnChangeCustomer(null)}
          user={user}
          workspaceId={currentWorkspaceId}
          showNotification={showNotification}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scaleIn 0.2s ease-out; }
        @keyframes bounceIn { 0% { transform: translateY(100%); opacity: 0; } 70% { transform: translateY(-10px); opacity: 1; } 100% { transform: translateY(0); } }
        .animate-bounce-in { animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
      {/* Deletion Requests Panel */}
      <DeletionRequestsPanel
        user={user}
        workspaceId={currentWorkspaceId}
        isOpen={showDeletionPanel}
        onClose={() => setShowDeletionPanel(false)}
      />
    </div >
  );
}