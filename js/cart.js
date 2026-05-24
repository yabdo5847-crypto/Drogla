document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

function getCart() {
    return JSON.parse(localStorage.getItem('drogla_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('drogla_cart', JSON.stringify(cart));
}

function recalculateTotal(cart) {
    const totalEl = document.getElementById('total-price');
    if (!totalEl) return;
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalEl.innerText = total.toFixed(2);
}

function renderCart() {
    const cart = getCart();
    const container = document.getElementById('cart-container');
    const summary = document.getElementById('cart-summary');
    const totalEl = document.getElementById('total-price');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 24px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(110,108,105,0.4)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <p style="font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 300; color: var(--text-main); letter-spacing: 0.05em; margin: 0;">Your bag is empty</p>
                <p style="font-size: 0.8rem; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; margin: 0;">Discover our latest pieces</p>
                <a href="shop.html" style="
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                    padding: 14px 40px;
                    background: var(--burgundy);
                    color: #fff;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 0.7rem;
                    font-weight: 500;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    text-decoration: none;
                    border: 1px solid var(--burgundy);
                    transition: background 0.3s, color 0.3s, transform 0.2s;
                    cursor: pointer;
                " onmouseover="this.style.background='transparent';this.style.color='var(--burgundy)';" onmouseout="this.style.background='var(--burgundy)';this.style.color='#fff';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    Explore Collection
                </a>
            </div>
        `;
        if (summary) summary.style.display = 'none';
        return;
    }

    // Build the cart list
    container.innerHTML = '<div class="cart-list" style="display:flex; flex-direction:column; gap:12px;"></div>';
    const list = container.querySelector('.cart-list');

    cart.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--cream); padding:24px 28px; border-left: 3px solid transparent; transition: border-left 0.3s, box-shadow 0.3s;';

        itemEl.innerHTML = `
            <div class="cart-item-info" style="display:flex; align-items:center; gap:24px; flex:1;">
                <img src="${item.image || 'https://via.placeholder.com/80x100/f5f0eb/5c1a1a?text=DROGLA'}" alt="${item.name}" style="width:80px; height:100px; object-fit:cover; border-radius:2px;">
                <div>
                    <h4 style="font-family:'Cormorant Garamond',serif; font-size:1.2rem; font-weight:400; margin-bottom:4px; color:var(--text-main); letter-spacing:0.02em;">${item.name}</h4>
                    <p style="color:var(--text-muted); font-size:0.6rem; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:8px;">Size: ${item.size}${item.color ? ' · ' + item.color : ''}</p>
                    <p style="font-size:0.82rem; font-weight:500; color:var(--text-main);">EGP ${parseFloat(item.price).toFixed(2)}</p>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:24px;">
                <div style="display:flex; align-items:center; gap:12px; border:1px solid rgba(92,26,26,0.12); padding: 4px 8px;">
                    <button class="qty-minus" data-index="${index}" style="background:none; border:none; cursor:pointer; color:var(--text-muted); width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; transition:color 0.2s;" aria-label="Decrease">−</button>
                    <span class="qty-display" style="font-size:0.85rem; font-weight:600; min-width:20px; text-align:center; color:var(--text-main);">${item.quantity}</span>
                    <button class="qty-plus" data-index="${index}" style="background:none; border:none; cursor:pointer; color:var(--text-muted); width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; transition:color 0.2s;" aria-label="Increase">+</button>
                </div>
                <span class="item-subtotal" style="font-size:0.88rem; font-weight:600; min-width:80px; text-align:right; color:var(--text-main);">EGP ${(item.price * item.quantity).toFixed(2)}</span>
                <button class="remove-btn" data-index="${index}" style="background:none; border:none; cursor:pointer; color:rgba(110,108,105,0.4); transition:color 0.2s; display:flex; padding:4px;" title="Remove item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        `;

        // Hover effect: highlight left border
        itemEl.addEventListener('mouseenter', () => {
            itemEl.style.borderLeft = '3px solid var(--burgundy)';
            itemEl.style.boxShadow = '0 2px 12px rgba(92,26,26,0.07)';
        });
        itemEl.addEventListener('mouseleave', () => {
            itemEl.style.borderLeft = '3px solid transparent';
            itemEl.style.boxShadow = 'none';
        });

        list.appendChild(itemEl);
    });

    // Render total and show summary
    recalculateTotal(cart);
    if (summary) summary.style.display = 'block';

    // ── Event listeners ──────────────────────────────────────────────────────

    // Qty minus
    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            const cart = getCart();
            if (cart[idx].quantity > 1) {
                cart[idx].quantity -= 1;
                saveCart(cart);
                updateCartBadge();

                // Update qty display & subtotal in-place (no full re-render)
                const itemEl = list.children[idx];
                itemEl.querySelector('.qty-display').textContent = cart[idx].quantity;
                itemEl.querySelector('.item-subtotal').textContent =
                    `EGP ${(cart[idx].price * cart[idx].quantity).toFixed(2)}`;
                recalculateTotal(cart);
            }
        });
    });

    // Qty plus
    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            const cart = getCart();
            cart[idx].quantity += 1;
            saveCart(cart);
            updateCartBadge();

            // Update qty display & subtotal in-place (no full re-render)
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
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            const cart = getCart();
            cart.splice(idx, 1);
            saveCart(cart);
            updateCartBadge();
            renderCart(); // full re-render to fix indices
        });
    });
}
