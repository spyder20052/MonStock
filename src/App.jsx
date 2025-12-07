import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, History, Settings,
  Plus, Trash2, Search, AlertTriangle, TrendingUp, DollarSign,
  Save, X, Minus, QrCode, Printer, Scan, Loader, FileText, Download, LogOut, Edit3,
  User, Mail, Lock, Eye, EyeOff, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import AuthPage from './components/AuthPage';

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
const appId = 'mon-stock-01';

// Charger le script de scan QR Code dynamiquement
const loadQrScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Html5QrcodeScanner) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

const formatDate = (isoString) => {
  return new Date(isoString).toLocaleString('fr-FR');
};

// --- Composants UI ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200 shadow-md",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 shadow-md",
    dark: "bg-slate-800 text-white hover:bg-slate-900"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1 mb-3">
    {label && <label className="text-sm font-medium text-slate-600">{label}</label>}
    <input
      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      {...props}
    />
  </div>
);

// --- Composant Ticket de Caisse ---
const Receipt = ({ sale, onClose }) => {
  const printReceipt = () => {
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const originalContent = document.body.innerHTML;

    // Simple print trick
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore event listeners
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold">Ticket #{sale.id.slice(-6)}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6 bg-white" id="receipt-print-area">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">StockPro</h2>
            <p className="text-slate-500 text-xs mt-1">Commerce Général</p>
            <p className="text-slate-400 text-xs">--------------------------------</p>
          </div>

          <div className="mb-4 text-sm text-slate-600">
            <p>Date: {formatDate(sale.date)}</p>
            <p>ID Vente: {sale.id}</p>
          </div>

          <table className="w-full text-sm mb-6">
            <thead className="border-b border-dashed border-slate-300">
              <tr className="text-left">
                <th className="py-2">Art.</th>
                <th className="text-center">Qté</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-slate-100">
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-center">x{item.qty}</td>
                  <td className="py-2 text-right">{formatMoney(item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-slate-800 pt-4 mb-8">
            <div className="flex justify-between font-bold text-xl">
              <span>TOTAL</span>
              <span>{formatMoney(sale.total)}</span>
            </div>
            <div className="text-center mt-6">
              <p className="text-xs text-slate-400">Merci de votre visite !</p>
              <div className="flex justify-center mt-2">
                {/* QR Code du ticket pour vérification future */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${sale.id}`} alt="Receipt QR" className="w-16 h-16 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Fermer</Button>
          <Button className="flex-1" onClick={printReceipt}><Printer size={16} /> Imprimer</Button>
        </div>
      </div>
    </div>
  );
};

// --- Composant Scanner ---
const ScannerModal = ({ onClose, onScan }) => {
  useEffect(() => {
    loadQrScript().then(() => {
      const html5QrcodeScanner = new window.Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: 250 }, false);

      html5QrcodeScanner.render((decodedText) => {
        onScan(decodedText);
      }, (error) => {
        console.warn(error);
      });

      return () => html5QrcodeScanner.clear();
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md relative">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 bg-white rounded-full p-2 shadow-lg"><X size={20} /></button>
        <h3 className="text-center font-bold mb-4">Scanner un produit</h3>
        <div id="reader" className="w-full overflow-hidden rounded-lg bg-slate-100"></div>
        <p className="text-center text-sm text-slate-500 mt-4">Placez le QR Code devant la caméra</p>
      </div>
    </div>
  );
};

// --- Application Principale ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // --- Authentification & Initialisation ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
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

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, [user]);

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
      if (product.stock <= 0) {
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

      setIsModalOpen(false);
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
      setEditingProduct(null);
      setIsModalOpen(false);
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

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    const currentQtyInCart = existingItem ? existingItem.qty : 0;

    if (currentQtyInCart + 1 > product.stock) {
      showNotification("Stock insuffisant !", "error");
      return;
    }

    if (existingItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const processSale = async () => {
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
        userId: user.uid
      };
      const saleRef = await addDoc(collection(db, 'users', user.uid, 'sales'), saleData);

      // 2. Mettre à jour les stocks
      for (const item of cart) {
        const productRef = doc(db, 'users', user.uid, 'products', item.id);
        const currentProduct = products.find(p => p.id === item.id);
        if (currentProduct) {
          await updateDoc(productRef, { stock: currentProduct.stock - item.qty });
        }
      }

      setCart([]);
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
      totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
      totalProfit: sales.reduce((sum, s) => sum + s.profit, 0),
      todayRevenue: todaysSales.reduce((sum, s) => sum + s.total, 0),
      lowStockCount: products.filter(p => p.stock <= p.minStock).length
    };
  }, [sales, products]);

  // --- Views ---

  const DashboardView = () => {
    const [salesFilter, setSalesFilter] = useState('today');

    const filteredSales = useMemo(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      return sales.filter(sale => {
        const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);

        switch (salesFilter) {
          case 'today':
            return saleDate >= today;
          case '7days':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return saleDate >= weekAgo;
          case '30days':
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            return saleDate >= monthAgo;
          default:
            return true;
        }
      });
    }, [sales, salesFilter]);

    const filteredTotal = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

    return (
      <div className="space-y-5">
        {/* Stats Grid - Professional with subtle color accents */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-indigo-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Chiffre d'affaires</p>
                <h3 className="text-lg font-bold text-slate-800">{formatMoney(stats.totalRevenue)}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Bénéfice</p>
                <h3 className="text-lg font-bold text-emerald-600">{formatMoney(stats.totalProfit)}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <ShoppingCart size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Aujourd'hui</p>
                <h3 className="text-lg font-bold text-slate-800">{formatMoney(stats.todayRevenue)}</h3>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl p-4 border border-l-4 ${stats.lowStockCount > 0 ? 'border-red-200 border-l-red-500' : 'border-slate-200 border-l-slate-400'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.lowStockCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <AlertTriangle size={20} className={stats.lowStockCount > 0 ? 'text-red-500' : 'text-slate-400'} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Alertes stock</p>
                <h3 className={`text-lg font-bold ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>{stats.lowStockCount}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Clear buttons with icons */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Actions rapides</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <ShoppingCart size={18} />
              <span className="font-medium text-sm">Nouvelle vente</span>
            </button>
            <button
              onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Plus size={18} />
              <span className="font-medium text-sm">Ajouter produit</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Package size={18} />
              <span className="font-medium text-sm">Voir stock</span>
            </button>
            <button
              onClick={() => setActiveTab('sales_history')}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <History size={18} />
              <span className="font-medium text-sm">Historique</span>
            </button>
          </div>
        </div>

        {/* Sales History with Date Filter */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              <span className="font-semibold text-slate-700">Ventes récentes</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {formatMoney(filteredTotal)}
              </span>
            </div>

            {/* Date Filter */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'today', label: "Aujourd'hui" },
                { id: '7days', label: '7 jours' },
                { id: '30days', label: '30 jours' },
                { id: 'all', label: 'Tout' },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSalesFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${salesFilter === filter.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={40} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucune vente pour cette période</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {filteredSales.slice(0, 10).map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <FileText size={14} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-700">{formatDate(sale.date)}</p>
                      <p className="text-xs text-slate-400">{sale.items?.length || 0} article{(sale.items?.length || 0) > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-800">{formatMoney(sale.total)}</span>
                    <button
                      onClick={() => setViewingReceipt(sale)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredSales.length > 10 && (
            <div className="p-3 border-t border-slate-100 text-center">
              <button
                onClick={() => setActiveTab('sales_history')}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Voir tout l'historique →
              </button>
            </div>
          )}
        </div>

        {/* Products Overview - Clean table format */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-slate-400" />
              <span className="font-semibold text-slate-700">Produits</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{products.length}</span>
            </div>
            <button onClick={() => setActiveTab('inventory')} className="text-sm text-indigo-600 font-medium hover:underline">
              Tout voir →
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={40} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun produit</p>
              <button
                onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                className="mt-3 text-sm text-indigo-600 font-medium hover:underline"
              >
                + Ajouter un produit
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.slice(0, 5).map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${product.stock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    <span className="font-medium text-sm text-slate-700">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-800">{formatMoney(product.price)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${product.stock <= product.minStock ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {product.stock} en stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const POSView = () => {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-140px)]">
        {/* Grille Produits */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => setIsScannerOpen(true)} className="px-4 bg-slate-800 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors">
              <Scan size={18} />
              <span className="hidden sm:inline">Scanner</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1 content-start">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400">
                <Package size={40} className="mb-2 opacity-50" />
                <p className="text-sm">Aucun produit trouvé</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all group ${product.stock <= 0
                    ? 'bg-slate-50 opacity-50 cursor-not-allowed border-slate-200'
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg active:scale-95'
                    }`}
                >
                  {/* Add to cart indicator */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${product.stock <= 0
                    ? 'bg-slate-200'
                    : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}>
                    <Plus size={14} />
                  </div>

                  {/* Product name */}
                  <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 mb-3 pr-6">{product.name}</h4>

                  {/* Price and stock */}
                  <div className="flex items-end justify-between w-full mt-auto">
                    <span className="text-lg font-bold text-slate-800">{formatMoney(product.price)}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${product.stock <= 0
                      ? 'bg-slate-100 text-slate-500'
                      : product.stock <= product.minStock
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {product.stock <= 0 ? 'Rupture' : product.stock}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panier Desktop Only */}
        <Card className="hidden lg:flex lg:w-96 flex-col h-full shadow-xl bg-white">
          <div className="p-4 border-b bg-slate-50 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart size={20} /> Panier
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
              {cart.reduce((a, b) => a + b.qty, 0)} arts.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Scan size={48} className="mb-2 opacity-50" />
                <p>Scannez un article</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatMoney(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, qty: Math.max(0, c.qty - 1) } : c).filter(c => c.qty > 0))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100">-</button>
                    <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                    <button onClick={() => addToCart(item)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t rounded-b-xl space-y-3">
            <div className="flex justify-between items-center text-xl font-bold text-slate-800">
              <span>Total</span>
              <span>{formatMoney(cartTotal)}</span>
            </div>
            <Button
              variant="success"
              className="w-full py-3 text-lg"
              onClick={processSale}
              disabled={cart.length === 0}
            >
              Encaisser & Imprimer
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const InventoryView = () => {
    const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const downloadQR = async (product) => {
      try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${product.id}`;
        const response = await fetch(url);
        const blob = await response.blob();

        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;

        // Sanitize product name for filename
        const safeName = product.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').replace(/\s+/g, '_');
        link.download = `${safeName}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(downloadUrl);
        showNotification(`QR Code téléchargé: ${product.name}.png`);
      } catch (error) {
        console.error('Download error:', error);
        // Fallback: open in new tab
        window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${product.id}`, '_blank');
        showNotification("Clic droit sur l'image pour enregistrer", "error");
      }
    };

    return (
      <div className="space-y-4">
        {/* Header with search and add button */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>

        {/* Mobile: Card View */}
        <div className="lg:hidden space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Package size={40} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun produit trouvé</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{product.name}</h3>
                    <p className="text-lg font-bold text-slate-800 mt-1">{formatMoney(product.price)}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${product.stock <= product.minStock
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    {product.stock} en stock
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${product.id}`}
                      alt="QR"
                      className="w-8 h-8 border rounded"
                    />
                    <button
                      onClick={() => downloadQR(product)}
                      className="text-xs text-indigo-600 font-medium"
                    >
                      Télécharger QR
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Edit3 size={14} /> Éditer
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Suppr.
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prix vente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">QR Code</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${product.stock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      <div>
                        <div className="font-medium text-slate-800">{product.name}</div>
                        <div className="text-xs text-slate-400">Coût: {formatMoney(product.cost)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{formatMoney(product.price)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${product.stock <= product.minStock
                      ? 'bg-red-100 text-red-600'
                      : 'bg-emerald-100 text-emerald-600'
                      }`}>
                      {product.stock} / min {product.minStock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${product.id}`}
                        alt="QR"
                        className="w-10 h-10 border rounded"
                      />
                      <button
                        onClick={() => downloadQR(product)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Éditer"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center">
              <Package size={48} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const HistoryView = () => (
    <div className="space-y-3 lg:space-y-4">
      <h2 className="text-lg lg:text-xl font-bold mb-2 lg:mb-4">Historique des ventes</h2>
      <div className="space-y-2 lg:space-y-3">
        {sales.map(sale => (
          <Card key={sale.id} className="p-3 lg:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 transition-colors">
            <div className="flex gap-3 lg:gap-4 items-center">
              <div className="bg-slate-100 p-2 lg:p-3 rounded-full text-slate-500">
                <FileText size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm lg:text-base">{formatDate(sale.date)}</p>
                <p className="text-xs lg:text-sm text-slate-500">{sale.items.length} articles</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 lg:gap-6">
              <span className="font-bold text-indigo-600 text-base lg:text-lg">{formatMoney(sale.total)}</span>
              <Button variant="secondary" onClick={() => setViewingReceipt(sale)} className="text-sm lg:text-base">
                <Printer size={16} /> <span className="hidden sm:inline">Voir Ticket</span><span className="sm:hidden">Ticket</span>
              </Button>
            </div>
          </Card>
        ))}
        {sales.length === 0 && <p className="text-center text-slate-400 mt-10 text-sm lg:text-base">Aucune vente enregistrée.</p>}
      </div>
    </div>
  );

  const ProfileView = () => {
    const [profileData, setProfileData] = useState({
      displayName: user?.displayName || '',
      email: user?.email || '',
    });
    const [passwords, setPasswords] = useState({
      current: '',
      new: '',
      confirm: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const handleUpdateProfile = async (e) => {
      e.preventDefault();
      setSaving(true);
      setMessage(null);

      try {
        if (profileData.displayName !== user.displayName) {
          await updateProfile(auth.currentUser, { displayName: profileData.displayName });
        }

        if (profileData.email !== user.email) {
          await updateEmail(auth.currentUser, profileData.email);
        }

        setMessage({ type: 'success', text: 'Profil mis à jour avec succès!' });
        showNotification('Profil mis à jour');
      } catch (error) {
        console.error('Update error:', error);
        if (error.code === 'auth/requires-recent-login') {
          setMessage({ type: 'error', text: 'Reconnectez-vous pour modifier l\'email' });
        } else {
          setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
        }
      } finally {
        setSaving(false);
      }
    };

    const handleChangePassword = async (e) => {
      e.preventDefault();

      if (passwords.new !== passwords.confirm) {
        setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
        return;
      }

      if (passwords.new.length < 6) {
        setMessage({ type: 'error', text: 'Le mot de passe doit avoir au moins 6 caractères' });
        return;
      }

      setSaving(true);
      setMessage(null);

      try {
        const credential = EmailAuthProvider.credential(user.email, passwords.current);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, passwords.new);

        setPasswords({ current: '', new: '', confirm: '' });
        setMessage({ type: 'success', text: 'Mot de passe changé avec succès!' });
        showNotification('Mot de passe modifié');
      } catch (error) {
        console.error('Password change error:', error);
        if (error.code === 'auth/wrong-password') {
          setMessage({ type: 'error', text: 'Mot de passe actuel incorrect' });
        } else {
          setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' });
        }
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-indigo-600">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-800 truncate">{user?.displayName || 'Utilisateur'}</h2>
              <p className="text-sm text-slate-500 truncate">{user?.email}</p>
              <p className="text-xs text-slate-400 mt-1">Membre depuis {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'récemment'}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Profile Info Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-slate-400" />
            Informations personnelles
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nom complet</label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
              Enregistrer les modifications
            </button>
          </form>
        </div>

        {/* Password Change Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Lock size={18} className="text-slate-400" />
            Changer le mot de passe
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Mot de passe actuel</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nouveau mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmer le nouveau mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving || !passwords.current || !passwords.new}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Lock size={16} />}
              Changer le mot de passe
            </button>
          </form>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </div>
    );
  };

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
            { id: 'pos', icon: ShoppingCart, label: 'Caisse (Scan)' },
            { id: 'inventory', icon: Package, label: 'Produits & QR' },
            { id: 'sales_history', icon: History, label: 'Historique' },
            { id: 'profile', icon: User, label: 'Mon Profil' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
              {activeTab === 'pos' ? 'Caisse' : activeTab === 'inventory' ? 'Stock' : activeTab === 'sales_history' ? 'Historique' : activeTab === 'profile' ? 'Mon Profil' : 'Tableau de bord'}
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
        </header>

        <div className="flex-1 overflow-auto p-3 lg:p-6 custom-scrollbar pb-20 lg:pb-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'sales_history' && <HistoryView />}
          {activeTab === 'profile' && <ProfileView />}
        </div>

        {/* Mobile Floating Cart Button - Only on POS View */}
        {activeTab === 'pos' && cart.length > 0 && (
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
        )}

        {/* Mobile Cart Drawer */}
        {showMobileCart && activeTab === 'pos' && (
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
                <div className="flex justify-between items-center text-xl font-bold text-slate-800">
                  <span>Total</span>
                  <span className="text-indigo-600">{formatMoney(cart.reduce((sum, item) => sum + (item.price * item.qty), 0))}</span>
                </div>
                <Button
                  variant="success"
                  className="w-full py-4 text-lg"
                  onClick={() => {
                    processSale();
                    setShowMobileCart(false);
                  }}
                >
                  <Save size={20} /> Encaisser & Imprimer
                </Button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className={`fixed bottom-24 lg:bottom-6 right-4 lg:right-6 px-4 lg:px-6 py-2 lg:py-3 rounded-lg shadow-lg text-white font-medium animate-bounce-in z-50 text-sm lg:text-base ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
            }`}>
            {notification.message}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 pb-safe">
        <div className="grid grid-cols-5 px-1 py-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Accueil' },
            { id: 'pos', icon: ShoppingCart, label: 'Vente' },
            { id: 'inventory', icon: Package, label: 'Stock' },
            { id: 'sales_history', icon: History, label: 'Ventes' },
            { id: 'profile', icon: User, label: 'Profil' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setShowMobileCart(false);
              }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === item.id
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
              <span className={`text-[10px] mt-1 ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingProduct ? 'Modifier' : 'Nouveau Produit'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData);
              if (editingProduct) updateProduct({ ...editingProduct, ...data });
              else addProduct(data);
            }} className="p-6">
              <Input name="name" label="Nom" defaultValue={editingProduct?.name} required autoFocus />
              <div className="grid grid-cols-2 gap-4">
                <Input name="cost" label="Prix Achat" type="number" min="0" defaultValue={editingProduct?.cost} required />
                <Input name="price" label="Prix Vente" type="number" min="0" defaultValue={editingProduct?.price} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="stock" label="Stock" type="number" defaultValue={editingProduct?.stock} required />
                <Input name="minStock" label="Alerte Min" type="number" defaultValue={editingProduct?.minStock || 5} required />
              </div>
              <div className="mt-6 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
                <Button type="submit" className="flex-1"><Save size={18} /> Sauvegarder</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
      )}

      {viewingReceipt && (
        <Receipt sale={viewingReceipt} onClose={() => setViewingReceipt(null)} />
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
    </div>
  );
}