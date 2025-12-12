import React, { useState } from 'react';
import { Search, FileText, Plus, Package, Edit3, Trash2, Download } from 'lucide-react';
import { formatMoney, getProductStock } from '../../utils/helpers';
import ProductFormModal from '../../components/modals/ProductFormModal';
import { PERMISSIONS, hasPermission } from '../../utils/permissions';

const InventoryView = ({
    products,
    ingredients,
    searchTerm,
    setSearchTerm,
    addProduct,
    updateProduct,
    deleteProduct,
    showNotification,
    userProfile
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

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

    const exportStockToCSV = () => {
        const headers = ["Nom", "Prix", "Stock", "Min Stock", "Catégorie", "Type"];
        const rows = filteredProducts.map(p => [
            p.name,
            p.price,
            getProductStock(p, ingredients),
            p.minStock,
            p.category || 'Général',
            p.isComposite ? 'Composé' : 'Simple'
        ].join(","));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `stock_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={exportStockToCSV}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <FileText size={20} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
                        <button
                            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                            className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-200"
                        >
                            <Plus size={20} />
                            <span>Nouveau Produit</span>
                        </button>
                    )}
                </div>
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
                                {(() => {
                                    const stock = getProductStock(product, ingredients);
                                    const isLow = product.isComposite ? stock <= 2 : stock <= product.minStock;
                                    return (
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isLow
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-emerald-100 text-emerald-600'
                                            }`}>
                                            {stock} en stock
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Quick Stock Replenishment */}
                            {hasPermission(userProfile, PERMISSIONS.MANAGE_INVENTORY) && (
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
                            )}

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
                                {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
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
                                )}
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
                            {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map(product => {
                            const stock = getProductStock(product, ingredients);
                            const isLow = product.isComposite ? stock <= 2 : stock <= product.minStock;

                            return (
                                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">{product.name}</span>
                                                    {product.isComposite && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">Composé</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400">Coût: {formatMoney(product.cost)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-800">{formatMoney(product.price)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {product.isComposite ? (
                                            <div>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${stock <= 0 ? 'bg-red-100 text-red-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'
                                                    }`}>
                                                    {stock} disponible{stock !== 1 ? 's' : ''}
                                                </span>
                                                <div className="text-xs text-slate-400 mt-1">{product.recipe?.length || 0} ingrédient(s)</div>
                                            </div>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${isLow
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                {stock} / min {product.minStock}
                                            </span>
                                        )}
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

                                    {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
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
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <ProductFormModal
                    editingProduct={editingProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSave={async (data) => {
                        if (editingProduct) await updateProduct({ ...editingProduct, ...data });
                        else await addProduct(data);
                        setIsModalOpen(false);
                    }}
                    ingredients={ingredients}
                />
            )}
        </div>
    );
};

export default InventoryView;
