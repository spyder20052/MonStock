import React, { useState } from 'react';
import { ShoppingCart, Search, Plus, User, X, Scan, Package, Check, Users, ChevronUp } from 'lucide-react';
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
    const [showMobileCart, setShowMobileCart] = useState(false);
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const cartItemCount = cart.reduce((a, b) => a + b.qty, 0);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Cart Component (reusable for desktop and mobile)
    const CartContent = ({ isMobile = false }) => (
        <>
            <div className={`p-3 sm:p-4 border-b bg-slate-50 ${isMobile ? 'rounded-t-2xl' : 'rounded-t-xl'} flex justify-between items-center`}>
                <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                    <ShoppingCart size={18} className="sm:w-5 sm:h-5" /> Panier
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                        {cartItemCount} art{cartItemCount > 1 ? 's' : ''}.
                    </span>
                    {isMobile && (
                        <button
                            onClick={() => setShowMobileCart(false)}
                            className="p-1 hover:bg-slate-200 rounded-lg"
                        >
                            <ChevronUp size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                        <Scan size={40} className="mb-2 opacity-50 sm:w-12 sm:h-12" />
                        <p className="text-sm">Scannez un article</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-slate-100">
                            <div className="flex-1 overflow-hidden mr-2">
                                <p className="font-medium text-xs sm:text-sm text-slate-800 truncate">{item.name}</p>
                                <p className="text-xs text-slate-500">{formatMoney(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={() => updateCartQty(item.id, -1)}
                                    className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100 active:scale-95 text-sm font-bold"
                                >
                                    -
                                </button>
                                <span className="font-bold text-sm w-6 text-center">{item.qty}</span>
                                <button
                                    onClick={() => addToCart(item)}
                                    className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100 active:scale-95 text-sm font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 sm:p-4 bg-slate-50 border-t rounded-b-xl space-y-2 sm:space-y-3">
                {/* Customer Selector */}
                {customerManagementEnabled && (
                    <div>
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-lg border border-indigo-200">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-xs sm:text-sm text-slate-800 truncate">{selectedCustomer.name}</p>
                                        <p className="text-xs text-slate-500">{selectedCustomer.totalPurchases || 0} achats</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 flex-shrink-0 ml-2"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCustomerModal(true)}
                                className="w-full p-2.5 sm:p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
                            >
                                <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="font-medium text-xs sm:text-sm">Ajouter un client</span>
                            </button>
                        )}
                    </div>
                )}
                <div className="flex justify-between items-center text-lg sm:text-xl font-bold text-slate-800">
                    <span>Total</span>
                    <span>{formatMoney(cartTotal)}</span>
                </div>
                <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={cart.length === 0}
                    className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                >
                    <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                    Valider
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-140px)] relative">
            {/* Grille Produits */}
            <div className="flex-1 flex flex-col gap-3 pb-20 lg:pb-0">
                {/* Search Bar */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 lg:py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-2.5 bg-slate-800 text-white rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                    >
                        <Scan size={18} className="sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Scan</span>
                    </button>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Package size={48} className="mb-3" />
                            <p className="text-sm font-medium">Aucun produit trouvé</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                            {filteredProducts.map(product => {
                                const availableStock = getAvailableProductStock(product, cart, ingredients);
                                const isAvailable = availableStock > 0;

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={!isAvailable}
                                        className={`group relative p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${isAvailable
                                            ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md active:scale-98'
                                            : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex flex-col items-start gap-2 sm:gap-3">
                                            {/* Product Icon */}
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${isAvailable
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                <Package size={20} className="sm:w-6 sm:h-6" />
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 w-full">
                                                <h3 className={`font-bold text-xs sm:text-sm mb-1 line-clamp-2 ${isAvailable ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {product.name}
                                                </h3>
                                                <p className={`text-sm sm:text-base font-bold mb-1.5 sm:mb-2 ${isAvailable ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {formatMoney(product.price)}
                                                </p>
                                                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full inline-block ${isAvailable
                                                    ? availableStock <= 5
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : 'bg-red-50 text-red-600 border border-red-100'
                                                    }`}>
                                                    {isAvailable ? `${availableStock} stock` : 'Rupture'}
                                                </span>
                                            </div>

                                            {/* Add Button */}
                                            {isAvailable && (
                                                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 bg-indigo-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                                    <Plus size={12} className="text-white sm:w-[14px] sm:h-[14px]" />
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

            {/* Desktop Cart */}
            <Card className="hidden lg:flex lg:w-96 flex-col h-full shadow-xl bg-white">
                <CartContent />
            </Card>

            {/* Mobile Cart - Fixed Bottom */}
            <div className="lg:hidden">
                {/* Cart Toggle Button */}
                {!showMobileCart && (
                    <button
                        onClick={() => setShowMobileCart(true)}
                        className="fixed bottom-4 right-4 left-4 bg-indigo-600 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between z-40 active:scale-98 transition-transform"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <ShoppingCart size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Panier</p>
                                <p className="text-xs opacity-90">{cartItemCount} article{cartItemCount > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">{formatMoney(cartTotal)}</p>
                        </div>
                    </button>
                )}

                {/* Mobile Cart Drawer */}
                {showMobileCart && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/40 z-40"
                            onClick={() => setShowMobileCart(false)}
                        />
                        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 flex flex-col max-h-[85vh]">
                            <CartContent isMobile={true} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default POSView;
