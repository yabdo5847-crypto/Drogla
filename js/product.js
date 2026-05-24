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
    // 2. URL PARAM PARSING
    // ─────────────────────────────────────────────────────────────────────────
    const urlParams  = new URLSearchParams(window.location.search);
    const productId  = urlParams.get('id');

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
        // 4. POPULATE TEXT — fade in smoothly (opacity 0 → 1 over 0.4 s)
        // ─────────────────────────────────────────────────────────────────────
        const fadeIn = (el, content, isHTML = false) => {
            if (!el) return;
            el.style.transition = 'opacity 0.4s ease';
            el.style.opacity    = '0';
            // Small tick so the browser registers the opacity: 0 before animating
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

        document.title = `${product.name} | DROGLA`;
        fadeIn(productNameEl, product.name);
        fadeIn(productPriceEl, `EGP ${parseFloat(product.price).toFixed(2)}`);
        fadeIn(
            productDescEl,
            product.description || 'Premium oversized aesthetic. Engineered for ultimate comfort and silhouette.'
        );

        // ─────────────────────────────────────────────────────────────────────
        // 5. SIZE SELECTOR
        // ─────────────────────────────────────────────────────────────────────
        const sizeContainer = document.getElementById('size-container');
        const sizes = product.size
            ? product.size.split(',').map(s => s.trim()).filter(s => s !== '')
            : [];

        let selectedSize = null;

        if (sizes.length === 0) {
            sizeContainer.innerHTML = '<span style="color:#fff;">One Size</span>';
            selectedSize = 'One Size';
        } else {
            sizes.forEach((s) => {
                const btn = document.createElement('button');
                btn.className = 'size-btn';

                const activateSize = () => {
                    sizeContainer.querySelectorAll('.size-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.boxShadow = '';
                    });
                    btn.classList.add('active');
                    btn.style.boxShadow = '0 0 0 2px var(--burgundy)';
                    selectedSize = s;
                };

                // Auto-select if only one size
                if (sizes.length === 1) {
                    btn.classList.add('active');
                    btn.style.boxShadow = '0 0 0 2px var(--burgundy)';
                    selectedSize = s;
                }

                btn.innerText = s;
                btn.onclick   = activateSize;
                sizeContainer.appendChild(btn);
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 6. COLOR SELECTOR
        // ─────────────────────────────────────────────────────────────────────
        const colorWrapper    = document.getElementById('color-wrapper');
        const colorContainer  = document.getElementById('color-container');
        const colors = product.colors
            ? product.colors.split(',').map(c => c.trim()).filter(c => c !== '')
            : [];
        let selectedColor = null;

        if (colors.length > 0) {
            colorWrapper.style.display = 'block';
            colors.forEach((c) => {
                const btn = document.createElement('button');
                btn.className = 'size-btn';

                const activateColor = () => {
                    colorContainer.querySelectorAll('.size-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.boxShadow = '';
                    });
                    btn.classList.add('active');
                    btn.style.boxShadow = '0 0 0 2px var(--burgundy)';
                    selectedColor = c;
                };

                // Auto-select if only one color
                if (colors.length === 1) {
                    btn.classList.add('active');
                    btn.style.boxShadow = '0 0 0 2px var(--burgundy)';
                    selectedColor = c;
                }

                btn.innerText = c;
                btn.onclick   = activateColor;
                colorContainer.appendChild(btn);
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 7. MEDIA — video OR image gallery
        // ─────────────────────────────────────────────────────────────────────
        const gallery   = document.getElementById('product-gallery');
        const images    = product.image
            ? product.image.split(',').map(i => i.trim()).filter(i => i !== '')
            : [];
        const firstImage = images.length > 0
            ? images[0]
            : 'https://via.placeholder.com/800x1000/16161a/ffffff?text=DROGLA';

        if (product.video_url && product.video_url.trim() !== '') {
            // ── Video mode ──────────────────────────────────────────────────
            mediaMain.innerHTML = `
                <video autoplay muted loop playsinline src="${product.video_url}"
                    style="width:100%; object-fit:cover;">
                </video>
            `;
        } else {
            // ── Image / gallery mode ─────────────────────────────────────────
            mediaMain.innerHTML = `
                <div style="position: relative; width: 100%; height: 100%; overflow: hidden;">
                    <img id="main-img-view"
                        src="${firstImage}"
                        alt="${product.name}"
                        style="width:100%; height:100%; object-fit:cover; transition: opacity 0.3s ease-in-out;">
                    ${images.length > 1 ? `
                    <button id="slider-prev" style="
                        position: absolute; top: 50%; left: 10px;
                        transform: translateY(-50%);
                        background: rgba(0,0,0,0.5); color: #fff;
                        border: none; width: 40px; height: 40px;
                        border-radius: 50%; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 1.5rem; transition: 0.3s; opacity: 0.7;">‹</button>
                    <button id="slider-next" style="
                        position: absolute; top: 50%; right: 10px;
                        transform: translateY(-50%);
                        background: rgba(0,0,0,0.5); color: #fff;
                        border: none; width: 40px; height: 40px;
                        border-radius: 50%; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 1.5rem; transition: 0.3s; opacity: 0.7;">›</button>
                    ` : ''}
                </div>
            `;

            if (images.length > 1) {
                let currentIndex  = 0;
                let sliderInterval;

                // ── Cross-fade swap ──────────────────────────────────────────
                const updateImage = (index) => {
                    currentIndex = index;
                    const mainImg = document.getElementById('main-img-view');

                    // Fade out (150 ms)
                    mainImg.style.transition = 'opacity 0.15s ease-in-out';
                    mainImg.style.opacity    = '0';

                    setTimeout(() => {
                        mainImg.src = images[currentIndex];
                        // Fade back in (300 ms)
                        mainImg.style.transition = 'opacity 0.3s ease-in-out';
                        mainImg.style.opacity    = '1';
                    }, 150);

                    // Update thumbnail border highlight
                    if (gallery) {
                        Array.from(gallery.children).forEach((child, i) => {
                            child.style.borderColor = (i === currentIndex)
                                ? 'var(--burgundy)'
                                : 'transparent';
                        });
                    }
                };

                const nextImage = () => updateImage((currentIndex + 1) % images.length);
                const prevImage = () => updateImage((currentIndex - 1 + images.length) % images.length);

                // Auto-slide at 3.5 s for a premium, unhurried feel
                const resetTimer = () => {
                    clearInterval(sliderInterval);
                    sliderInterval = setInterval(nextImage, 3500);
                };

                const nextBtn = document.getElementById('slider-next');
                const prevBtn = document.getElementById('slider-prev');
                if (nextBtn) nextBtn.onclick = () => { nextImage(); resetTimer(); };
                if (prevBtn) prevBtn.onclick = () => { prevImage(); resetTimer(); };

                // Build thumbnails
                images.forEach((imgSrc, idx) => {
                    const thumb = document.createElement('img');
                    thumb.src   = imgSrc;
                    thumb.alt   = `${product.name} view ${idx + 1}`;
                    thumb.style.cssText = `
                        width: 80px; height: 100px; object-fit: cover;
                        cursor: pointer;
                        border: 2px solid ${idx === 0 ? 'var(--burgundy)' : 'transparent'};
                        transition: border 0.3s;
                        border-radius: 4px;
                    `;
                    thumb.onclick = () => { updateImage(idx); resetTimer(); };
                    if (gallery) gallery.appendChild(thumb);
                });

                // Kick off auto-slide
                resetTimer();
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // 8. QUANTITY SELECTOR
        // ─────────────────────────────────────────────────────────────────────
        let selectedQty  = 1;
        const qtyVal     = document.getElementById('qty-val');
        const qtyMinus   = document.getElementById('qty-minus');
        const qtyPlus    = document.getElementById('qty-plus');

        if (qtyMinus) {
            qtyMinus.addEventListener('click', () => {
                if (selectedQty > 1) {
                    selectedQty--;
                    if (qtyVal) qtyVal.innerText = selectedQty;
                }
            });
        }
        if (qtyPlus) {
            qtyPlus.addEventListener('click', () => {
                selectedQty++;
                if (qtyVal) qtyVal.innerText = selectedQty;
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 9. ADD TO CART
        // ─────────────────────────────────────────────────────────────────────
        const cartBtn = document.getElementById('add-to-cart-btn');
        if (cartBtn) {
            cartBtn.addEventListener('click', () => {
                // Validation
                if (!selectedSize) {
                    showError('Please select a size before adding to cart.');
                    return;
                }
                if (colors.length > 0 && !selectedColor) {
                    showError('Please select a color before adding to cart.');
                    return;
                }

                // Persist to localStorage
                let cart = JSON.parse(localStorage.getItem('drogla_cart')) || [];
                const existing = cart.find(
                    item => item.id === product.id
                         && item.size  === selectedSize
                         && item.color === selectedColor
                );
                if (existing) {
                    existing.quantity += selectedQty;
                } else {
                    cart.push({
                        id:       product.id,
                        name:     product.name,
                        price:    product.price,
                        image:    firstImage,
                        size:     selectedSize,
                        color:    selectedColor || '',
                        quantity: selectedQty
                    });
                }
                localStorage.setItem('drogla_cart', JSON.stringify(cart));
                updateCartBadge();

                // ── Premium visual feedback ──────────────────────────────────
                const btn          = document.getElementById('add-to-cart-btn');
                const originalText = btn.innerText;
                const originalBg   = btn.style.background   || '';
                const originalColor = btn.style.color       || '';
                const originalBorder = btn.style.borderColor || '';

                btn.style.transition  = 'all 0.4s ease';
                btn.innerText         = '✓ Added to Bag';
                btn.style.background  = 'var(--burgundy-deep)';
                btn.style.color       = '#fff';
                btn.style.borderColor = 'var(--burgundy-deep)';

                setTimeout(() => {
                    btn.style.transition  = 'all 0.4s ease';
                    btn.innerText         = originalText;
                    btn.style.background  = originalBg;
                    btn.style.color       = originalColor;
                    btn.style.borderColor = originalBorder;
                }, 2000);
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
