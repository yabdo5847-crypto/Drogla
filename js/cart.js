document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('drogla_cart')) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('drogla_cart', JSON.stringify(cart));
    if (window.updateCartBadge) window.updateCartBadge();
    if (typeof window.renderCartDrawer === 'function') window.renderCartDrawer();
}

function recalculateTotal(cart) {
    const subtotalEl = document.getElementById('subtotal-price');
    const totalEl = document.getElementById('total-price');
    const discountRow = document.getElementById('discount-row');
    const discountLabel = document.getElementById('discount-label');
    const discountAmountEl = document.getElementById('discount-amount');
    const promoNudge = document.getElementById('promo-nudge');
    const totalMirrorEl = document.getElementById('total-price-mirror');
    const bagCount = document.getElementById('bag-count');

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Tiered Bundle Offer Calculation
    let bundleTargetPrice = subtotal;
    let bundleLabelText = '';

    if (totalQty === 2) {
        bundleTargetPrice = 1200;
        bundleLabelText = 'Bundle Offer (2 for 1200 EGP)';
    } else if (totalQty === 3) {
        bundleTargetPrice = 1600;
        bundleLabelText = 'Bundle Offer (3 for 1600 EGP)';
    } else if (totalQty === 4) {
        bundleTargetPrice = 2000;
        bundleLabelText = 'Bundle Offer (4 for 2000 EGP)';
    } else if (totalQty > 4) {
        bundleTargetPrice = 2000 + ((totalQty - 4) * 500);
        bundleLabelText = `Bundle Offer (${totalQty} items)`;
    }

    const discountAmount = Math.max(0, subtotal - bundleTargetPrice);
    const finalTotal = subtotal - discountAmount;

    if (bagCount) bagCount.textContent = totalQty + ' Item' + (totalQty !== 1 ? 's' : '');
    if (subtotalEl) subtotalEl.innerText = subtotal.toFixed(2);
    if (totalEl) totalEl.innerText = finalTotal.toFixed(2);
    if (totalMirrorEl) totalMirrorEl.innerText = finalTotal.toFixed(2);

    if (discountRow) {
        if (discountAmount > 0) {
            discountRow.style.display = 'flex';
            if (discountLabel) discountLabel.innerText = bundleLabelText;
            if (discountAmountEl) discountAmountEl.innerText = discountAmount.toFixed(2);
        } else {
            discountRow.style.display = 'none';
        }
    }

    if (promoNudge) {
        if (totalQty === 1) {
            promoNudge.style.display = 'block';
            promoNudge.innerHTML = '🔥 <strong>Add 1 more item</strong> to get <strong>2 items for 1200 EGP</strong> (أي قطعتين بـ 1200 ج)!';
        } else if (totalQty === 2) {
            promoNudge.style.display = 'block';
            promoNudge.innerHTML = '🎉 <strong>Offer Applied (2 for 1200 EGP)!</strong> Add 1 more item for <strong>3 for 1600 EGP</strong>!';
        } else if (totalQty === 3) {
            promoNudge.style.display = 'block';
            promoNudge.innerHTML = '🎉 <strong>Offer Applied (3 for 1600 EGP)!</strong> Add 1 more item for <strong>4 for 2000 EGP</strong>!';
        } else if (totalQty >= 4) {
            promoNudge.style.display = 'block';
            promoNudge.innerHTML = '🚀 <strong>Maximum Bundle Offer Applied!</strong> Enjoy your savings.';
        } else {
            promoNudge.style.display = 'none';
        }
    }
}

function renderCart() {
    const cart = getCart();
    const container = document.getElementById('cart-container');
    const summary = document.getElementById('cart-summary');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:5rem 1.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#c4c0b8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1.25rem;">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                    <path d="M3 6h18"></path>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <p style="font-size:1rem; color:var(--text-muted); margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.08em; font-weight:600;">Your bag is empty</p>
                <a href="/shop" class="dg-checkout-btn" style="width:auto; padding:0.85rem 2.5rem; font-size:0.75rem;">Explore Collection →</a>
            </div>
        `;
        if (summary) summary.style.display = 'none';
        const bagCount = document.getElementById('bag-count');
        if (bagCount) bagCount.textContent = '0 Items';
        return;
    }

    // Build the cart list
    container.innerHTML = '<div class="dg-cart-list"></div>';
    const list = container.querySelector('.dg-cart-list');

    cart.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'dg-cart-item';

        itemEl.innerHTML = `
            <img src="${item.image || 'https://placehold.co/90x115/111010/f5f3f0?text=DROGLA'}" alt="${item.name}" class="dg-cart-item-img">
            <div class="dg-cart-item-meta">
                <h3 class="dg-cart-item-name">${item.name}</h3>
                <div class="dg-cart-item-size">Size: ${item.size}${item.color ? ' · ' + item.color : ''}</div>
                <div class="dg-cart-item-price">EGP ${parseFloat(item.price).toFixed(2)}</div>
            </div>
            <div class="dg-cart-item-actions">
                <div class="dg-cart-stepper">
                    <button type="button" class="dg-cart-step-btn qty-minus" data-index="${index}" aria-label="Decrease quantity">−</button>
                    <span class="dg-cart-step-qty qty-display">${item.quantity}</span>
                    <button type="button" class="dg-cart-step-btn qty-plus" data-index="${index}" aria-label="Increase quantity">+</button>
                </div>
                <span class="dg-cart-item-subtotal item-subtotal">EGP ${(item.price * item.quantity).toFixed(2)}</span>
                <button type="button" class="dg-cart-remove-btn remove-btn" data-index="${index}" title="Remove item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        list.appendChild(itemEl);
    });

    // Render total and show summary
    recalculateTotal(cart);
    if (summary) summary.style.display = 'block';

    // ── Event listeners ──
    // Qty minus
    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            const cart = getCart();
            if (cart[idx].quantity > 1) {
                cart[idx].quantity -= 1;
                saveCart(cart);
                const itemEl = list.children[idx];
                itemEl.querySelector('.qty-display').textContent = cart[idx].quantity;
                itemEl.querySelector('.item-subtotal').textContent =
                    `EGP ${(cart[idx].price * cart[idx].quantity).toFixed(2)}`;
                recalculateTotal(cart);
            } else {
                cart.splice(idx, 1);
                saveCart(cart);
                renderCart();
            }
        });
    });

    // Qty plus
    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            const cart = getCart();
            cart[idx].quantity += 1;
            saveCart(cart);
            const itemEl = list.children[idx];
            itemEl.querySelector('.qty-display').textContent = cart[idx].quantity;
            itemEl.querySelector('.item-subtotal').textContent =
                `EGP ${(cart[idx].price * cart[idx].quantity).toFixed(2)}`;
            recalculateTotal(cart);
        });
    });

    // Remove
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            const cart = getCart();
            cart.splice(idx, 1);
            saveCart(cart);
            renderCart();
        });
    });
}
