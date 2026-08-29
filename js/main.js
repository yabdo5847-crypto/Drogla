// ══════════════════════════════════════════════════════════════════════════
// DROGLA STREETWEAR — MAIN SHARED CONTROLLER & CART DRAWER ENGINE
// ══════════════════════════════════════════════════════════════════════════

// ── State Helpers ──
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('drogla_cart')) || [];
    } catch (e) {
        return [];
    }
}

function setCart(cart) {
    localStorage.setItem('drogla_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartDrawer();
    if (typeof window.recalculateTotal === 'function') window.recalculateTotal();
    if (typeof window.renderCart === 'function') window.renderCart();
}

function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);

    // Update all badges across desktop, mobile and drawers
    const badges = document.querySelectorAll('#cart-count, #cart-count-mobile, #cart-count-mobile-badge, #cart-fab-count, .nav-cart-badge, .dg-badge');
    badges.forEach(b => {
        b.innerText = count;
    });
}

// ── Cart Drawer Architecture ──
function initCartDrawer() {
    if (document.getElementById('dg-cart-drawer')) return;

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'dg-cart-overlay';
    overlay.id = 'dg-cart-overlay';

    // Create Drawer Container
    const drawer = document.createElement('div');
    drawer.className = 'dg-cart-drawer';
    drawer.id = 'dg-cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Shopping Cart Drawer');

    drawer.innerHTML = `
        <div class="dg-cart-header">
            <h2 class="dg-cart-title">Your Cart</h2>
            <button class="dg-cart-close" id="dg-cart-close-btn" aria-label="Close Cart" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="dg-cart-body" id="dg-cart-body"></div>
        <div class="dg-cart-footer" id="dg-cart-footer"></div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // Event Listeners
    overlay.addEventListener('click', closeCartDrawer);
    document.getElementById('dg-cart-close-btn').addEventListener('click', closeCartDrawer);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            closeCartDrawer();
        }
    });

    // Intercept cart icon clicks to open Drawer
    bindCartTriggers();
}

function bindCartTriggers() {
    const cartLinks = document.querySelectorAll('a[href="/cart"], a[href="/cart"], #cartBtn, #cart-count-mobile-badge, #cart-count-mobile, .dg-drawer-bag');
    cartLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // If on cart.html or checkout.html, allow normal navigation or drawer
            if (window.location.pathname.endsWith('checkout.html') || window.location.pathname.endsWith('/checkout')) {
                return; // Let user stay on checkout
            }
            e.preventDefault();
            openCartDrawer();
        });
    });
}

function openCartDrawer() {
    initCartDrawer();
    renderCartDrawer();
    const overlay = document.getElementById('dg-cart-overlay');
    const drawer = document.getElementById('dg-cart-drawer');
    if (overlay && drawer) {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeCartDrawer() {
    const overlay = document.getElementById('dg-cart-overlay');
    const drawer = document.getElementById('dg-cart-drawer');
    if (overlay && drawer) {
        overlay.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function renderCartDrawer() {
    const cart = getCart();
    const bodyEl = document.getElementById('dg-cart-body');
    const footerEl = document.getElementById('dg-cart-footer');
    if (!bodyEl || !footerEl) return;

    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Discount calculations: 2 items = 10%, 3+ items = 15%
    let discountPercent = 0;
    if (totalQty >= 3) {
        discountPercent = 15;
    } else if (totalQty === 2) {
        discountPercent = 10;
    }
    const discountAmount = subtotal * (discountPercent / 100);
    const finalTotal = subtotal - discountAmount;

    if (cart.length === 0) {
        // EMPTY STATE matching reference design
        bodyEl.innerHTML = `
            <div class="dg-cart-empty">
                <svg class="dg-cart-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                    <path d="M3 6h18"></path>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <p class="dg-cart-empty-text">Your cart is empty.</p>
                <a href="/shop" class="dg-cart-shop-btn" id="dg-cart-shop-btn">SHOP NOW</a>
            </div>
        `;

        footerEl.innerHTML = `
            <div class="dg-cart-subtotal-row">
                <span class="dg-cart-subtotal-label">SUBTOTAL</span>
                <span class="dg-cart-subtotal-val">0 جنيه</span>
            </div>
            <a href="/checkout" class="dg-cart-checkout-btn" style="opacity:0.4; pointer-events:none;">CHECKOUT →</a>
            <div class="dg-cart-trust">
                <span>🔒</span>
                <span>Secure Checkout · Free Returns</span>
            </div>
        `;

        const shopBtn = document.getElementById('dg-cart-shop-btn');
        if (shopBtn) {
            shopBtn.addEventListener('click', (e) => {
                closeCartDrawer();
            });
        }
        return;
    }

    // Promo Nudge Banner
    let nudgeHTML = '';
    if (totalQty === 1) {
        nudgeHTML = `<div class="dg-cart-nudge">🔥 <strong>Add 1 more item</strong> to get <strong>10% OFF</strong> your order!</div>`;
    } else if (totalQty === 2) {
        nudgeHTML = `<div class="dg-cart-nudge">🎉 <strong>10% Bundle Discount applied!</strong> Add 1 more item for <strong>15% OFF</strong>!</div>`;
    } else if (totalQty >= 3) {
        nudgeHTML = `<div class="dg-cart-nudge">🚀 <strong>15% Bundle Discount applied!</strong> Maximum savings reached.</div>`;
    }

    // ITEMS LIST
    const itemsHTML = cart.map((item, idx) => `
        <li class="dg-cart-item">
            <img src="${item.image || 'https://placehold.co/80x100/111/fff?text=DROGLA'}" alt="${item.name}" class="dg-cart-item-img">
            <div class="dg-cart-item-info">
                <div>
                    <h3 class="dg-cart-item-name">${item.name}</h3>
                    <div class="dg-cart-item-meta">Size: ${item.size}${item.color ? ' • ' + item.color : ''}</div>
                    <div class="dg-cart-item-price">${(item.price * item.quantity).toFixed(2)} جنيه</div>
                </div>
                <div class="dg-cart-item-controls">
                    <div class="dg-cart-stepper">
                        <button type="button" class="dg-cart-step-btn" data-action="dec" data-index="${idx}" aria-label="Decrease quantity">−</button>
                        <span class="dg-cart-step-qty">${item.quantity}</span>
                        <button type="button" class="dg-cart-step-btn" data-action="inc" data-index="${idx}" aria-label="Increase quantity">+</button>
                    </div>
                    <button type="button" class="dg-cart-item-remove" data-action="remove" data-index="${idx}">Remove</button>
                </div>
            </div>
        </li>
    `).join('');

    bodyEl.innerHTML = `
        ${nudgeHTML}
        <ul class="dg-cart-items">
            ${itemsHTML}
        </ul>
    `;

    // FOOTER
    let discountHTML = '';
    if (discountPercent > 0) {
        discountHTML = `
            <div class="dg-cart-discount-row">
                <span>Bundle Discount (${discountPercent}%)</span>
                <span>-${discountAmount.toFixed(2)} جنيه</span>
            </div>
        `;
    }

    footerEl.innerHTML = `
        <div class="dg-cart-subtotal-row">
            <span class="dg-cart-subtotal-label">SUBTOTAL</span>
            <span class="dg-cart-subtotal-val">${finalTotal.toFixed(2)} جنيه</span>
        </div>
        ${discountHTML}
        <a href="/checkout" class="dg-cart-checkout-btn">CHECKOUT →</a>
        <div class="dg-cart-trust">
            <span>🔒</span>
            <span>Secure Checkout · Free Returns</span>
        </div>
    `;

    // Bind quantity steppers and remove buttons
    bodyEl.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const index = parseInt(btn.dataset.index, 10);
            const currentCart = getCart();

            if (action === 'inc') {
                currentCart[index].quantity += 1;
                setCart(currentCart);
            } else if (action === 'dec') {
                if (currentCart[index].quantity > 1) {
                    currentCart[index].quantity -= 1;
                    setCart(currentCart);
                } else {
                    currentCart.splice(index, 1);
                    setCart(currentCart);
                }
            } else if (action === 'remove') {
                currentCart.splice(index, 1);
                setCart(currentCart);
            }
        });
    });
}

// Global exports
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.renderCartDrawer = renderCartDrawer;
window.updateCartBadge = updateCartBadge;
window.getCart = getCart;
window.setCart = setCart;

// ── DOM Initialization ──
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    initCartDrawer();

    // Theme Toggle Logic
    const themeBtns = document.querySelectorAll('#theme-toggle, #theme-toggle-mobile, .theme-btn');
    const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

    const updateThemeIcons = (isDark) => {
        themeBtns.forEach(btn => {
            btn.innerHTML = isDark ? sunSVG : moonSVG;
        });
    };

    const isCurrentDark = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
    updateThemeIcons(isCurrentDark);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            document.documentElement.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('drogla_theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        });
    });
});
