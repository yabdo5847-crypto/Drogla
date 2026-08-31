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
            if (product.old_price && parseFloat(product.old_price) > 0) {
                oldPriceEl.textContent = `LE ${parseFloat(product.old_price).toFixed(2)}`;
                oldPriceEl.style.display = '';
            } else {
                // No old price set — hide the element
                oldPriceEl.style.display = 'none';
            }
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
        // ─────────────────────────────────────────────────────────────────────
        // 5. COLOR & SIZE SELECTORS (ROBUST SYSTEM)
        // ─────────────────────────────────────────────────────────────────────
        const sizeContainer = document.getElementById('size-container');
        const colorWrapper = document.getElementById('color-wrapper');
        const colorContainer = document.getElementById('color-container');
        const colorLabel = document.getElementById('selected-color-label');
        const sizeBadge = document.getElementById('mavin-size-badge');
        const cartBtn = document.getElementById('add-to-cart-btn');

        let selectedSize = null;
        let selectedColor = null;
        let activePrice = numPrice;

        function updateCartButtonState() {
            if (!cartBtn) return;
            if (selectedSize) {
                cartBtn.textContent = `ADD TO BAG — LE ${activePrice.toFixed(2)}`;
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

        // ── 5.1 Parse Sizes Defensively ──
        let parsedSizes = null;
        if (product.sizes) {
            let rawS = product.sizes;
            if (typeof rawS === 'string') {
                try { rawS = JSON.parse(rawS); } catch (e) { rawS = null; }
            }
            if (Array.isArray(rawS) && rawS.length > 0) {
                parsedSizes = rawS.map(s => {
                    if (typeof s === 'object' && s !== null) {
                        return {
                            label: String(s.label || s.size || '').trim(),
                            price: parseFloat(s.price) || numPrice,
                            stock: s.stock !== undefined ? parseInt(s.stock, 10) : 10,
                            colors: Array.isArray(s.colors) ? s.colors.map(c => String(c).trim()) : []
                        };
                    }
                    return { label: String(s).trim(), price: numPrice, stock: 10, colors: [] };
                }).filter(s => s.label);
            }
        }

        if (!parsedSizes || parsedSizes.length === 0) {
            if (product.size) {
                const sArr = String(product.size).split(',').map(s => s.trim()).filter(s => s);
                if (sArr.length > 0) {
                    parsedSizes = sArr.map(label => ({
                        label,
                        price: numPrice,
                        stock: 10,
                        colors: []
                    }));
                }
            }
        }

        if (!parsedSizes || parsedSizes.length === 0) {
            parsedSizes = ['S', 'M', 'L', 'XL', 'XXL'].map(label => ({
                label,
                price: numPrice,
                stock: 10,
                colors: []
            }));
        }

        // ── 5.2 Parse Colors Defensively ──
        let parsedColors = [];
        let rawC = product.colors;
        if (typeof rawC === 'string') {
            try { rawC = JSON.parse(rawC); } catch (e) {}
        }
        if (Array.isArray(rawC) && rawC.length > 0) {
            rawC.forEach(c => {
                if (typeof c === 'object' && c !== null) {
                    let cName = String(c.name || c.color || '').replace(/[\[\]{}"'\\]/g, '').trim();
                    cName = cName.replace(/^(hex|name)\s*:\s*/i, '').trim();
                    let cHex = String(c.hex || '#111010').trim();
                    if (!cHex.startsWith('#')) cHex = '#' + cHex;
                    if (cName && cName.toLowerCase() !== 'hex' && cName.toLowerCase() !== 'name') {
                        parsedColors.push({ name: cName, hex: cHex });
                    }
                } else if (typeof c === 'string') {
                    const cName = c.replace(/[\[\]{}"'\\]/g, '').trim();
                    if (cName) parsedColors.push({ name: cName, hex: '#111010' });
                }
            });
        }

        if (parsedColors.length === 0 && typeof product.color === 'string' && product.color) {
            product.color.split(',').forEach(c => {
                const cName = c.replace(/[\[\]{}"'\\]/g, '').replace(/^(hex|name)\s*:\s*/i, '').trim();
                if (cName && cName.toLowerCase() !== 'hex' && cName.toLowerCase() !== 'name') {
                    parsedColors.push({ name: cName, hex: '#111010' });
                }
            });
        }

        if (parsedColors.length === 0 && Array.isArray(product.variants)) {
            product.variants.forEach(v => {
                if (v && (v.color || v.name)) {
                    parsedColors.push({ name: String(v.color || v.name).trim(), hex: v.hex || '#111010' });
                }
            });
        }

        // Deduplicate colors
        const seenColors = new Set();
        parsedColors = parsedColors.filter(c => {
            const key = c.name.toLowerCase();
            if (seenColors.has(key)) return false;
            seenColors.add(key);
            return true;
        });

        // Variant images mapping
        let variantImgs = product.variant_images || product.variantImages || {};
        if (typeof variantImgs === 'string') {
            try { variantImgs = JSON.parse(variantImgs); } catch (e) { variantImgs = {}; }
        }

        // ── 5.3 Render Sizes ──
        function renderSizeButtons() {
            if (!sizeContainer) return;
            sizeContainer.innerHTML = '';

            parsedSizes.forEach(sz => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mavin-size-box';
                btn.innerText = sz.label;

                // Check if size is available for the currently selected color
                let isColorAvailable = true;
                if (selectedColor && Array.isArray(sz.colors) && sz.colors.length > 0) {
                    isColorAvailable = sz.colors.some(c => c.toLowerCase() === selectedColor.toLowerCase());
                }

                const isOutOfStock = sz.stock !== undefined && sz.stock <= 0;

                if (isOutOfStock || !isColorAvailable) {
                    btn.disabled = true;
                    btn.classList.add('sold-out');
                    btn.title = isOutOfStock ? 'Sold Out' : `Not available in ${selectedColor}`;
                    if (selectedSize === sz.label) {
                        selectedSize = null;
                        if (sizeBadge) sizeBadge.textContent = 'SELECT SIZE';
                        updateCartButtonState();
                    }
                } else {
                    if (selectedSize === sz.label) {
                        btn.classList.add('active');
                    }
                    btn.onclick = () => {
                        sizeContainer.querySelectorAll('.mavin-size-box').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        selectedSize = sz.label;
                        activePrice = sz.price || numPrice;
                        if (sizeBadge) sizeBadge.textContent = `${sz.label} SIZE`;
                        updateCartButtonState();
                    };
                }

                sizeContainer.appendChild(btn);
            });
        }

        // ── 5.4 Render Colors ──
        if (parsedColors.length > 0 && colorContainer && colorWrapper) {
            colorWrapper.style.display = 'block';
            colorContainer.innerHTML = '';

            parsedColors.forEach((c, idx) => {
                const thumb = document.createElement('button');
                thumb.type = 'button';
                thumb.className = 'mavin-color-thumb' + (idx === 0 ? ' active' : '');
                thumb.title = c.name;

                const imgForColor = variantImgs[c.name] || images[idx];
                if (imgForColor && imgForColor.trim()) {
                    thumb.innerHTML = `<img src="${imgForColor}" alt="${escapeHtml(c.name)}">`;
                } else {
                    const dotColor = c.hex || '#111010';
                    thumb.innerHTML = `
                        <span style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;height:100%;padding:4px;">
                            <span style="width:22px;height:22px;border-radius:50%;background:${dotColor};border:2px solid rgba(255,255,255,0.3);display:block;"></span>
                            <span style="font-size:0.55rem;font-weight:700;letter-spacing:0.04em;color:currentColor;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52px;">${escapeHtml(c.name)}</span>
                        </span>`;
                }

                thumb.onclick = () => {
                    colorContainer.querySelectorAll('.mavin-color-thumb').forEach(b => b.classList.remove('active'));
                    thumb.classList.add('active');
                    selectedColor = c.name;
                    if (colorLabel) colorLabel.textContent = c.name;

                    if (imgForColor && imgForColor.trim()) {
                        if (typeof window.switchSliderToImage === 'function') {
                            window.switchSliderToImage(imgForColor);
                        }
                    }

                    renderSizeButtons();
                };

                if (idx === 0) {
                    selectedColor = c.name;
                    if (colorLabel) colorLabel.textContent = c.name;
                }

                colorContainer.appendChild(thumb);
            });
        } else if (colorWrapper) {
            colorWrapper.style.display = 'none';
        }

        // Initial render of sizes
        renderSizeButtons();

        // ─────────────────────────────────────────────────────────────────────
        // 6. LUXURY MULTI-IMAGE BRAND SLIDER (2.5s Auto-play + Swipe)
        // ─────────────────────────────────────────────────────────────────────
        let allMediaList = [];

        if (product.video_url && product.video_url.trim() !== '') {
            allMediaList.push({ type: 'video', src: product.video_url.trim() });
        }

        if (images && images.length > 0) {
            images.forEach(src => {
                if (src && src.trim()) {
                    allMediaList.push({ type: 'image', src: src.trim() });
                }
            });
        }

        if (allMediaList.length === 0) {
            allMediaList.push({ type: 'image', src: firstImage });
        }

        let currentSlide = 0;
        let autoSlideTimer = null;
        const slideDuration = 2500; // 2.5s auto-transition

        const hasMultiple = allMediaList.length > 1;

        const slidesHTML = allMediaList.map((m, idx) => `
            <div class="dg-slider-slide" data-index="${idx}">
                ${m.type === 'video' 
                    ? `<video autoplay muted loop playsinline src="${m.src}"></video>` 
                    : `<img src="${m.src}" alt="${escapeHtml(product.name)} - View ${idx + 1}" loading="${idx === 0 ? 'eager' : 'lazy'}">`
                }
            </div>
        `).join('');

        let navHTML = '';
        if (hasMultiple) {
            navHTML = `
                <button type="button" class="dg-slider-btn dg-slider-btn--prev" id="sliderPrevBtn" aria-label="Previous image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button type="button" class="dg-slider-btn dg-slider-btn--next" id="sliderNextBtn" aria-label="Next image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <div class="dg-slider-dots" id="sliderDots">
                    ${allMediaList.map((_, idx) => `<button type="button" class="dg-slider-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Go to slide ${idx + 1}"></button>`).join('')}
                </div>
                <div class="dg-slider-counter" id="sliderCounter">1 / ${allMediaList.length}</div>
            `;
        }

        mediaMain.innerHTML = `
            <div class="dg-slider-container" id="dgSliderContainer">
                <div class="dg-slider-track" id="dgSliderTrack">
                    ${slidesHTML}
                </div>
                ${navHTML}
            </div>
        `;

        const sliderTrack = document.getElementById('dgSliderTrack');
        const sliderDots = document.getElementById('sliderDots');
        const sliderCounter = document.getElementById('sliderCounter');
        const galleryContainer = document.getElementById('product-gallery');

        // Render Thumbnails
        if (galleryContainer) {
            galleryContainer.innerHTML = '';
            if (hasMultiple) {
                galleryContainer.style.display = 'flex';
                allMediaList.forEach((m, idx) => {
                    const thumb = document.createElement(m.type === 'video' ? 'video' : 'img');
                    thumb.src = m.src;
                    thumb.alt = `${product.name} ${idx + 1}`;
                    if (idx === 0) thumb.className = 'active';
                    thumb.onclick = () => {
                        goToSlide(idx);
                        restartAutoSlide();
                    };
                    galleryContainer.appendChild(thumb);
                });
            } else {
                galleryContainer.style.display = 'none';
            }
        }

        function goToSlide(index) {
            if (!sliderTrack) return;
            currentSlide = (index + allMediaList.length) % allMediaList.length;
            sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`;

            // Update dots
            if (sliderDots) {
                sliderDots.querySelectorAll('.dg-slider-dot').forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === currentSlide);
                });
            }

            // Update counter
            if (sliderCounter) {
                sliderCounter.textContent = `${currentSlide + 1} / ${allMediaList.length}`;
            }

            // Update thumbnails
            if (galleryContainer) {
                const thumbs = galleryContainer.children;
                for (let i = 0; i < thumbs.length; i++) {
                    const isActive = (i === currentSlide);
                    thumbs[i].classList.toggle('active', isActive);
                    if (isActive && typeof thumbs[i].scrollIntoView === 'function') {
                        thumbs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }
            }
        }

        function startAutoSlide() {
            stopAutoSlide();
            if (hasMultiple) {
                autoSlideTimer = setInterval(() => {
                    goToSlide(currentSlide + 1);
                }, slideDuration);
            }
        }

        function stopAutoSlide() {
            if (autoSlideTimer) {
                clearInterval(autoSlideTimer);
                autoSlideTimer = null;
            }
        }

        function restartAutoSlide() {
            stopAutoSlide();
            startAutoSlide();
        }

        // Attach prev / next buttons
        const prevBtn = document.getElementById('sliderPrevBtn');
        const nextBtn = document.getElementById('sliderNextBtn');
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                goToSlide(currentSlide - 1);
                restartAutoSlide();
            };
        }
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                goToSlide(currentSlide + 1);
                restartAutoSlide();
            };
        }

        // Attach dot buttons
        if (sliderDots) {
            sliderDots.querySelectorAll('.dg-slider-dot').forEach(dot => {
                dot.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(dot.dataset.index, 10);
                    goToSlide(idx);
                    restartAutoSlide();
                };
            });
        }

        // Pause on Hover (Desktop)
        const sliderContainer = document.getElementById('dgSliderContainer');
        if (sliderContainer) {
            sliderContainer.addEventListener('mouseenter', stopAutoSlide);
            sliderContainer.addEventListener('mouseleave', startAutoSlide);

            // Touch Swipe Gestures (Mobile)
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            let touchEndY = 0;

            sliderContainer.addEventListener('touchstart', (e) => {
                stopAutoSlide();
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            sliderContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                touchEndY = e.changedTouches[0].screenY;
                const diffX = touchStartX - touchEndX;
                const diffY = touchStartY - touchEndY;

                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
                    if (diffX > 0) {
                        goToSlide(currentSlide + 1); // Swipe left -> Next
                    } else {
                        goToSlide(currentSlide - 1); // Swipe right -> Prev
                    }
                }
                startAutoSlide();
            }, { passive: true });
        }

        // Start auto slide
        startAutoSlide();

        // Connect Color click to slider slide
        window.switchSliderToImage = function(imgSrc) {
            if (!imgSrc) return;
            const idx = allMediaList.findIndex(m => m.src === imgSrc.trim());
            if (idx !== -1) {
                goToSlide(idx);
                restartAutoSlide();
            }
        };

        // Expand image on click
        const expandBtn = document.getElementById('expandMediaBtn');
        if (expandBtn) {
            expandBtn.onclick = () => {
                const currentMedia = allMediaList[currentSlide];
                if (currentMedia && currentMedia.src) {
                    window.open(currentMedia.src, '_blank');
                }
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

        // Size Guide Modal & Tab Switching
        const sizeGuideModal = document.getElementById('sizeGuideModal');
        const openSizeGuide = document.getElementById('openSizeGuide');
        const closeSizeGuide = document.getElementById('closeSizeGuide');

        window.switchSizeTab = function (type) {
            const tabs = {
                men: document.getElementById('tab-btn-men'),
                women: document.getElementById('tab-btn-women'),
                pants: document.getElementById('tab-btn-pants')
            };
            const tables = {
                men: document.getElementById('size-table-men'),
                women: document.getElementById('size-table-women'),
                pants: document.getElementById('size-table-pants')
            };

            Object.keys(tabs).forEach(k => {
                if (tabs[k]) {
                    if (k === type) {
                        tabs[k].style.borderBottomColor = 'var(--clr-accent, #5c1a1a)';
                        tabs[k].style.color = 'var(--text, #111010)';
                        tabs[k].style.fontWeight = '800';
                    } else {
                        tabs[k].style.borderBottomColor = 'transparent';
                        tabs[k].style.color = 'var(--text-muted, #706e6b)';
                        tabs[k].style.fontWeight = '700';
                    }
                }
                if (tables[k]) {
                    tables[k].style.display = (k === type) ? 'block' : 'none';
                }
            });
        };

        // Auto-select tab based on category or product name
        const prodCat = (product.category || '').toLowerCase();
        const prodName = (product.name || '').toLowerCase();
        if (prodCat.includes('pant') || prodCat.includes('bottom') || prodName.includes('pant') || prodName.includes('sweatpant') || prodName.includes('trouser')) {
            window.switchSizeTab('pants');
        } else if (prodCat.includes('women') || prodName.includes('women') || prodName.includes('بناتي')) {
            window.switchSizeTab('women');
        } else {
            window.switchSizeTab('men');
        }

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
                const cartImg = (variantImgs && selectedColor && variantImgs[selectedColor]) ? variantImgs[selectedColor] : firstImage;
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cart.push({
                        id:       product.id,
                        name:     product.name,
                        price:    activePrice || product.price,
                        image:    cartImg,
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
