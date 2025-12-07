import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, History, Settings,
  Plus, Trash2, Search, AlertTriangle, TrendingUp, DollarSign,
  Save, X, Minus, QrCode, Printer, Scan, Loader, FileText, Download, LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
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

  const DashboardView = () => (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Chiffre d'Affaires */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="text-white" size={20} />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">Total</span>
          </div>
          <p className="text-white/80 text-xs lg:text-sm font-medium mb-1">Chiffre d'affaires</p>
          <h3 className="text-xl lg:text-2xl font-bold">{formatMoney(stats.totalRevenue)}</h3>
        </div>

        {/* Bénéfice */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="text-white" size={20} />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
          <p className="text-white/80 text-xs lg:text-sm font-medium mb-1">Bénéfice net</p>
          <h3 className="text-xl lg:text-2xl font-bold">{formatMoney(stats.totalProfit)}</h3>
        </div>

        {/* Aujourd'hui */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="text-white" size={20} />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">Aujourd'hui</span>
          </div>
          <p className="text-white/80 text-xs lg:text-sm font-medium mb-1">Ventes du jour</p>
          <h3 className="text-xl lg:text-2xl font-bold">{formatMoney(stats.todayRevenue)}</h3>
        </div>

        {/* Alertes Stock */}
        <div className={`rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group ${stats.lowStockCount > 0
          ? 'bg-gradient-to-br from-red-500 to-pink-600'
          : 'bg-gradient-to-br from-slate-500 to-slate-600'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center transition-transform ${stats.lowStockCount > 0 ? 'animate-pulse group-hover:scale-110' : 'group-hover:scale-110'
              }`}>
              <AlertTriangle className="text-white" size={20} />
            </div>
            {stats.lowStockCount > 0 && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium animate-pulse">Urgent</span>
            )}
          </div>
          <p className="text-white/80 text-xs lg:text-sm font-medium mb-1">Alertes stock</p>
          <h3 className="text-xl lg:text-2xl font-bold">{stats.lowStockCount} {stats.lowStockCount > 1 ? 'produits' : 'produit'}</h3>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-slate-100">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          Actions rapides
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border-2 border-transparent transition-all group"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
              <ShoppingCart className="text-indigo-600 group-hover:text-white transition-colors" size={20} />
            </div>
            <span className="font-medium text-slate-700">Caisse</span>
          </button>

          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border-2 border-transparent transition-all group"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
              <Plus className="text-emerald-600 group-hover:text-white transition-colors" size={20} />
            </div>
            <span className="font-medium text-slate-700">Nouveau produit</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border-2 border-transparent transition-all group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
              <Package className="text-purple-600 group-hover:text-white transition-colors" size={20} />
            </div>
            <span className="font-medium text-slate-700">Inventaire</span>
          </button>

          <button
            onClick={() => setActiveTab('sales_history')}
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all group"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
              <History className="text-orange-600 group-hover:text-white transition-colors" size={20} />
            </div>
            <span className="font-medium text-slate-700">Historique</span>
          </button>
        </div>
      </div>

      {/* Products Overview */}
      <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Package size={20} className="text-indigo-500" />
            Produits ({products.length})
          </h3>
          <Button onClick={() => setActiveTab('inventory')} variant="secondary" className="text-sm">
            Voir tout
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-10">
            <Package size={48} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">Aucun produit encore</p>
            <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="mt-4">
              <Plus size={18} /> Ajouter un produit
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {products.slice(0, 4).map(product => (
              <div key={product.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm truncate">{product.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${product.stock <= product.minStock
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    {product.stock}
                  </span>
                </div>
                <p className="text-indigo-600 font-bold">{formatMoney(product.price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const POSView = () => {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-140px)]">
        {/* Grille Produits */}
        <div className="flex-1 flex flex-col gap-3 lg:gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Chercher un produit..."
                className="w-full pl-10 pr-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsScannerOpen(true)} className="px-4 lg:px-6 shadow-indigo-200">
              <Scan size={20} /> <span className="hidden sm:inline">SCANNER</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                <Package size={48} className="mb-3 opacity-50" />
                <p className="font-medium">Aucun produit trouvé</p>
                <p className="text-sm">Essayez un autre terme de recherche</p>
              </div>
            ) : (
              filteredProducts.map((product, index) => {
                const colors = [
                  'from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20',
                  'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20',
                  'from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20',
                  'from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20',
                  'from-pink-500/10 to-rose-500/10 hover:from-pink-500/20 hover:to-rose-500/20',
                ];
                const colorClass = colors[index % colors.length];

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className={`flex flex-col items-start p-4 lg:p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${product.stock <= 0
                      ? 'bg-slate-100 opacity-60 border-slate-200 cursor-not-allowed'
                      : `bg-gradient-to-br ${colorClass} border-transparent hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 active:scale-95`
                      }`}
                  >
                    <div className="w-full flex justify-between items-start mb-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold transition-transform group-hover:scale-105 ${product.stock <= product.minStock
                        ? 'bg-red-100 text-red-600'
                        : 'bg-emerald-100 text-emerald-600'
                        }`}>
                        {product.stock} en stock
                      </span>
                      {product.stock <= product.minStock && product.stock > 0 && (
                        <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 line-clamp-2 mb-2 text-sm lg:text-base group-hover:text-indigo-700 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-indigo-600 font-bold mt-auto text-lg">{formatMoney(product.price)}</p>
                  </button>
                );
              })
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

    const downloadQR = (product) => {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${product.id}`;
      // Pour télécharger une image depuis un autre domaine sans backend, on l'ouvre dans un nouvel onglet pour l'instant
      // ou on utilise fetch si CORS le permet. Ici méthode simple :
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `QR_${product.name}.png`;
      // Note: l'attribut download ne fonctionne pas toujours cross-origin, donc on ouvre dans un nouvel onglet
      window.open(url, '_blank');
      showNotification("L'image QR s'est ouverte, clic droit pour enregistrer");
    };

    return (
      <div className="space-y-3 lg:space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 lg:gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="text-sm lg:text-base">
            <Plus size={18} /> <span className="hidden sm:inline">Nouveau Produit</span><span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-3 lg:px-6 py-3 lg:py-4">Article</th>
                <th className="px-3 lg:px-6 py-3 lg:py-4">Prix</th>
                <th className="px-3 lg:px-6 py-3 lg:py-4">Stock</th>
                <th className="px-3 lg:px-6 py-3 lg:py-4 text-center hidden sm:table-cell">QR</th>
                <th className="px-3 lg:px-6 py-3 lg:py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-3 lg:px-6 py-3 lg:py-4">
                    <div className="font-medium text-slate-800 text-sm lg:text-base">{product.name}</div>
                    <div className="text-[10px] lg:text-xs text-slate-400 hidden lg:block">ID: {product.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4 font-medium text-sm lg:text-base">{formatMoney(product.price)}</td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4">
                    <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-[10px] lg:text-xs font-bold ${product.stock <= product.minStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4 hidden sm:table-cell">
                    <div className="flex justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${product.id}`}
                        alt="QR"
                        className="w-8 h-8 lg:w-10 lg:h-10 border rounded cursor-pointer active:scale-110 transition-transform bg-white"
                        onClick={() => downloadQR(product)}
                      />
                    </div>
                  </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4 text-right">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-end">
                      <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="text-indigo-600 font-medium text-xs lg:text-sm">Éditer</button>
                      <button onClick={() => deleteProduct(product.id)} className="text-red-500 font-medium text-xs lg:text-sm">Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
            { id: 'inventory', icon: QrCode, label: 'Produits & QR' },
            { id: 'sales_history', icon: History, label: 'Tickets' },
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
              {activeTab === 'pos' ? 'Caisse' : activeTab === 'inventory' ? 'Stock' : activeTab === 'sales_history' ? 'Tickets' : 'Tableau de bord'}
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
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-3xl flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ShoppingCart size={20} /> Panier
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                    {cart.reduce((a, b) => a + b.qty, 0)} arts.
                  </span>
                  <button onClick={() => setShowMobileCart(false)} className="p-2">
                    <X size={20} />
                  </button>
                </div>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-30 safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 p-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'pos', icon: ShoppingCart, label: 'Caisse' },
            { id: 'inventory', icon: QrCode, label: 'Stock' },
            { id: 'sales_history', icon: History, label: 'Tickets' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setShowMobileCart(false);
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all active:scale-95 ${activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400'
                }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium mt-1 truncate w-full text-center">{item.label}</span>
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