import React from 'react';
import { ShoppingCart, Search, Plus, User, X, Scan, Package, Check, Users } from 'lucide-react';
import { formatMoney, getAvailableProductStock } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const POSView = ({
    cart,
    products,
    addToCart,
    updateCartQty,
    setShowCustomerModal,
    selectedCustomer,
    setSelectedCustomer,
    setIsPaymentModalOpen,
    searchTerm,
    setSearchTerm,
    setIsScannerOpen,
    ingredients,
    customerManagementEnabled
}) => {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-140px)]">
            {/* Grille Produits */}
            <div className="flex-1 flex flex-col gap-3">
                {/* Search Bar - More Compact on Mobile */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="w-full pl-10 pr-4 py-3 lg:py-2.5 rounded-xl lg:rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="px-4 lg:px-6 py-3 lg:py-2.5 bg-slate-800 text-white rounded-xl lg:rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                    >
                        <Scan size={20} />
                        <span className="hidden sm:inline">Scan</span>
                    </button>
                </div>

                {/* Product Grid - Responsive: 1 col mobile, 2+ cols desktop */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Package size={48} className="mb-3" />
                            <p className="text-sm font-medium">Aucun produit trouvé</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredProducts.map(product => {
                                const availableStock = getAvailableProductStock(product, cart, ingredients);
                                const isAvailable = availableStock > 0;

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={!isAvailable}
                                        className={`group relative p-4 rounded-lg border-2 transition-all text-left ${isAvailable
                                            ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md active:scale-98'
                                            : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                            }`}
                                    >
                                        {/* Product Card - Vertical Layout for Desktop */}
                                        <div className="flex flex-col items-start gap-3">
                                            {/* Product Icon */}
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isAvailable
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                <Package size={24} />
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 w-full">
                                                <h3 className={`font-bold text-sm mb-1 truncate ${isAvailable ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {product.name}
                                                </h3>
                                                <p className={`text-base font-bold mb-2 ${isAvailable ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {formatMoney(product.price)}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${isAvailable
                                                    ? availableStock <= 5
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : 'bg-red-50 text-red-600 border border-red-100'
                                                    }`}>
                                                    {isAvailable ? `${availableStock} en stock` : 'Rupture'}
                                                </span>
                                            </div>

                                            {/* Add Button - Top Right */}
                                            {isAvailable && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                                    <Plus size={14} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
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
                                    <button onClick={() => updateCartQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100">-</button>
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
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full"
                    >
                        <Check size={18} />
                        Valider
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default POSView;
