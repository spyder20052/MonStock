
import React, { useState } from 'react';
import { X, Plus, Package } from 'lucide-react';
import { getIngredientAvailableStock, isIngredientLow, formatMoney } from '../../utils/helpers';

const ProductFormModal = ({ editingProduct, onClose, onSave, ingredients }) => {
    const [formData, setFormData] = useState({
        name: editingProduct?.name || '',
        cost: editingProduct?.cost || 0,
        price: editingProduct?.price || 0,
        purchasePrice: editingProduct?.purchasePrice || editingProduct?.cost || 0,
        stock: editingProduct?.stock || 0,
        minStock: editingProduct?.minStock || 5,
        isComposite: editingProduct?.isComposite || false,
        recipe: editingProduct?.recipe || [],
    });

    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [ingredientQty, setIngredientQty] = useState(1);

    const addRecipeItem = () => {
        if (!selectedIngredient || ingredientQty <= 0) return;
        const ingredient = ingredients.find(i => i.id === selectedIngredient);
        if (!ingredient) return;

        // Check if already in recipe
        if (formData.recipe.some(r => r.ingredientId === selectedIngredient)) {
            return;
        }

        setFormData({
            ...formData,
            recipe: [...formData.recipe, {
                ingredientId: selectedIngredient,
                ingredientName: ingredient.name,
                quantityPerProduct: ingredientQty,
            }]
        });
        setSelectedIngredient('');
        setIngredientQty(1);
    };

    const removeRecipeItem = (ingredientId) => {
        setFormData({
            ...formData,
            recipe: formData.recipe.filter(r => r.ingredientId !== ingredientId)
        });
    };

    // Calculate available stock for composite products
    const calculateCompositeStock = () => {
        if (!formData.isComposite || formData.recipe.length === 0) return 0;

        let minStock = Infinity;
        for (const item of formData.recipe) {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            if (!ingredient) return 0;

            const available = getIngredientAvailableStock(ingredient);
            const possibleProducts = Math.floor(available / item.quantityPerProduct);
            minStock = Math.min(minStock, possibleProducts);
        }
        return minStock === Infinity ? 0 : minStock;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSave = {
            name: formData.name,
            cost: Number(formData.purchasePrice || 0), // Fix: Save entered purchasePrice as cost
            price: Number(formData.price),
            purchasePrice: Number(formData.purchasePrice || 0),
            isComposite: formData.isComposite,
        };

        if (formData.isComposite) {
            dataToSave.recipe = formData.recipe;
            dataToSave.stock = 0; // Will be calculated dynamically
            dataToSave.minStock = 0;
        } else {
            dataToSave.stock = Number(formData.stock);
            dataToSave.minStock = Number(formData.minStock);
            dataToSave.recipe = [];
        }

        onSave(dataToSave);
        onClose();
    };

    const compositeStock = calculateCompositeStock();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center sticky top-0">
                    <h3 className="font-bold text-lg">{editingProduct ? 'Modifier' : 'Nouveau Produit'}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nom */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Bubble Tea Menthe"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Prix */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Coût d'achat (FCFA)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.purchasePrice || ''}
                                onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="0"
                            />
                            {/* Margin Indicator */}
                            {formData.price > 0 && (
                                <p className={`text-xs mt-1 font-medium ${(formData.price - (formData.purchasePrice || 0)) > 0
                                    ? 'text-emerald-600'
                                    : 'text-red-500'
                                    }`}>
                                    Marge: {formatMoney(formData.price - (formData.purchasePrice || 0))} (
                                    {Math.round(((formData.price - (formData.purchasePrice || 0)) / formData.price) * 100)}%)
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prix Vente (FCFA) *</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Toggle Produit Composé */}
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-purple-800">Produit composé</h4>
                                <p className="text-sm text-purple-600">Ce produit est fabriqué à partir d'ingrédients</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isComposite: !formData.isComposite })}
                                className={`relative w-14 h-7 rounded-full transition-colors ${formData.isComposite ? 'bg-purple-600' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${formData.isComposite ? 'translate-x-7' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Stock fields for non-composite products */}
                    {!formData.isComposite && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Stock actuel</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Alerte minimum</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Recipe Builder for composite products */}
                    {formData.isComposite && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <Package size={18} className="text-purple-600" />
                                    Recette (ingrédients requis)
                                </h4>

                                {/* Add ingredient row */}
                                <div className="space-y-2 mb-3">
                                    <select
                                        value={selectedIngredient}
                                        onChange={(e) => setSelectedIngredient(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                    >
                                        <option value="">Sélectionner un ingrédient...</option>
                                        {ingredients
                                            .filter(i => !formData.recipe.some(r => r.ingredientId === i.id))
                                            .map(i => (
                                                <option key={i.id} value={i.id}>
                                                    {i.name} ({i.trackingType === 'quantity' ? 'par quantité' : 'par utilisation'})
                                                </option>
                                            ))
                                        }
                                    </select>

                                    {selectedIngredient && (() => {
                                        const ing = ingredients.find(i => i.id === selectedIngredient);
                                        if (!ing) return null;
                                        return (
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-slate-500 mb-1">
                                                        {ing.trackingType === 'quantity'
                                                            ? 'Quantité utilisée par produit'
                                                            : 'Doses utilisées par produit'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={ingredientQty}
                                                        onChange={(e) => setIngredientQty(Number(e.target.value))}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                                        placeholder={ing.trackingType === 'quantity' ? 'Ex: 2 unités' : 'Ex: 1 dose'}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addRecipeItem}
                                                    className="self-end px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                                                >
                                                    <Plus size={16} />
                                                    Ajouter
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Recipe items list */}
                                {formData.recipe.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">Ajoutez des ingrédients à la recette</p>
                                ) : (
                                    <div className="space-y-2">
                                        {formData.recipe.map(item => {
                                            const ingredient = ingredients.find(i => i.id === item.ingredientId);
                                            const available = ingredient ? getIngredientAvailableStock(ingredient) : 0;
                                            const isLow = ingredient && isIngredientLow(ingredient);

                                            return (
                                                <div key={item.ingredientId} className={`bg-white rounded-lg p-3 border ${isLow ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`} />
                                                            <div>
                                                                <span className="font-medium text-sm">{item.ingredientName}</span>
                                                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${ingredient?.trackingType === 'quantity'
                                                                    ? 'bg-blue-100 text-blue-600'
                                                                    : 'bg-purple-100 text-purple-600'
                                                                    }`}>
                                                                    {ingredient?.trackingType === 'quantity' ? 'quantité' : 'usage'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRecipeItem(item.ingredientId)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                                <span className="text-purple-800 font-medium text-sm">Stock estimé (selon ingrédients)</span>
                                <span className="text-xl font-bold text-purple-700">{compositeStock}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFormModal;
