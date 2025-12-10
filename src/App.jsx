import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, History, Settings,
  Plus, Trash2, Search, AlertTriangle, TrendingUp, DollarSign, BarChart2,
  Save, X, Minus, QrCode, Printer, Scan, Loader, FileText, Download, LogOut, Edit3,
  User, Mail, Lock, Eye, EyeOff, Check, ChevronLeft, ChevronRight, Calendar, Phone, Image, Users, Clock, Wifi, WifiOff, RefreshCw, Menu
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, writeBatch, serverTimestamp, increment, enableIndexedDbPersistence, arrayUnion
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import DashboardView from './pages/Dashboard/DashboardView';
import AnalyticsView from './pages/Analytics/AnalyticsView';
import POSView from './pages/POS/POSView';
import InventoryView from './pages/Inventory/InventoryView';
import HistoryView from './pages/History/HistoryView';
import CustomerView from './pages/Customers/CustomerView';
import IngredientsView from './pages/Ingredients/IngredientsView';
import ProfileView from './pages/Profile/ProfileView';
import CustomerSelectorModal from './components/modals/CustomerSelectorModal';
import ScannerModal from './components/modals/ScannerModal';
import PaymentModal from './components/modals/PaymentModal';
import RepaymentModal from './components/modals/RepaymentModal';
import ChangeRepaymentModal from './components/modals/ChangeRepaymentModal';
import Receipt from './components/modals/Receipt';
import Button from './components/ui/Button';
import AuthPage from './components/AuthPage';


import { formatMoney, formatDate, getProductStock, getAvailableProductStock, isIngredientLow, getIngredientAvailableStock } from './utils/helpers';
// --- Configuration Firebase & Utilitaires ---

const firebaseConfig = {
  apiKey: "AIzaSyDbUDhUSR2Jm-HD8EDFoIyyM2kmtKZQvzs",
  authDomain: "monstock-a8cbb.firebaseapp.com",
  projectId: "monstock-a8cbb",
  storageBucket: "monstock-a8cbb.firebasestorage.app",
  messagingSenderId: "710172228698",
  appId: "1:710172228698:web:69a14359db84087f106c63",
  measurementId: "G-8QWJ0K4G55"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
      console.log('Persistence not supported by browser');
    }
  });
} catch (err) {
  console.log('Persistence error:', err);
}

const appId = 'mon-stock-01';


