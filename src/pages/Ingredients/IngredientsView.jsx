import React, { useState } from 'react';
import { Package, Plus, AlertTriangle, Edit3, Trash2, X, Save } from 'lucide-react';
import Button from '../../components/ui/Button';
import { isIngredientLow, getIngredientAvailableStock } from '../../utils/helpers';
import { PERMISSIONS, hasPermission } from '../../utils/permissions';

const IngredientsView = ({
    ingredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    userProfile
}) => {
    const [showIngredientModal, setShowIngredientModal] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState(null);
    const [ingredientForm, setIngredientForm] = useState({
        name: '',
        trackingType: 'quantity',
        stock: 0,
        minStock: 5,
        fullUnits: 0,
        currentUnitUsages: 0,
        usagesPerUnit: 20,
        minFullUnits: 2,
    });

    const resetForm = () => {
        setIngredientForm({
            name: '',
            trackingType: 'quantity',
            stock: 0,
            minStock: 5,
            fullUnits: 0,
            currentUnitUsages: 0,
            usagesPerUnit: 20,
            minFullUnits: 2,
        });
        setEditingIngredient(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowIngredientModal(true);
    };

    const openEditModal = (ingredient) => {
        setEditingIngredient(ingredient);
        setIngredientForm({
            name: ingredient.name,
            trackingType: ingredient.trackingType,
            stock: ingredient.stock || 0,
            minStock: ingredient.minStock || 5,
            fullUnits: ingredient.fullUnits || 0,
            currentUnitUsages: ingredient.currentUnitUsages || 0,
            usagesPerUnit: ingredient.usagesPerUnit || 20,
            minFullUnits: ingredient.minFullUnits || 2,
        });
        setShowIngredientModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingIngredient) {
            await updateIngredient(editingIngredient.id, ingredientForm);
        } else {
            await addIngredient(ingredientForm);
        }
        setShowIngredientModal(false);
        resetForm();
    };

    const handleDelete = async (ingredient) => {
        if (window.confirm(`Supprimer l'ingrédient "${ingredient.name}" ?`)) {
            await deleteIngredient(ingredient.id);
        }
    };

    // Stats
    const totalIngredients = ingredients.length;
    const lowStockIngredients = ingredients.filter(i => isIngredientLow(i));

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-slate-800">Ingrédients</h1>
                    <p className="text-sm text-slate-500">{totalIngredients} ingrédient{totalIngredients > 1 ? 's' : ''}</p>
                </div>
                {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
                    <Button onClick={openAddModal} className="flex items-center gap-2">
                        <Plus size={18} />
                        Nouvel ingrédient
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Package size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-lg font-bold text-slate-800">{totalIngredients}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${lowStockIngredients.length > 0 ? 'bg-red-100' : 'bg-emerald-100'} rounded-lg flex items-center justify-center`}>
                            <AlertTriangle size={20} className={lowStockIngredients.length > 0 ? 'text-red-600' : 'text-emerald-600'} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Stock bas</p>
                            <p className={`text-lg font-bold ${lowStockIngredients.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowStockIngredients.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockIngredients.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                        <div>
                            <h3 className="font-semibold text-red-800">Ingrédients à réapprovisionner</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {lowStockIngredients.map(ing => (
                                    <span key={ing.id} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                                        {ing.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingredients List */}
            <div className="grid gap-3 lg:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ingredients.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="font-semibold text-slate-600 mb-2">Aucun ingrédient</h3>
                        <p className="text-sm text-slate-400 mb-4">Ajoutez vos premiers ingrédients pour créer des produits composés</p>
                        {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
                            <Button onClick={openAddModal} className="inline-flex items-center gap-2">
                                <Plus size={18} />
                                Ajouter un ingrédient
                            </Button>
                        )}
                    </div>
                ) : (
                    ingredients.map(ingredient => {
                        const isLow = isIngredientLow(ingredient);
                        const availableStock = getIngredientAvailableStock(ingredient);

                        return (
                            <div
                                key={ingredient.id}
                                className={`bg-white rounded-xl border p-4 ${isLow ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{ingredient.name}</h3>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${ingredient.trackingType === 'quantity'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {ingredient.trackingType === 'quantity' ? 'Par quantité' : 'Par utilisation'}
                                        </span>
                                    </div>
                                    {isLow && (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                                            Stock bas
                                        </span>
                                    )}
                                </div>

                                {/* Stock Info */}
                                {ingredient.trackingType === 'quantity' ? (
                                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">Stock</span>
                                            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                                {ingredient.stock} unités
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-slate-400">Minimum</span>
                                            <span className="text-xs text-slate-500">{ingredient.minStock} unités</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">Unités pleines</span>
                                            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                                {ingredient.fullUnits}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-slate-400">Utilisations restantes (en cours)</span>
                                            <span className="text-xs text-purple-600 font-medium">
                                                {ingredient.currentUnitUsages}/{ingredient.usagesPerUnit}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-slate-400">Total disponible</span>
                                            <span className="text-xs text-slate-500">{availableStock} utilisations</span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions - Only for Manage Stock */}
                                {hasPermission(userProfile, PERMISSIONS.MANAGE_STOCK) && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(ingredient)}
                                            className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                        >
                                            <Edit3 size={16} />
                                            Modifier
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ingredient)}
                                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Modal */}
            {showIngredientModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex justify-between items-center bg-indigo-50 sticky top-0">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Package size={20} className="text-indigo-600" />
                                {editingIngredient ? 'Modifier' : 'Nouvel'} ingrédient
                            </h3>
                            <button onClick={() => { setShowIngredientModal(false); resetForm(); }} className="p-1 hover:bg-indigo-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                                <input
                                    type="text"
                                    value={ingredientForm.name}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Ex: Sirop de menthe"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Type de suivi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIngredientForm({ ...ingredientForm, trackingType: 'quantity' })}
                                        className={`p-3 rounded-lg border-2 transition-all text-left ${ingredientForm.trackingType === 'quantity'
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <p className="font-semibold text-sm">Par quantité</p>
                                        <p className="text-xs text-slate-500 mt-1">Gobelets, pipettes...</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIngredientForm({ ...ingredientForm, trackingType: 'usage' })}
                                        className={`p-3 rounded-lg border-2 transition-all text-left ${ingredientForm.trackingType === 'usage'
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <p className="font-semibold text-sm">Par utilisation</p>
                                        <p className="text-xs text-slate-500 mt-1">Bouteilles, pots...</p>
                                    </button>
                                </div>
                            </div>

                            {ingredientForm.trackingType === 'quantity' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Stock actuel</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ingredientForm.stock}
                                                onChange={(e) => setIngredientForm({ ...ingredientForm, stock: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Stock minimum</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ingredientForm.minStock}
                                                onChange={(e) => setIngredientForm({ ...ingredientForm, minStock: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Unités pleines</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ingredientForm.fullUnits}
                                                onChange={(e) => setIngredientForm({ ...ingredientForm, fullUnits: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                                placeholder="Ex: 5 bouteilles"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Utilisations/unité</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={ingredientForm.usagesPerUnit}
                                                onChange={(e) => setIngredientForm({ ...ingredientForm, usagesPerUnit: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                                placeholder="Ex: 20 doses/bouteille"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Utilisations restantes</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ingredientForm.currentUnitUsages}
                                                onChange={(e) => setIngredientForm({ ...ingredientForm, currentUnitUsages: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                                placeholder="Sur l'unité en cours"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Alerte si moins de</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ingredientForm.minFullUnits}
                                                onChange={(e) => setIngredientForm({ ...ingredientForm, minFullUnits: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                                placeholder="Unités pleines"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowIngredientModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientsView;
