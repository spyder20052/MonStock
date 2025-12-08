import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, History, Settings,
  Plus, Trash2, Search, AlertTriangle, TrendingUp, DollarSign,
  Save, X, Minus, QrCode, Printer, Scan, Loader, FileText, Download, LogOut, Edit3,
  User, Mail, Lock, Eye, EyeOff, Check, ChevronLeft, ChevronRight, Calendar, Phone, Image, Users
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, writeBatch, serverTimestamp, increment
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
            {sale.customerName && sale.customerName !== 'Anonyme' && (
              <p className="font-medium text-indigo-700">Client: {sale.customerName}</p>
            )}
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
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let html5QrCode;

    loadQrScript().then(() => {
      // Use Html5Qrcode class for more control
      html5QrCode = new window.Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScan(decodedText);
          onClose();
        },
        (errorMessage) => {
          // ignore errors for better UX
        }
      ).catch(err => {
        console.error("Error starting scanner", err);
        setIsScanning(false);
      });
    });

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current.clear();
          }).catch(err => console.error("Failed to stop scanner", err));
        } else {
          scannerRef.current.clear();
        }
      }
    };
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (scannerRef.current) {
      const scanFile = () => {
        scannerRef.current.scanFile(file, true)
          .then(decodedText => {
            onScan(decodedText);
            onClose();
          })
          .catch(err => {
            console.error("Error scanning file", err);
            alert("Impossible de lire le QR code de cette image. Essayez une autre image.");
            // Restart camera
            setIsScanning(true);
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            scannerRef.current.start({ facingMode: "environment" }, config, (text) => { onScan(text); onClose(); });
          });
      };

      if (isScanning) {
        scannerRef.current.stop().then(() => {
          setIsScanning(false);
          scanFile();
        }).catch(err => {
          console.error("Failed to stop scanner for file upload", err);
          scanFile();
        });
      } else {
        scanFile();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md relative overflow-hidden">
        <button onClick={onClose} className="absolute right-4 top-4 z-20 bg-white/80 backdrop-blur rounded-full p-2 shadow-lg hover:bg-white transition-colors"><X size={20} /></button>

        <h3 className="text-center font-bold mb-6 text-lg">Scanner un produit</h3>

        <div className="relative rounded-xl overflow-hidden bg-black aspect-square mb-6 shadow-inner">
          <div id="reader" className="w-full h-full"></div>

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-xl"></div>
              {/* Corner Markers */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>

              {/* Animated Scan Line */}
              <div className="absolute left-4 right-4 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan"></div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-slate-500">Placez le QR Code dans le cadre</p>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Ou importer</span>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Image size={20} />
            Choisir une image (PNG/JPG)
          </button>
        </div>
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
  const [customers, setCustomers] = useState([]);
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

  // Customer Management States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerManagementEnabled, setCustomerManagementEnabled] = useState(false);

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

    return () => {
      unsubProducts();
      unsubSales();
      unsubCustomers();
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
        userId: user.uid,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Anonyme'
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

      // 3. Mettre à jour les statistiques du client
      if (selectedCustomer) {
        const customerRef = doc(db, 'users', user.uid, 'customers', selectedCustomer.id);
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        await updateDoc(customerRef, {
          totalPurchases: increment(1),
          totalSpent: increment(totalSale),
          totalItems: increment(totalItems),
          lastPurchaseDate: serverTimestamp()
        });
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
        {/* Stats Grid - Mobile optimized vertical layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 lg:p-4 border border-slate-200 border-l-4 border-l-indigo-500">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign size={16} className="lg:hidden text-indigo-600" />
                <DollarSign size={20} className="hidden lg:block text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] lg:text-xs font-medium">Chiffre d'affaires</p>
                <h3 className="text-base lg:text-lg font-bold text-slate-800 truncate">{formatMoney(stats.totalRevenue)}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} className="lg:hidden text-emerald-600" />
                <TrendingUp size={20} className="hidden lg:block text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] lg:text-xs font-medium">Bénéfice</p>
                <h3 className="text-base lg:text-lg font-bold text-emerald-600 truncate">{formatMoney(stats.totalProfit)}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 border border-slate-200 border-l-4 border-l-blue-500">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={16} className="lg:hidden text-blue-600" />
                <ShoppingCart size={20} className="hidden lg:block text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] lg:text-xs font-medium">Aujourd'hui</p>
                <h3 className="text-base lg:text-lg font-bold text-slate-800 truncate">{formatMoney(stats.todayRevenue)}</h3>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl p-3 lg:p-4 border border-l-4 ${stats.lowStockCount > 0 ? 'border-red-200 border-l-red-500' : 'border-slate-200 border-l-slate-400'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stats.lowStockCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <AlertTriangle size={16} className={`lg:hidden ${stats.lowStockCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                <AlertTriangle size={20} className={`hidden lg:block ${stats.lowStockCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] lg:text-xs font-medium">Alertes stock</p>
                <h3 className={`text-base lg:text-lg font-bold ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>{stats.lowStockCount}</h3>
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

  // --- Customer Selector Modal ---
  const CustomerSelectorModal = ({ onClose, onSelectCustomer }) => {
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCustomers = customers.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
    );

    const handleQuickAdd = async (e) => {
      e.preventDefault();
      if (!newCustomerName.trim()) return;

      const customer = await createCustomer({
        name: newCustomerName,
        phone: newCustomerPhone
      });

      if (customer) {
        onSelectCustomer(customer);
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              Sélectionner un client
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom ou téléphone..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleQuickAdd} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <p className="text-xs font-medium text-indigo-700 mb-2">Nouveau client rapide</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nom"
                  className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Téléphone (opt.)"
                  className="w-32 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                </button>
              </div>
            </form>

            {/* Customer List */}
            <div className="space-y-2">
              {/* Anonymous Option */}
              <button
                onClick={() => { onSelectCustomer(null); onClose(); }}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-left border border-slate-200 transition-colors"
              >
                <p className="font-medium text-slate-600">Client Anonyme</p>
                <p className="text-xs text-slate-400">Vente sans client</p>
              </button>

              {filteredCustomers.length === 0 && searchQuery ? (
                <p className="text-center text-slate-400 text-sm py-4">Aucun client trouvé</p>
              ) : (
                filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => { onSelectCustomer(customer); onClose(); }}
                    className="w-full p-3 bg-white hover:bg-indigo-50 rounded-lg text-left border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{customer.name}</p>
                        {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{customer.totalPurchases || 0} achats</p>
                        <p className="text-xs font-medium text-indigo-600">{formatMoney(customer.totalSpent || 0)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
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
            {/* Customer Selector */}
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

                {/* Quick Stock Replenishment */}
                <div className="flex items-center gap-2 mb-3 py-2 border-t border-b border-slate-100">
                  <span className="text-xs text-slate-500">Réapprovisionner:</span>
                  {[5, 10, 20].map(qty => (
                    <button
                      key={qty}
                      onClick={() => {
                        updateProduct({ ...product, stock: product.stock + qty });
                        showNotification(`+${qty} ${product.name}`);
                      }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      +{qty}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
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
                      QR
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} />
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

  const HistoryView = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const formatDateKey = (date) => {
      return date.toISOString().split('T')[0];
    };

    const filteredSales = useMemo(() => {
      const selectedKey = formatDateKey(selectedDate);
      return sales.filter(sale => {
        const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
        return formatDateKey(saleDate) === selectedKey;
      });
    }, [sales, selectedDate]);

    const dayTotal = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

    const goToPreviousDay = () => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    };

    const goToNextDay = () => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      if (newDate <= new Date()) setSelectedDate(newDate);
    };

    const goToToday = () => setSelectedDate(new Date());

    const isToday = formatDateKey(selectedDate) === formatDateKey(new Date());

    // Generate last 7 days for quick access
    const recentDays = useMemo(() => {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date);
      }
      return days;
    }, []);

    return (
      <div className="space-y-4">
        {/* Date Navigation Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Historique des ventes
            </h2>
            {!isToday && (
              <button
                onClick={goToToday}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Aujourd'hui
              </button>
            )}
          </div>

          {/* Day Selector */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>

            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-slate-800">
                {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-sm text-slate-500">
                {selectedDate.getFullYear()}
              </p>
            </div>

            <button
              onClick={goToNextDay}
              disabled={isToday}
              className={`p-2 rounded-lg transition-colors ${isToday
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Quick Day Access */}
          <div className="flex gap-2 overflow-x-auto pb-2 date-scroll">
            {recentDays.map((date, idx) => {
              const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-center transition-all ${isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <div className="text-xs font-medium">
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-bold">
                    {date.getDate()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Total du jour</p>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(dayTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Nombre de ventes</p>
            <p className="text-2xl font-bold text-indigo-600">{filteredSales.length}</p>
          </div>
        </div>

        {/* Sales List */}
        <div className="space-y-2">
          {filteredSales.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <FileText size={40} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400">Aucune vente ce jour</p>
            </div>
          ) : (
            filteredSales.map(sale => (
              <div key={sale.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                    <FileText size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {(sale.date?.toDate ? sale.date.toDate() : new Date(sale.date)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-500">{sale.items?.length || 0} article{(sale.items?.length || 0) > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-slate-800">{formatMoney(sale.total)}</span>
                  <button
                    onClick={() => setViewingReceipt(sale)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const CustomerView = () => {
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
    const [sortBy, setSortBy] = useState('recent'); // recent, spent, purchases
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [deletingCustomer, setDeletingCustomer] = useState(null);

    const filteredCustomers = useMemo(() => {
      let filtered = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearchTerm)) ||
        (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
      );

      // Sort
      switch (sortBy) {
        case 'spent':
          filtered.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
          break;
        case 'purchases':
          filtered.sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0));
          break;
        case 'recent':
        default:
          filtered.sort((a, b) => {
            const dateA = a.lastPurchaseDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.lastPurchaseDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
      }

      return filtered;
    }, [customers, customerSearchTerm, sortBy]);

    const customerStats = useMemo(() => {
      return {
        total: customers.length,
        totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
        avgSpent: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length : 0,
        topCustomer: customers.reduce((max, c) => (c.totalSpent || 0) > (max.totalSpent || 0) ? c : max, customers[0] || {})
      };
    }, [customers]);

    const getCustomerPurchases = (customerId) => {
      return sales.filter(s => s.customerId === customerId);
    };

    const getCustomerBadge = (customer) => {
      const spent = customer.totalSpent || 0;
      const purchases = customer.totalPurchases || 0;

      if (spent >= 100000) return { text: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      if (purchases >= 10) return { text: 'Régulier', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      if (purchases >= 3) return { text: 'Fidèle', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      return { text: 'Nouveau', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    // Edit Customer Modal Component
    const EditCustomerModal = ({ customer, onClose }) => {
      const [formData, setFormData] = useState({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || ''
      });

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.name.trim()) {
          await updateCustomer(customer.id, formData);
          onClose();
        }
      };

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-600" />
                Modifier le client
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+229 XX XX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Notes sur le client..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    };

    // Delete Customer Modal Component  
    const DeleteCustomerModal = ({ customer, onClose }) => {
      const handleDelete = async () => {
        await deleteCustomer(customer.id);
        setSelectedCustomerDetail(null);
        onClose();
      };

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" />
                Confirmer la suppression
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-red-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-600" />
                </div>
                <p className="text-center text-slate-700 mb-2">
                  Êtes-vous sûr de vouloir supprimer le client
                </p>
                <p className="text-center font-bold text-lg text-slate-900 mb-2">
                  {customer.name} ?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Cette action est <strong>irréversible</strong>. L'historique des achats sera conservé mais le client sera définitivement supprimé.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    if (selectedCustomerDetail) {
      const customer = customers.find(c => c.id === selectedCustomerDetail);
      if (!customer) {
        setSelectedCustomerDetail(null);
        return null;
      }

      const customerPurchases = getCustomerPurchases(customer.id);
      const badge = getCustomerBadge(customer);

      return (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => setSelectedCustomerDetail(null)}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ChevronLeft size={20} />
            Retour à la liste
          </button>

          {/* Customer Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{customer.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {customer.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
                    {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${badge.color}`}>
                {badge.text}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-xs text-indigo-600 font-medium">Total dépensé</p>
                <p className="text-xl font-bold text-indigo-700">{formatMoney(customer.totalSpent || 0)}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-xs text-emerald-600 font-medium">Achats</p>
                <p className="text-xl font-bold text-emerald-700">{customer.totalPurchases || 0}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Total articles</p>
                <p className="text-xl font-bold text-blue-700">{customer.totalItems || 0}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-xs text-amber-600 font-medium">Panier moyen</p>
                <p className="text-xl font-bold text-amber-700">
                  {formatMoney(customer.totalPurchases > 0 ? (customer.totalSpent / customer.totalPurchases) : 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Purchase History */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FileText size={20} className="text-slate-400" />
              Historique d'achats ({customerPurchases.length})
            </h3>
            <div className="space-y-2">
              {customerPurchases.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Aucun achat enregistré</p>
              ) : (
                customerPurchases.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800">
                        {new Date(sale.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500">{sale.items?.length || 0} article(s)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-slate-800">{formatMoney(sale.total)}</span>
                      <button
                        onClick={() => setViewingReceipt(sale)}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                      >
                        <Printer size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Total clients</p>
            <p className="text-2xl font-bold text-slate-800">{customerStats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Revenu total</p>
            <p className="text-2xl font-bold text-indigo-600">{formatMoney(customerStats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Panier moyen</p>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(customerStats.avgSpent)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Meilleur client</p>
            <p className="text-sm font-bold text-slate-800 truncate">{customerStats.topCustomer?.name || '-'}</p>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un client..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="recent">Plus récents</option>
              <option value="spent">Plus dépensé</option>
              <option value="purchases">Plus d'achats</option>
            </select>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={18} />
              Nouveau client
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Users size={48} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">
                {customerSearchTerm ? 'Aucun client trouvé' : 'Aucun client enregistré'}
              </p>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const badge = getCustomerBadge(customer);
              return (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerDetail(customer.id)}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-indigo-600">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 truncate">{customer.name}</h3>
                        {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border flex-shrink-0 ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-[10px] text-slate-500 font-medium">Dépensé</p>
                      <p className="text-sm font-bold text-slate-800">{formatMoney(customer.totalSpent || 0)}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-[10px] text-slate-500 font-medium">Achats</p>
                      <p className="text-sm font-bold text-indigo-600">{customer.totalPurchases || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-[10px] text-slate-500 font-medium">Articles</p>
                      <p className="text-sm font-bold text-blue-600">{customer.totalItems || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-[10px] text-slate-500 font-medium">Moyen</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {formatMoney(customer.totalPurchases > 0 ? (customer.totalSpent / customer.totalPurchases) : 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                      }}
                      className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Edit3 size={16} />
                      Modifier
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingCustomer(customer);
                      }}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      Supprimer
                    </button>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Customer Edit/Delete Modals */}
        {editingCustomer && (
          <EditCustomerModal
            customer={editingCustomer}
            onClose={() => setEditingCustomer(null)}
          />
        )}
        {deletingCustomer && (
          <DeleteCustomerModal
            customer={deletingCustomer}
            onClose={() => setDeletingCustomer(null)}
          />
        )}
      </div>
    );
  };

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

    const handleResetData = async (type) => {
      if (!confirm('Êtes-vous sûr de vouloir supprimer ces données ? Cette action est irréversible.')) return;

      setSaving(true);
      try {
        const batch = writeBatch(db);

        if (type === 'products' || type === 'all') {
          products.forEach(p => batch.delete(doc(db, 'users', user.uid, 'products', p.id)));
        }

        if (type === 'sales' || type === 'all') {
          sales.forEach(s => batch.delete(doc(db, 'users', user.uid, 'sales', s.id)));
        }

        await batch.commit();
        setMessage({ type: 'success', text: 'Données supprimées avec succès' });
        showNotification('Données réinitialisées');
      } catch (error) {
        console.error("Error resetting data:", error);
        setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
      } finally {
        setSaving(false);
      }
    };

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

        {/* WhatsApp Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Phone size={18} className="text-emerald-500" />
            Alertes WhatsApp
          </h3>

          <p className="text-sm text-slate-500 mb-4">
            Recevez une alerte quotidienne sur WhatsApp lorsqu'un produit est en stock bas.
            Les alertes sont envoyées une fois par jour jusqu'à résolution.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Numéro WhatsApp (Bénin)</label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
                  +229
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="tel"
                    value={profileData.whatsapp || ''}
                    onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                    placeholder="97 00 00 00"
                    maxLength={8}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">8 chiffres sans l'indicatif</p>
            </div>

            {/* Browser Notifications */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-slate-700">Notifications navigateur</p>
                <p className="text-xs text-slate-500">Alertes automatiques sur cet appareil</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!profileData.browserNotifications) {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                      setProfileData({ ...profileData, browserNotifications: true });
                      new Notification('MonStock', { body: 'Notifications activées !' });
                    }
                  } else {
                    setProfileData({ ...profileData, browserNotifications: false });
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${profileData.browserNotifications ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileData.browserNotifications ? 'left-7' : 'left-1'
                  }`} />
              </button>
            </div>

            {profileData.browserNotifications && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <Check size={16} />
                  Vous recevrez une alerte quand un produit sera en stock bas
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Management Toggle */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            Gestion des clients
          </h3>

          <p className="text-sm text-slate-500 mb-4">
            Activez cette fonctionnalité pour suivre vos clients, leurs achats, et leurs statistiques en détail.
          </p>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-slate-700">Activer la gestion des clients</p>
              <p className="text-xs text-slate-500">Affiche l'onglet Clients et le sélecteur dans la caisse</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newValue = !customerManagementEnabled;
                setCustomerManagementEnabled(newValue);
                localStorage.setItem(`customerMgmt_${user?.uid}`, String(newValue));
                showNotification(newValue ? 'Gestion clients activée' : 'Gestion clients désactivée');
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${customerManagementEnabled ? 'bg-indigo-500' : 'bg-slate-300'
                }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${customerManagementEnabled ? 'left-7' : 'left-1'
                }`} />
            </button>
          </div>

          {customerManagementEnabled && (
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 mt-3">
              <p className="text-sm text-indigo-700 flex items-center gap-2">
                <Check size={16} />
                L'onglet Clients est maintenant accessible et vous pouvez associer des clients à vos ventes
              </p>
            </div>
          )}
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

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            Zone de Danger
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-sm text-slate-700">Réinitialiser les produits</p>
                <p className="text-xs text-slate-500">Supprime tous les produits de l'inventaire</p>
              </div>
              <button
                onClick={() => handleResetData('products')}
                disabled={saving}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
              >
                Supprimer
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-sm text-slate-700">Réinitialiser les ventes</p>
                <p className="text-xs text-slate-500">Supprime tout l'historique des ventes</p>
              </div>
              <button
                onClick={() => handleResetData('sales')}
                disabled={saving}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
              >
                Supprimer
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-sm text-slate-700">Tout supprimer</p>
                <p className="text-xs text-slate-500">Produits, ventes et historique (Irreversible)</p>
              </div>
              <button
                onClick={() => handleResetData('all')}
                disabled={saving}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
              >
                Tout Effacer
              </button>
            </div>
          </div>
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
            ...(customerManagementEnabled ? [{ id: 'customers', icon: Users, label: 'Clients' }] : []),
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
              {activeTab === 'pos' ? 'Caisse' : activeTab === 'inventory' ? 'Stock' : activeTab === 'sales_history' ? 'Historique' : activeTab === 'customers' ? 'Clients' : activeTab === 'profile' ? 'Mon Profil' : 'Tableau de bord'}
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
          {activeTab === 'customers' && customerManagementEnabled && <CustomerView />}
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
        <div className={`grid px-1 py-2 ${customerManagementEnabled ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Accueil' },
            { id: 'pos', icon: ShoppingCart, label: 'Vente' },
            { id: 'inventory', icon: Package, label: 'Stock' },
            { id: 'sales_history', icon: History, label: 'Ventes' },
            ...(customerManagementEnabled ? [{ id: 'customers', icon: Users, label: 'Clients' }] : []),
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
              <item.icon size={customerManagementEnabled ? 20 : 22} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
              <span className={`${customerManagementEnabled ? 'text-[9px]' : 'text-[10px]'} mt-1 ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
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

      {showCustomerModal && (
        <CustomerSelectorModal
          onClose={() => setShowCustomerModal(false)}
          onSelectCustomer={(customer) => setSelectedCustomer(customer)}
        />
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