import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

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
  const [showMobileCart, setShowMobileCart] = useState(false);

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

  // Ingredients States
  const [ingredients, setIngredients] = useState([]);

  // Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Payment States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // --- Authentification & Initialisation ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      // Load customer management setting after user is loaded
      if (u) {
        const savedSetting = localStorage.getItem(`customerMgmt_${u.uid}`);
        setCustomerManagementEnabled(savedSetting === 'true');
      } else {
        setCustomerManagementEnabled(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Syncronisation Firestore ---

  useEffect(() => {
    if (!user) return;

    // Produits - User-scoped
    const qProducts = query(collection(db, 'users', user.uid, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    }, (error) => console.error("Erreur produits:", error));

    // Ventes - User-scoped
    const qSales = query(collection(db, 'users', user.uid, 'sales'), orderBy('date', 'desc'));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(items);
    }, (error) => console.error("Erreur ventes:", error));

    // Customers - User-scoped
    const qCustomers = query(collection(db, 'users', user.uid, 'customers'), orderBy('createdAt', 'desc'));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(items);
    }, (error) => console.error("Erreur clients:", error));

    // Ingredients - User-scoped
    const qIngredients = query(collection(db, 'users', user.uid, 'ingredients'));
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
  }, [user]);

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
      const docRef = await addDoc(collection(db, 'users', user.uid, 'products'), newProduct);

      showNotification("Produit créé avec QR Code associé");
    } catch (e) {
      console.error(e);
      showNotification("Erreur sauvegarde", "error");
    }
  };

  const updateProduct = async (productData) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'products', productData.id);
      await updateDoc(ref, {
        name: productData.name,
        stock: parseInt(productData.stock),
        price: parseFloat(productData.price),
        cost: parseFloat(productData.cost),
        minStock: parseInt(productData.minStock)
      });
      showNotification("Produit mis à jour");
    } catch (e) {
      showNotification("Erreur mise à jour", "error");
    }
  };

  const deleteProduct = async (id) => {
    if (!user) return;
    if (window.confirm("Supprimer ce produit définitivement ?")) {
      await deleteDoc(doc(db, 'users', user.uid, 'products', id));
      showNotification("Produit supprimé", "error");
    }
  };

  // --- Customer Management ---

  const createCustomer = async (customerData) => {
    if (!user) return null;
    try {
      const newCustomer = {
        name: customerData.name,
        phone: customerData.phone || '',
        email: customerData.email || '',
        notes: customerData.notes || '',
        createdAt: serverTimestamp(),
        totalPurchases: 0,
        totalSpent: 0,
        totalItems: 0,
        lastPurchaseDate: null
      };
      const docRef = await addDoc(collection(db, 'users', user.uid, 'customers'), newCustomer);
      showNotification(`Client ${customerData.name} ajouté`);
      return { id: docRef.id, ...newCustomer };
    } catch (e) {
      console.error(e);
      showNotification("Erreur création client", "error");
      return null;
    }
  };

  const updateCustomer = async (id, customerData) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), customerData);
      showNotification("Client mis à jour");
    } catch (e) {
      showNotification("Erreur mise à jour client", "error");
    }
  };

  const deleteCustomer = async (id) => {
    if (!user) return;
    if (window.confirm("Supprimer ce client définitivement ?")) {
      await deleteDoc(doc(db, 'users', user.uid, 'customers', id));
      showNotification("Client supprimé", "error");
    }
  };

  // --- Ingrédients CRUD ---

  const addIngredient = async (data) => {
    if (!user) return;
    const ingredientData = {
      name: data.name,
      trackingType: data.trackingType, // "quantity" ou "usage"
      createdAt: serverTimestamp(),
    };

    if (data.trackingType === 'quantity') {
      ingredientData.stock = Number(data.stock) || 0;
      ingredientData.minStock = Number(data.minStock) || 5;
    } else {
      // trackingType === 'usage'
      ingredientData.fullUnits = Number(data.fullUnits) || 0;
      ingredientData.currentUnitUsages = Number(data.usagesPerUnit) || 0; // Commence plein
      ingredientData.usagesPerUnit = Number(data.usagesPerUnit) || 1;
      ingredientData.minFullUnits = Number(data.minFullUnits) || 2;
    }

    await addDoc(collection(db, 'users', user.uid, 'ingredients'), ingredientData);
    showNotification(`Ingrédient "${data.name}" ajouté`);
  };

  const updateIngredient = async (id, data) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'ingredients', id), data);
    showNotification("Ingrédient mis à jour");
  };

  const deleteIngredient = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'ingredients', id));
    showNotification("Ingrédient supprimé", "error");
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
      const ingredientRef = doc(db, 'users', user.uid, 'ingredients', ingredient.id);

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
    const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.qty), 0);

    try {
      // 1. Enregistrer la vente
      const saleData = {
        date: new Date().toISOString(),
        items: cart,
        total: totalSale,
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
      const saleRef = await addDoc(collection(db, 'users', user.uid, 'sales'), saleData);

      // 2. Mettre à jour les stocks (produits simples) ou décrémenter ingrédients (produits composés)
      for (const item of cart) {
        const currentProduct = products.find(p => p.id === item.id);
        if (!currentProduct) continue;

        if (currentProduct.isComposite) {
          // Decrement ingredients for composite products
          await decrementIngredients(currentProduct, item.qty);
        } else {
          // Normal stock update for simple products
          const productRef = doc(db, 'users', user.uid, 'products', item.id);
          await updateDoc(productRef, { stock: currentProduct.stock - item.qty });
        }
      }

      // 3. Mettre à jour les statistiques du client
      if (selectedCustomer) {
        const customerRef = doc(db, 'users', user.uid, 'customers', selectedCustomer.id);
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header - More Compact */}
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10">
          <div className="flex items-center gap-3">
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

        <div className="flex-1 overflow-auto p-3 lg:p-6 custom-scrollbar pb-20 lg:pb-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView
              sales={sales}
              stats={stats}
              ingredients={ingredients}
              products={products}
              setActiveTab={(tab) => navigate(`/${tab}`)}
              setViewingReceipt={setViewingReceipt}
            />} />
            <Route path="/analytics" element={<AnalyticsView
              sales={sales}
              products={products}
              customers={customers}
              setActiveTab={(tab) => navigate(`/${tab}`)}
            />} />
            <Route path="/pos" element={<POSView
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
            />} />
            <Route path="/inventory" element={<InventoryView
              products={products}
              ingredients={ingredients}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              addProduct={addProduct}
              updateProduct={updateProduct}
              deleteProduct={deleteProduct}
              showNotification={showNotification}
            />} />
            <Route path="/sales_history" element={<HistoryView
              sales={sales}
              setViewingReceipt={setViewingReceipt}
            />} />
            <Route path="/customers" element={customerManagementEnabled ? <CustomerView
              customers={customers}
              sales={sales}
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
            /> : <Navigate to="/dashboard" replace />} />
            <Route path="/ingredients" element={<IngredientsView
              ingredients={ingredients}
              addIngredient={addIngredient}
              updateIngredient={updateIngredient}
              deleteIngredient={deleteIngredient}
            />} />
            <Route path="/profile" element={<ProfileView
              user={user}
              products={products}
              sales={sales}
              customers={customers}
              showNotification={showNotification}
              customerManagementEnabled={customerManagementEnabled}
              setCustomerManagementEnabled={setCustomerManagementEnabled}
            />} />
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

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-5 h-16">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Accueil' },
            { id: 'pos', icon: ShoppingCart, label: 'Caisse' },
            { id: 'inventory', icon: Package, label: 'Stock' },
            { id: 'sales_history', icon: History, label: 'Ventes' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                navigate(`/${item.id}`);
                setShowMobileCart(false);
                setShowMobileMenu(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === item.id
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-slate-500 active:bg-slate-50'
                }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className={`text-[10px] ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          ))}

          {/* More Menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${showMobileMenu || ['analytics', 'customers', 'ingredients', 'profile'].includes(activeTab)
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-slate-500 active:bg-slate-50'
              }`}
          >
            <Menu size={22} strokeWidth={showMobileMenu ? 2.5 : 2} />
            <span className={`text-[10px] ${showMobileMenu ? 'font-semibold' : 'font-medium'}`}>
              Plus
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Overflow Menu */}
      {showMobileMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Menu</h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg active:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 space-y-1">
              {[
                { id: 'analytics', icon: BarChart2, label: 'Analyses', description: 'Statistiques et rapports' },
                ...(customerManagementEnabled ? [{ id: 'customers', icon: Users, label: 'Clients', description: 'Gestion des clients' }] : []),
                { id: 'ingredients', icon: Package, label: 'Ingrédients', description: 'Stock des ingrédients' },
                { id: 'profile', icon: User, label: 'Mon Profil', description: 'Paramètres et données' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(`/${item.id}`);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 active:bg-slate-50'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === item.id
                    ? 'bg-indigo-100'
                    : 'bg-slate-100'
                    }`}>
                    <item.icon size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
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
          showNotification={showNotification}
        />
      )}

      {/* Change Repayment Modal - Rendered at root level for proper z-index */}
      {returnChangeCustomer && (
        <ChangeRepaymentModal
          customer={returnChangeCustomer}
          onClose={() => setReturnChangeCustomer(null)}
          user={user}
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
    </div >
  );
}