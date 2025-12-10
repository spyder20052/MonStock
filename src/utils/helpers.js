export const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

export const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('fr-FR');
};

export const getIngredientAvailableStock = (ingredient) => {
    if (!ingredient) return 0;
    if (ingredient.trackingType === 'quantity') {
        return ingredient.stock || 0;
    } else {
        // Pour usage: bouteilles pleines * usages/bouteille + usages restants sur bouteille en cours
        const fullUnitsTotal = (ingredient.fullUnits || 0) * (ingredient.usagesPerUnit || 1);
        const currentUsages = ingredient.currentUnitUsages || 0;
        return fullUnitsTotal + currentUsages;
    }
};

export const isIngredientLow = (ingredient) => {
    if (!ingredient) return false;
    if (ingredient.trackingType === 'quantity') {
        return (ingredient.stock || 0) < (ingredient.minStock || 5);
    } else {
        return (ingredient.fullUnits || 0) < (ingredient.minFullUnits || 2);
    }
};

export const loadQrScript = () => {
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

export const getProductStock = (product, ingredients) => {
    if (!product) return 0;
    if (product.isComposite) {
        if (!product.recipe || product.recipe.length === 0) return 0;
        let minStock = Infinity;
        for (const item of product.recipe) {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            if (!ingredient) return 0;
            const available = getIngredientAvailableStock(ingredient);
            const possible = Math.floor(available / item.quantityPerProduct);
            minStock = Math.min(minStock, possible);
        }
        return minStock === Infinity ? 0 : minStock;
    }
    return product.stock || 0;
};

export const getAvailableProductStock = (product, cart, ingredients) => {
    if (!product.isComposite) {
        const cartItem = cart.find(item => item.id === product.id);
        const qtyInCart = cartItem ? cartItem.qty : 0;
        return (product.stock || 0) - qtyInCart;
    }

    if (!product.recipe || product.recipe.length === 0) return 0;

    // Calculate total ingredient usage by all items in cart
    const cartIngredientUsage = {};
    cart.forEach(item => {
        if (item.isComposite && item.recipe) {
            item.recipe.forEach(r => {
                cartIngredientUsage[r.ingredientId] = (cartIngredientUsage[r.ingredientId] || 0) + (r.quantityPerProduct * item.qty);
            });
        }
    });

    let minStock = Infinity;
    for (const recipeItem of product.recipe) {
        const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
        if (!ingredient) return 0;

        const totalAvailable = getIngredientAvailableStock(ingredient);
        const usedByCart = cartIngredientUsage[recipeItem.ingredientId] || 0;
        const remaining = totalAvailable - usedByCart;
        const possibleProducts = Math.floor(remaining / recipeItem.quantityPerProduct);
        minStock = Math.min(minStock, possibleProducts);
    }
    return minStock === Infinity ? 0 : Math.max(0, minStock);
};
