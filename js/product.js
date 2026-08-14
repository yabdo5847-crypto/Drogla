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
    // ─────────────────────────────────────────────────────────────────────────
    // 1. SKELETON LOADING STATE — shown immediately before any fetch
    // ─────────────────────────────────────────────────────────────────────────
    const mediaMain = document.getElementById('product-media-main');
    const productNameEl = document.getElementById('product-name');
    const productPriceEl = document.getElementById('product-price');
    const productDescEl = document.getElementById('product-desc');

    // Inject skeleton into media container
    if (mediaMain) {
        mediaMain.innerHTML = `
            <div class="skeleton-img" style="
                width: 100%;
                aspect-ratio: 3/4;
                border-radius: 6px;
                background: linear-gradient(90deg, #1e1e22 25%, #2a2a30 50%, #1e1e22 75%);
                background-size: 200% 100%;
                animation: skeleton-shimmer 1.4s infinite linear;
            "></div>
        `;
    }

    // Helper: replace an element's content with skeleton lines
    const skeletonLines = (widths = ['80%', '50%']) => widths.map(w => `
        <div class="skeleton-line" style="
            height: 1em;
            width: ${w};
            margin-bottom: 0.5em;
            border-radius: 4px;
            background: linear-gradient(90deg, #1e1e22 25%, #2a2a30 50%, #1e1e22 75%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.4s infinite linear;
        "></div>
    `).join('');

    if (productNameEl) productNameEl.innerHTML = skeletonLines(['70%']);
    if (productPriceEl) productPriceEl.innerHTML = skeletonLines(['35%']);
    if (productDescEl)  productDescEl.innerHTML  = skeletonLines(['100%', '90%', '60%']);

    // Inject shimmer keyframes once into <head> if not already present
    if (!document.getElementById('skeleton-keyframes')) {
        const style = document.createElement('style');
        style.id = 'skeleton-keyframes';
        style.textContent = `
            @keyframes skeleton-shimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. URL PARAM PARSING (Supports ?id=123 and /product/123)
    // ─────────────────────────────────────────────────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    let productId = urlParams.get('id');

    if (!productId) {
        // Fallback: Check path segments for /product/:id
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const prodIdx = pathSegments.indexOf('product');
        if (prodIdx !== -1 && pathSegments[prodIdx + 1]) {
            productId = decodeURIComponent(pathSegments[prodIdx + 1]);
        }
    }

    if (!productId) {
        const loader = document.getElementById('loader');
        if (loader) loader.innerText = 'Product not found.';
        return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: show inline error (falls back to alert)
    // ─────────────────────────────────────────────────────────────────────────
    const showError = (msg) => {
        const errEl = document.getElementById('product-error-msg');
        if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
            // Auto-hide after 3.5 s
            setTimeout(() => {
                errEl.style.display = 'none';
                errEl.textContent = '';
            }, 3500);
        } else {
            alert(msg);
        }
    };

    try {
        // ─────────────────────────────────────────────────────────────────────
        // 3. SUPABASE FETCH
        // ─────────────────────────────────────────────────────────────────────
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        // Hide old loader, show product wrapper
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('active');
        const productSection = document.getElementById('single-product');
        if (productSection) productSection.style.display = 'flex';

        // ─────────────────────────────────────────────────────────────────────
        // 4. POPULATE TEXT & DYNAMIC PRICING
        // ─────────────────────────────────────────────────────────────────────
        const fadeIn = (el, content, isHTML = false) => {
            if (!el) return;
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity    = '0';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (isHTML) {
                        el.innerHTML = content;
                    } else {
                        el.textContent = content;
                    }
                    el.style.opacity = '1';
                });
            });
        };

        const numPrice = parseFloat(product.price) || 560;
        document.title = `${product.name} | DROGLA`;
        fadeIn(productNameEl, product.name);
        fadeIn(productPriceEl, `LE ${numPrice.toFixed(2)}`);
        
        const oldPriceEl = document.getElementById('product-old-price');
        if (oldPriceEl) {
            const oldPrice = numPrice * 1.25;
            oldPriceEl.textContent = `LE ${oldPrice.toFixed(2)}`;
        }

        const descBody = document.getElementById('product-desc-body');
        if (descBody) {
            const defaultDesc = '• Premium heavyweight cotton (260 GSM) for a structured streetwear silhouette.<br>• Soft, breathable, pre-shrunk combed fabric for all-day comfort.<br>• Oversized boxy drape with reinforced neckband and twin needle stitching.';
            descBody.innerHTML = `<p>${product.description ? escapeHtml(product.description).replace(/\n/g, '<br>') : defaultDesc}</p>`;
        }

        // Dynamic Shipping Dates
        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatDate = (d) => `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

        const dPlaced = new Date(now);
        const dDispStart = new Date(now.getTime() + 1 * 86400000);
        const dDispEnd = new Date(now.getTime() + 2 * 86400000);
        const dDelStart = new Date(now.getTime() + 3 * 86400000);
        const dDelEnd = new Date(now.getTime() + 5 * 86400000);

        const stepOrder = document.getElementById('step-order-date');
        const stepDisp = document.getElementById('step-dispatch-date');
        const stepDel = document.getElementById('step-delivery-date');
        if (stepOrder) stepOrder.textContent = formatDate(dPlaced);
        if (stepDisp) stepDisp.textContent = `${formatDate(dDispStart)} – ${formatDate(dDispEnd)}`;
        if (stepDel) stepDel.textContent = `${formatDate(dDelStart)} – ${formatDate(dDelEnd)}`;

        // ─────────────────────────────────────────────────────────────────────
        // 5. COLOR & SIZE SELECTORS (MAVIN SYSTEM)
        // ─────────────────────────────────────────────────────────────────────
        const sizeContainer = document.getElementById('size-container');
        const colorWrapper = document.getElementById('color-wrapper');
        const colorContainer = document.getElementById('color-container');
        const colorLabel = document.getElementById('selected-color-label');
        const sizeBadge = document.getElementById('mavin-size-badge');
        const cartBtn = document.getElementById('add-to-cart-btn');

        let selectedSize = null;
        let selectedColor = null;

        function updateCartButtonState() {
            if (!cartBtn) return;
            if (selectedSize) {
                cartBtn.textContent = `ADD TO BAG — LE ${numPrice.toFixed(2)}`;
                cartBtn.classList.add('ready');
            } else {
                cartBtn.textContent = 'SELECT A SIZE';
                cartBtn.classList.remove('ready');
            }
        }

        const images = product.image
            ? product.image.split(',').map(i => i.trim()).filter(i => i !== '')
            : [];
        const firstImage = (images && images.length > 0)
            ? images[0].trim()
            : 'https://placehold.co/800x1000/16161a/ffffff?text=DROGLA';

        function renderSizesForVariant(variant) {
            sizeContainer.innerHTML = '';
            selectedSize = null;
            if (sizeBadge) sizeBadge.textContent = 'SELECT SIZE';
            updateCartButtonState();

            if (!variant || !variant.sizes || Object.keys(variant.sizes).length === 0) {
                const defaultSizes = ['S', 'M', 'L', 'XL', 'XXL'];
                defaultSizes.forEach(s => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'mavin-size-box';
                    btn.innerText = s;
                    btn.onclick = () => {
                        sizeContainer.querySelectorAll('.mavin-size-box').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        selectedSize = s;
                        if (sizeBadge) sizeBadge.textContent = `${s} SIZE`;
                        updateCartButtonState();
                    };
                    sizeContainer.appendChild(btn);
                });
                return;
            }

            Object.entries(variant.sizes).forEach(([s, q]) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mavin-size-box';
                btn.innerText = s;

                if (q <= 0) {
                    btn.disabled = true;
                    btn.title = 'Sold Out';
                } else {
                    btn.onclick = () => {
                        sizeContainer.querySelectorAll('.mavin-size-box').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        selectedSize = s;
                        if (sizeBadge) sizeBadge.textContent = `${s} SIZE`;
                        updateCartButtonState();
                    };
                }
                sizeContainer.appendChild(btn);
            });
        }

        const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;

        if (hasVariants) {
            colorWrapper.style.display = 'block';
            colorContainer.innerHTML = '';

            product.variants.forEach((v, index) => {
                const thumb = document.createElement('button');
                thumb.type = 'button';
                thumb.className = 'mavin-color-thumb' + (index === 0 ? ' active' : '');
                const thumbImg = v.image || firstImage;
                thumb.innerHTML = `<img src="${thumbImg}" alt="${v.color}">`;

                thumb.onclick = () => {
                    colorContainer.querySelectorAll('.mavin-color-thumb').forEach(b => b.classList.remove('active'));
                    thumb.classList.add('active');
                    selectedColor = v.color;
                    if (colorLabel) colorLabel.textContent = v.color;

                    const mainImg = document.getElementById('main-img-view');
                    if (mainImg && v.image) {
                        mainImg.style.opacity = '0';
                        setTimeout(() => {
                            mainImg.src = v.image;
                            mainImg.style.opacity = '1';
                        }, 180);
                    }

                    renderSizesForVariant(v);
                };

                if (index === 0) {
                    selectedColor = v.color;
                    if (colorLabel) colorLabel.textContent = v.color;
                    renderSizesForVariant(v);
                }
                colorContainer.appendChild(thumb);
            });
        } else {
            // Legacy / Standard Products
            const colors = product.colors ? product.colors.split(',').map(c => c.trim()).filter(c => c !== '') : [];
            if (colors.length > 0) {
                colorWrapper.style.display = 'block';
                colorContainer.innerHTML = '';
                colors.forEach((c, idx) => {
                    const thumb = document.createElement('button');
                    thumb.type = 'button';
                    thumb.className = 'mavin-color-thumb' + (idx === 0 ? ' active' : '');
                    const imgForColor = images[idx] || firstImage;
                    thumb.innerHTML = `<img src="${imgForColor}" alt="${c}">`;

                    thumb.onclick = () => {
                        colorContainer.querySelectorAll('.mavin-color-thumb').forEach(b => b.classList.remove('active'));
                        thumb.classList.add('active');
                        selectedColor = c;
                        if (colorLabel) colorLabel.textContent = c;
                    };
                    if (idx === 0) {
                        selectedColor = c;
                        if (colorLabel) colorLabel.textContent = c;
                    }
                    colorContainer.appendChild(thumb);
                });
            }

            const sizes = product.size ? product.size.split(',').map(s => s.trim()).filter(s => s !== '') : ['S', 'M', 'L', 'XL', 'XXL'];
            sizeContainer.innerHTML = '';
            sizes.forEach(s => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mavin-size-box';
                btn.innerText = s;
                btn.onclick = () => {
                    sizeContainer.querySelectorAll('.mavin-size-box').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedSize = s;
                    if (sizeBadge) sizeBadge.textContent = `${s} SIZE`;
                    updateCartButtonState();
                };
                sizeContainer.appendChild(btn);
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 6. MAIN MEDIA VIEW (MAVIN STREAMLINED HERO)
        // ─────────────────────────────────────────────────────────────────────
        if (product.video_url && product.video_url.trim() !== '') {
            mediaMain.innerHTML = `
                <video autoplay muted loop playsinline src="${product.video_url}"
                    style="width:100%; aspect-ratio:3/4; object-fit:cover;">
                </video>
            `;
        } else {
            mediaMain.innerHTML = `
                <div style="position: relative; width: 100%; height: 100%; overflow: hidden;">
                    <img id="main-img-view"
                        src="${firstImage}"
                        alt="${product.name}"
                        style="width:100%; aspect-ratio:3/4; object-fit:cover; transition: opacity 0.25s ease-in-out;">
                </div>
            `;
        }

        // Expand image on click
        const expandBtn = document.getElementById('expandMediaBtn');
        if (expandBtn) {
            expandBtn.onclick = () => {
                const mainImg = document.getElementById('main-img-view');
                if (mainImg) window.open(mainImg.src, '_blank');
            };
        }

        // Accordion Interaction (Mavin + / -)
        document.querySelectorAll('.mavin-accordion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.parentElement;
                const wasActive = row.classList.contains('active');
                document.querySelectorAll('.mavin-accordion-row').forEach(r => r.classList.remove('active'));
                if (!wasActive) row.classList.add('active');
            });
        });

        // Learn more trigger scrolls to accordion
        const learnMore = document.getElementById('learnMoreTrigger');
        if (learnMore) {
            learnMore.addEventListener('click', (e) => {
                e.preventDefault();
                const descRow = document.querySelector('.mavin-accordion-row');
                if (descRow) {
                    descRow.classList.add('active');
                    descRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }

        // Size Guide Modal
        const sizeGuideModal = document.getElementById('sizeGuideModal');
        const openSizeGuide = document.getElementById('openSizeGuide');
        const closeSizeGuide = document.getElementById('closeSizeGuide');

        if (openSizeGuide && sizeGuideModal) {
            openSizeGuide.addEventListener('click', () => {
                sizeGuideModal.classList.add('open');
            });
        }
        if (closeSizeGuide && sizeGuideModal) {
            closeSizeGuide.addEventListener('click', () => {
                sizeGuideModal.classList.remove('open');
            });
            sizeGuideModal.addEventListener('click', (e) => {
                if (e.target === sizeGuideModal) sizeGuideModal.classList.remove('open');
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 7. ADD TO CART ACTION
        // ─────────────────────────────────────────────────────────────────────
        if (cartBtn) {
            cartBtn.addEventListener('click', () => {
                const errorMsg = document.getElementById('product-error-msg');
                if (!selectedSize) {
                    if (errorMsg) {
                        errorMsg.textContent = 'يرجى اختيار المقاس أولاً لإضافة المنتج إلى السلة (Please select a size)';
                        errorMsg.style.display = 'block';
                    }
                    return;
                }
                if (errorMsg) errorMsg.style.display = 'none';

                let cart = JSON.parse(localStorage.getItem('drogla_cart')) || [];
                const existing = cart.find(
                    item => item.id === product.id
                         && item.size  === selectedSize
                         && item.color === selectedColor
                );
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cart.push({
                        id:       product.id,
                        name:     product.name,
                        price:    product.price,
                        image:    firstImage,
                        size:     selectedSize,
                        color:    selectedColor || '',
                        quantity: 1
                    });
                }
                localStorage.setItem('drogla_cart', JSON.stringify(cart));
                if (window.updateCartBadge) window.updateCartBadge();
                if (window.openCartDrawer) window.openCartDrawer();

                // Button Feedback
                const originalText = cartBtn.textContent;
                cartBtn.textContent = '✓ ADDED TO BAG';
                cartBtn.style.background = '#2e7d32';
                setTimeout(() => {
                    updateCartButtonState();
                    cartBtn.style.background = '';
                }, 1800);
            });
        }

    } catch (err) {
        console.error(err);
        const loader = document.getElementById('loader');
        if (loader) {
            loader.innerText = 'Error loading product details: ' + (err.message || JSON.stringify(err));
        }
    }
});
