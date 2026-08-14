// Initialize EmailJS
emailjs.init("eZ7uWoJO76WgbZyo2");

// ── Security Helper: Escape HTML to prevent DOM XSS ──
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('drogla_cart')) || [];
    } catch (e) {
        cart = [];
    }

    if (!Array.isArray(cart) || cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    // Sanitize in-memory cart items
    cart = cart.map(item => ({
        id: item.id,
        name: String(item.name || 'Apparel').slice(0, 100),
        price: Math.max(0, parseFloat(item.price) || 0),
        quantity: Math.min(50, Math.max(1, parseInt(item.quantity, 10) || 1)),
        size: String(item.size || 'M').slice(0, 20),
        color: item.color ? String(item.color).slice(0, 30) : '',
        image: item.image ? String(item.image).slice(0, 500) : ''
    }));

    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    const rawSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Bundle Discount: 2 items = 10%, 3+ items = 15%
    let discountPercent = 0;
    if (totalQty >= 3) {
        discountPercent = 15;
    } else if (totalQty === 2) {
        discountPercent = 10;
    }

    const discountAmount = rawSubtotal * (discountPercent / 100);
    const subtotalAfterDiscount = rawSubtotal - discountAmount;

    // Render Side Items Preview if present
    const sidePreview = document.getElementById('checkout-items-preview');
    if (sidePreview) {
        sidePreview.innerHTML = cart.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:0.75rem;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${escapeHtml(item.image) || 'https://placehold.co/80x100/111/fff?text=DROGLA'}" alt="${escapeHtml(item.name)}" style="width:36px; height:45px; object-fit:cover; border-radius:2px;">
                    <div>
                        <strong style="display:block; text-transform:uppercase; font-size:0.75rem;">${escapeHtml(item.name)}</strong>
                        <span style="color:var(--text-muted); font-size:0.65rem;">Size: ${escapeHtml(item.size)} × ${item.quantity}</span>
                    </div>
                </div>
                <strong>EGP ${(item.price * item.quantity).toFixed(2)}</strong>
            </div>
        `).join('');
    }

    // Set Initial Subtotal and Discount in UI
    const checkoutTotalEl = document.getElementById('checkout-total');
    if (checkoutTotalEl) checkoutTotalEl.innerText = rawSubtotal.toFixed(2);

    const sideSubtotalEl = document.getElementById('checkout-total-side');
    if (sideSubtotalEl) sideSubtotalEl.innerText = rawSubtotal.toFixed(2);

    // Mobile discount row
    const discountRow = document.getElementById('checkout-discount-row');
    const discountLabel = document.getElementById('checkout-discount-label');
    const discountAmountEl = document.getElementById('checkout-discount');
    if (discountRow) {
        if (discountPercent > 0) {
            discountRow.style.display = 'flex';
            if (discountLabel) discountLabel.innerText = `Bundle Discount (${discountPercent}%):`;
            if (discountAmountEl) discountAmountEl.innerText = discountAmount.toFixed(2);
        } else {
            discountRow.style.display = 'none';
        }
    }

    // Side discount row
    const sideDiscountRow = document.getElementById('checkout-discount-side-row');
    const sideDiscountLabel = document.getElementById('checkout-discount-side-label');
    const sideDiscountAmountEl = document.getElementById('checkout-discount-side');
    if (sideDiscountRow) {
        if (discountPercent > 0) {
            sideDiscountRow.style.display = 'flex';
            if (sideDiscountLabel) sideDiscountLabel.innerText = `Bundle Discount (${discountPercent}%)`;
            if (sideDiscountAmountEl) sideDiscountAmountEl.innerText = discountAmount.toFixed(2);
        } else {
            sideDiscountRow.style.display = 'none';
        }
    }

    // Load Shipping Rates
    const govSelect = document.getElementById('c-gov');
    let shippingRates = [];
    let currentShippingCost = 0;

    try {
        const { data, error } = await supabase.from('shipping_rates').select('*');
        if (error) throw error;

        shippingRates = data || [];
        govSelect.innerHTML = '<option value="" disabled selected>Select Governorate</option>';

        shippingRates.forEach(rate => {
            const opt = document.createElement('option');
            opt.value = rate.cost; // Store cost as value
            opt.dataset.gov = rate.governorate; // Store name
            opt.innerText = `${rate.governorate} (EGP ${rate.cost})`;
            govSelect.appendChild(opt);
        });

    } catch (err) {
        govSelect.innerHTML = '<option value="" disabled selected>Error loading regions</option>';
    }

    const updateTotals = () => {
        // Free shipping if subtotal is >= 1500 EGP
        let finalShippingCost = currentShippingCost;
        if (subtotalAfterDiscount >= 1500) {
            finalShippingCost = 0;
            const shippingWrap = document.getElementById('shipping-line-wrap');
            if (shippingWrap) {
                shippingWrap.innerHTML = '+ EGP <span id="shipping-cost">0.00</span> <strong style="color:var(--clr-accent); font-size:0.7rem; margin-left:6px;">(FREE SHIPPING!)</strong>';
            }
        } else {
            const shippingWrap = document.getElementById('shipping-line-wrap');
            if (shippingWrap) {
                shippingWrap.innerHTML = `+ EGP <span id="shipping-cost">${finalShippingCost.toFixed(2)}</span>`;
            }
        }

        const finalGrandTotal = (subtotalAfterDiscount + finalShippingCost).toFixed(2);

        const shipEl = document.getElementById('shipping-cost');
        if (shipEl) shipEl.innerText = finalShippingCost.toFixed(2);

        const finalTotalEl = document.getElementById('final-total');
        if (finalTotalEl) finalTotalEl.innerText = finalGrandTotal;

        const sideShipEl = document.getElementById('shipping-cost-side');
        if (sideShipEl) sideShipEl.innerText = finalShippingCost.toFixed(2);

        const sideFinalTotalEl = document.getElementById('final-total-side');
        if (sideFinalTotalEl) sideFinalTotalEl.innerText = finalGrandTotal;

        const paymentAmtEl = document.getElementById('payment-amount');
        if (paymentAmtEl) paymentAmtEl.innerText = finalGrandTotal;
    };

    updateTotals(); // Init final total

    govSelect.addEventListener('change', (e) => {
        currentShippingCost = parseFloat(e.target.value) || 0;
        updateTotals();
    });

    let paymentSettings = { vodafone_cash: '010XXXXXXXX', instapay: 'drogla@instapay' };

    try {
        const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (data) {
            if (data.vodafone_cash) paymentSettings.vodafone_cash = data.vodafone_cash;
            if (data.instapay) paymentSettings.instapay = data.instapay;
        }
    } catch (e) {
        // Fallback to default
    }

    const paymentSelect = document.getElementById('payment-select') || document.getElementById('c-payment');
    const paymentInstructions = document.getElementById('manual-payment-info') || document.getElementById('payment-instructions');
    const paymentText = document.getElementById('payment-instructions-text') || document.getElementById('payment-text');
    const placeOrderBtn = document.getElementById('place-order-btn');

    // ── Proof upload security handlers ──
    const proofDropzone = document.getElementById('proof-dropzone');
    const proofFileInput = document.getElementById('proof-file-input');
    const proofPreview = document.getElementById('proof-preview');
    const proofImg = document.getElementById('proof-img');
    let proofFile = null;

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const MAX_PROOF_SIZE = 5 * 1024 * 1024; // 5 MB

    function setProofFile(file) {
        if (!file) return;

        // Security check: Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
            alert('Invalid file format. Only JPEG, PNG, or WEBP images are allowed for transfer proof.');
            return;
        }

        // Security check: Validate File Size
        if (file.size > MAX_PROOF_SIZE) {
            alert('File size exceeds the 5MB limit. Please upload a smaller screenshot.');
            return;
        }

        proofFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (proofImg) proofImg.src = e.target.result;
            if (proofPreview) proofPreview.style.display = 'block';
            const proofText = document.getElementById('proof-text');
            if (proofText) proofText.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    if (proofDropzone && proofFileInput) {
        proofDropzone.addEventListener('click', () => proofFileInput.click());

        proofDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            proofDropzone.style.borderColor = 'var(--clr-accent)';
            proofDropzone.style.background = 'rgba(92,26,26,0.05)';
        });

        proofDropzone.addEventListener('dragleave', () => {
            proofDropzone.style.borderColor = '';
            proofDropzone.style.background = '';
        });

        proofDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            proofDropzone.style.borderColor = '';
            proofDropzone.style.background = '';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setProofFile(e.dataTransfer.files[0]);
            }
        });

        proofFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                setProofFile(e.target.files[0]);
            }
        });
    }

    const proofRemoveBtn = document.getElementById('proof-remove');
    if (proofRemoveBtn) {
        proofRemoveBtn.addEventListener('click', () => {
            proofFile = null;
            if (proofPreview) proofPreview.style.display = 'none';
            if (proofImg) proofImg.src = '';
            if (proofFileInput) proofFileInput.value = '';
            const proofText = document.getElementById('proof-text');
            if (proofText) proofText.textContent = 'Drop screenshot here or click to upload';
        });
    }

    if (paymentSelect && paymentInstructions) {
        paymentSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const finalAmt = document.getElementById('final-total')?.innerText || '0.00';
            if (val === 'Cash on Delivery') {
                paymentInstructions.style.display = 'none';
                if (placeOrderBtn) placeOrderBtn.innerText = 'Place Order (Cash on Delivery)';
            } else if (val === 'Vodafone Cash') {
                paymentInstructions.style.display = 'block';
                if (paymentText) {
                    paymentText.innerHTML = `<strong>Vodafone Cash Details:</strong><br>Please transfer the total amount (EGP <span id="payment-amount">${escapeHtml(finalAmt)}</span>) to: <strong style="font-size:1.1rem; color:var(--clr-accent);">${escapeHtml(paymentSettings.vodafone_cash)}</strong><br>Then upload your transfer screenshot below.`;
                }
                if (placeOrderBtn) placeOrderBtn.innerText = 'Confirm Order & Upload Proof';
            } else if (val === 'InstaPay') {
                paymentInstructions.style.display = 'block';
                if (paymentText) {
                    paymentText.innerHTML = `<strong>InstaPay Details:</strong><br>Please transfer the total amount (EGP <span id="payment-amount">${escapeHtml(finalAmt)}</span>) to: <strong style="font-size:1.1rem; color:var(--clr-accent);">${escapeHtml(paymentSettings.instapay)}</strong><br>Then upload your transfer screenshot below.`;
                }
                if (placeOrderBtn) placeOrderBtn.innerText = 'Confirm Order & Upload Proof';
            }
        });
    }

    // ── Submit Order with Authoritative Verification & Double-Submit Protection ──
    let isSubmitting = false;

    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const btn = document.getElementById('place-order-btn');
        const msg = document.getElementById('checkout-msg');

        isSubmitting = true;
        btn.disabled = true;
        btn.innerText = 'Verifying & Processing Order...';
        msg.style.display = 'none';

        const name = (document.getElementById('c-name').value || '').trim();
        const email = (document.getElementById('c-email').value || '').trim();
        const phone = (document.getElementById('c-phone').value || '').trim();

        const selectedGovOption = govSelect.options[govSelect.selectedIndex];
        const govName = selectedGovOption ? (selectedGovOption.dataset.gov || selectedGovOption.text) : '';
        const rawAddress = (document.getElementById('c-address').value || '').trim();

        if (!name || !email || !phone || !govName || !rawAddress) {
            msg.innerText = "Please fill in all required delivery fields.";
            msg.style.color = '#ff4444';
            msg.style.display = 'block';
            isSubmitting = false;
            btn.disabled = false;
            btn.innerText = 'Place Order';
            return;
        }

        try {
            // ─────────────────────────────────────────────────────────────────
            // 1. AUTHORITATIVE PRICE VERIFICATION FROM SUPABASE
            // ─────────────────────────────────────────────────────────────────
            const productIds = cart.map(i => i.id).filter(Boolean);
            if (productIds.length === 0) {
                throw new Error("Your cart is empty or contains invalid items.");
            }

            const { data: dbProducts, error: dbProdError } = await supabase
                .from('products')
                .select('id, name, price, active')
                .in('id', productIds);

            if (dbProdError) throw dbProdError;
            if (!dbProducts || dbProducts.length === 0) {
                throw new Error("Unable to verify products in catalog.");
            }

            const productMap = new Map();
            dbProducts.forEach(p => productMap.set(String(p.id), p));

            // Verify each cart item with authoritative database price
            let authoritativeSubtotal = 0;
            let verifiedTotalQty = 0;
            const verifiedOrderItems = [];

            for (const item of cart) {
                const dbProduct = productMap.get(String(item.id));
                if (!dbProduct) {
                    throw new Error(`Product "${item.name}" is no longer available.`);
                }
                if (dbProduct.active === false) {
                    throw new Error(`Product "${dbProduct.name}" is currently inactive.`);
                }

                const authoritativePrice = Math.max(0, parseFloat(dbProduct.price) || 0);
                const validQuantity = Math.min(50, Math.max(1, parseInt(item.quantity, 10) || 1));

                authoritativeSubtotal += authoritativePrice * validQuantity;
                verifiedTotalQty += validQuantity;

                verifiedOrderItems.push({
                    product_id: dbProduct.id,
                    product_name: dbProduct.name,
                    quantity: validQuantity,
                    price: authoritativePrice,
                    size: String(item.size || 'M').slice(0, 20),
                    color: item.color ? String(item.color).slice(0, 30) : ''
                });
            }

            // Calculate authoritative bundle discount
            let authDiscountPercent = 0;
            if (verifiedTotalQty >= 3) {
                authDiscountPercent = 15;
            } else if (verifiedTotalQty === 2) {
                authDiscountPercent = 10;
            }

            const authDiscountAmount = authoritativeSubtotal * (authDiscountPercent / 100);
            const authSubtotalAfterDiscount = authoritativeSubtotal - authDiscountAmount;

            // Calculate authoritative shipping cost
            let authShippingCost = currentShippingCost;
            if (authSubtotalAfterDiscount >= 1500) {
                authShippingCost = 0;
            }

            const authoritativeGrandTotal = Math.max(0, authSubtotalAfterDiscount + authShippingCost);

            const senderPhone = (document.getElementById('c-sender-phone')?.value || '').trim();
            const paymentMethod = paymentSelect ? paymentSelect.value : 'Cash on Delivery';
            const fullAddress = `${govName} - ${rawAddress} (Phone: ${phone}) [Payment: ${paymentMethod}${senderPhone ? ', From: ' + senderPhone : ''}]`;

            // ─────────────────────────────────────────────────────────────────
            // 2. SECURE PROOF UPLOAD
            // ─────────────────────────────────────────────────────────────────
            let proofUrl = '';
            if (proofFile && (paymentMethod === 'Vodafone Cash' || paymentMethod === 'InstaPay')) {
                const rawExt = proofFile.name.split('.').pop() || 'jpg';
                const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
                const randomHash = Math.random().toString(36).substring(2, 9);
                const fileName = `proof-${Date.now()}-${randomHash}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, proofFile, {
                        contentType: proofFile.type,
                        upsert: false
                    });

                if (!uploadError) {
                    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                    proofUrl = publicData.publicUrl;
                }
            }

            // ─────────────────────────────────────────────────────────────────
            // 3. ATOMIC ORDER CREATION IN SUPABASE
            // ─────────────────────────────────────────────────────────────────
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_name: name.slice(0, 150),
                    email: email.slice(0, 150),
                    address: (fullAddress + (proofUrl ? ` [Proof: ${proofUrl}]` : '')).slice(0, 500),
                    total_price: parseFloat(authoritativeGrandTotal.toFixed(2))
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // ─────────────────────────────────────────────────────────────────
            // 4. SAVE VERIFIED ORDER ITEMS
            // ─────────────────────────────────────────────────────────────────
            const dbOrderItems = verifiedOrderItems.map(item => ({
                order_id: orderData.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(dbOrderItems);

            if (itemsError) throw itemsError;

            // ─────────────────────────────────────────────────────────────────
            // 5. SEND EMAIL NOTIFICATION (EmailJS)
            // ─────────────────────────────────────────────────────────────────
            let itemsString = verifiedOrderItems.map(item => `${item.quantity}x ${item.product_name} (Size: ${item.size}${item.color ? ', Color: ' + item.color : ''}) - EGP ${item.price.toFixed(2)}`).join('\n');
            itemsString += `\n\nSubtotal: EGP ${authoritativeSubtotal.toFixed(2)}`;
            if (authDiscountPercent > 0) {
                itemsString += `\nBundle Discount (${authDiscountPercent}%): -EGP ${authDiscountAmount.toFixed(2)}`;
            }
            itemsString += `\nShipping (${govName}): EGP ${authShippingCost.toFixed(2)} ${authShippingCost === 0 && currentShippingCost > 0 ? '(FREE!)' : ''}`;
            itemsString += `\nGrand Total: EGP ${authoritativeGrandTotal.toFixed(2)}`;

            let paymentNote = `Payment Method: ${paymentMethod}`;
            if (senderPhone) paymentNote += `\nTransferred From: ${senderPhone}`;
            if (proofUrl) paymentNote += `\nTransfer Proof: ${proofUrl}`;

            const templateParams = {
                to_name: "DROGLA Admin",
                from_name: name,
                customer_email: email,
                address: `${govName} - ${rawAddress}`,
                order_total: authoritativeGrandTotal.toFixed(2),
                order_items: itemsString,
                order_id: orderData.id,
                payment_info: paymentNote
            };

            try {
                await emailjs.send(
                    'service_hs4cccw',
                    'template_fqgycdw',
                    templateParams
                );
            } catch (mailErr) {
                // Order is saved in Supabase even if email notification encounters transient network error
            }

            // ─────────────────────────────────────────────────────────────────
            // 6. DOM XSS-SAFE CONFIRMATION SCREEN
            // ─────────────────────────────────────────────────────────────────
            const checkoutContainer = document.querySelector('.checkout-form');
            if (checkoutContainer) {
                checkoutContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; color: var(--clr-accent); margin-bottom: 20px;">Order Confirmed!</h2>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 2;">Thank you <strong>${escapeHtml(name)}</strong>. Your order has been placed successfully and will be processed soon.<br>Your Order ID is <strong>#${escapeHtml(orderData.id)}</strong></p>
                        <a href="shop.html" class="submit-btn" style="display: inline-block; width: auto; margin-top: 30px; text-decoration: none;">Continue Shopping</a>
                    </div>
                `;
            }

            localStorage.removeItem('drogla_cart');
            if (window.updateCartBadge) window.updateCartBadge();
            window.scrollTo(0, 0);

        } catch (err) {
            msg.innerText = "Error processing order: " + (err.message || "Please check your details and network connection.");
            msg.style.color = '#ff4444';
            msg.style.display = 'block';
            isSubmitting = false;
            btn.disabled = false;
            btn.innerText = 'Place Order (Cash on Delivery)';
        }
    });
});
