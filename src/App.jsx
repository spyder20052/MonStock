import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, History, Settings, 
  Plus, Trash2, Search, AlertTriangle, TrendingUp, DollarSign, 
  Save, X, Minus, QrCode, Printer, Scan, Loader, FileText, Download
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, 
  deleteDoc, onSnapshot, query, orderBy 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

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
         <button onClick={onClose} className="absolute right-4 top-4 z-10 bg-white rounded-full p-2 shadow-lg"><X size={20}/></button>
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

  // --- Authentification & Initialisation ---

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Syncronisation Firestore ---

  useEffect(() => {
    if (!user) return;

    // Produits
    const qProducts = query(collection(db, 'artifacts', appId, 'public', 'data', 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    }, (error) => console.error("Erreur produits:", error));

    // Ventes
    const qSales = query(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), orderBy('date', 'desc'));
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
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), newProduct);
      
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
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', productData.id);
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
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
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
      const saleRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), saleData);

      // 2. Mettre à jour les stocks
      for (const item of cart) {
        const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
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
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-indigo-500">
          <p className="text-slate-500 text-sm font-medium">Chiffre d'affaires</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatMoney(stats.totalRevenue)}</h3>
        </Card>
        <Card className="p-5 border-l-4 border-emerald-500">
          <p className="text-slate-500 text-sm font-medium">Bénéfice Net</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatMoney(stats.totalProfit)}</h3>
        </Card>
        <Card className="p-5 border-l-4 border-blue-500">
          <p className="text-slate-500 text-sm font-medium">Ventes du jour</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatMoney(stats.todayRevenue)}</h3>
        </Card>
        <Card className="p-5 border-l-4 border-red-500">
          <p className="text-slate-500 text-sm font-medium">Alertes Stock</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.lowStockCount}</h3>
        </Card>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={() => setActiveTab('sales_history')} variant="secondary">
           <FileText size={18} /> Voir l'historique complet des tickets
        </Button>
      </div>
    </div>
  );

  const POSView = () => {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
        {/* Grille Produits */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Chercher..." 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsScannerOpen(true)} className="px-6 shadow-indigo-200">
               <Scan size={20} /> SCANNER
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20 pr-2 custom-scrollbar">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left group ${
                  product.stock <= 0 
                    ? 'bg-slate-100 opacity-60' 
                    : 'bg-white hover:border-indigo-500 hover:shadow-md'
                }`}
              >
                <div className="w-full flex justify-between items-start mb-2">
                   <span className={`text-xs px-2 py-1 rounded font-bold ${product.stock <= product.minStock ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    Stock: {product.stock}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 line-clamp-2 mb-1">{product.name}</h4>
                <p className="text-indigo-600 font-bold mt-auto">{formatMoney(product.price)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Panier */}
        <Card className="w-full lg:w-96 flex flex-col h-full border-t lg:border-t-0 shadow-xl lg:shadow-sm bg-white">
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
                  <Scan size={48} className="mb-2 opacity-50"/>
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
                    <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: Math.max(0, c.qty - 1)} : c).filter(c => c.qty > 0))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100">-</button>
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
      <div className="space-y-4">
        <div className="flex justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
            <Plus size={20} /> Nouveau Produit
          </Button>
        </div>

        <Card className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">Article</th>
                  <th className="px-6 py-4">Prix</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-center">QR Code</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{product.name}</div>
                        <div className="text-xs text-slate-400">ID: {product.id.slice(0,8)}...</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatMoney(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        product.stock <= product.minStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex justify-center">
                        <div className="group relative">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${product.id}`} 
                                alt="QR" 
                                className="w-10 h-10 border rounded hover:scale-150 transition-transform bg-white z-10 relative cursor-pointer"
                                onClick={() => downloadQR(product)}
                            />
                            <button onClick={() => downloadQR(product)} className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 text-indigo-600">
                                <Download size={16} />
                            </button>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="text-indigo-600 font-medium text-sm">Éditer</button>
                      <button onClick={() => deleteProduct(product.id)} className="text-red-500 font-medium text-sm">Suppr.</button>
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
     <div className="space-y-4">
        <h2 className="text-xl font-bold mb-4">Historique des ventes & Tickets</h2>
        <div className="space-y-2">
            {sales.map(sale => (
                <Card key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="bg-slate-100 p-3 rounded-full text-slate-500">
                            <FileText size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{formatDate(sale.date)}</p>
                            <p className="text-sm text-slate-500">{sale.items.length} articles</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="font-bold text-indigo-600 text-lg">{formatMoney(sale.total)}</span>
                        <Button variant="secondary" onClick={() => setViewingReceipt(sale)}>
                            <Printer size={16} /> Voir Ticket
                        </Button>
                    </div>
                </Card>
            ))}
            {sales.length === 0 && <p className="text-center text-slate-400 mt-10">Aucune vente enregistrée.</p>}
        </div>
     </div>
  );

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-100"><Loader className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-40">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <Package size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl hidden lg:block tracking-tight">StockPro Cloud</span>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <item.icon size={22} />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
           <div className="text-xs text-slate-500 text-center">Connecté • Firebase</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {activeTab === 'pos' ? 'Caisse Enregistreuse' : activeTab === 'inventory' ? 'Gestion Stock & QR' : activeTab === 'sales_history' ? 'Historique Tickets' : 'Tableau de bord'}
          </h2>
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-100">
               {new Date().toLocaleDateString()}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'sales_history' && <HistoryView />}
        </div>

        {notification && (
          <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-bounce-in z-50 ${
            notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
          }`}>
            {notification.message}
          </div>
        )}
      </main>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingProduct ? 'Modifier' : 'Nouveau Produit'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
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
      `}</style>
    </div>
  );
}