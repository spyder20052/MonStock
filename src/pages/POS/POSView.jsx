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
                        filteredProducts.map(product => {
                            const availableStock = getAvailableProductStock(product, cart, ingredients);
                            const cartItem = cart.find(item => item.id === product.id);
                            const qtyInCart = cartItem ? cartItem.qty : 0;
                            const isLowStock = product.isComposite ? availableStock <= 2 : availableStock <= product.minStock;

                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={availableStock <= 0}
                                    className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all group ${availableStock <= 0
                                        ? 'bg-slate-50 opacity-50 cursor-not-allowed border-slate-200'
                                        : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg active:scale-95'
                                        }`}
                                >
                                    {/* Composite badge */}
                                    {product.isComposite && (
                                        <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                                            Composé
                                        </span>
                                    )}

                                    {/* Cart quantity badge */}
                                    {qtyInCart > 0 && (
                                        <span className="absolute top-2 right-8 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500 text-white font-bold">
                                            {qtyInCart} au panier
                                        </span>
                                    )}

                                    {/* Add to cart indicator */}
                                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${availableStock <= 0
                                        ? 'bg-slate-200'
                                        : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                                        }`}>
                                        <Plus size={14} />
                                    </div>

                                    {/* Product name */}
                                    <h4 className={`font-semibold text-slate-800 text-sm line-clamp-2 mb-3 ${product.isComposite ? 'mt-4' : ''} pr-6`}>{product.name}</h4>

                                    {/* Price and stock */}
                                    <div className="flex items-end justify-between w-full mt-auto">
                                        <span className="text-lg font-bold text-slate-800">{formatMoney(product.price)}</span>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${availableStock <= 0
                                            ? 'bg-slate-100 text-slate-500'
                                            : isLowStock
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {availableStock <= 0 ? 'Rupture' : `${availableStock} dispo`}
                                        </span>
                                    </div>
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
