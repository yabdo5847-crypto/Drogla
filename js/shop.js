
/* ============================================================
   shop.js — Drogla E-Commerce | Shop Page Logic
   Features: skeleton loading, live search, pill filters,
             URL-param pre-filtering, Supabase fetch, cursor FX
   ============================================================ */

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

    // ── DOM refs ────────────────────────────────────────────
    const grid       = document.getElementById('products-grid');
    const loader     = document.getElementById('loader');
    const noResults  = document.getElementById('no-results');
    const searchInput = document.getElementById('shopSearchInput');
    const pills       = document.querySelectorAll('.filter-pill, .dg-pill');
    const shopTitle   = document.getElementById('shop-title');
    const sortSelect  = document.getElementById('shopSortSelect');

    // ── URL params ──────────────────────────────────────────
    const urlParams  = new URLSearchParams(window.location.search);
    const catFilter  = urlParams.get('cat');

    // ── State ───────────────────────────────────────────────
    let allProducts  = [];          // full dataset from Supabase
    let activePill   = 'all';       // current pill filter value
    let searchQuery  = '';          // current search string

    // ── Cursor refs (preserved) ──────────────────────────────
    const cur  = document.getElementById('cursor');
    const ring = document.getElementById('ring');

    // ================================================================
    // 1.  Page title based on URL cat param (XSS-safe)
    // ================================================================
    if (catFilter && shopTitle) {
        const cleanCat = String(catFilter).replace(/[^a-zA-Z0-9\-_ ]/g, '').slice(0, 50);
        const formattedTitle = cleanCat.replace(/-/g, ' ').toUpperCase();
        shopTitle.innerHTML = `${escapeHtml(formattedTitle)} <em>Collection</em>`;
    }

    // ================================================================
    // 2.  Skeleton renderer — fills the PRODUCTS grid with placeholders
    // ================================================================
    function renderSkeletons(count = 6) {
        grid.innerHTML = '';
        for (let i = 0; i < count; i++) {
            grid.innerHTML += `<div class="product-card skeleton-card">
      <div class="skeleton-img" style="aspect-ratio:3/4;width:100%;"></div>
      <div style="padding:1.2rem 1rem">
        <div class="skeleton-line" style="width:30%;height:10px;margin-bottom:6px;"></div>
        <div class="skeleton-line" style="width:70%;height:14px;margin-bottom:10px;"></div>
        <div class="skeleton-line" style="width:40%;height:10px;"></div>
      </div>
    </div>`;
        }
    }

    // ================================================================
    // 3.  Attach cursor FX to a card element
    // ================================================================
    function attachCursorFX(card) {
        if (!cur || !ring) return;
        card.addEventListener('mouseenter', () => {
            cur.style.transform  = 'translate(-50%,-50%) scale(2.5)';
            ring.style.transform = 'translate(-50%,-50%) scale(1.6)';
            ring.style.opacity   = '.3';
        });
        card.addEventListener('mouseleave', () => {
            cur.style.transform  = 'translate(-50%,-50%) scale(1)';
            ring.style.transform = 'translate(-50%,-50%) scale(1)';
            ring.style.opacity   = '.5';
        });
    }

    // ================================================================
    // 4.  Build a single product card DOM element (with multi-image slider)
    // ================================================================
    function buildCard(p, idx, isFirst) {
        const rawImgs = (p.image || '').split(',').map(s => s.trim()).filter(Boolean);
        const images = rawImgs.length > 0 ? rawImgs : ['https://placehold.co/800x1000/16161a/ffffff?text=DROGLA'];
        const hasMultiple = images.length > 1;

        let mediaHTML = '';
        if (hasMultiple) {
            const slidesHTML = images.map((src, sIdx) => {
                const isVideo = /\.(mp4|webm)$/i.test(src);
                return `
                    <div class="dg-card-slide">
                        ${isVideo 
                            ? `<video class="placeholder-video" autoplay muted loop playsinline><source src="${src}" type="video/mp4"/></video>` 
                            : `<img src="${src}" alt="${escapeHtml(p.name)} - ${sIdx + 1}" class="card-img" loading="${idx < 3 ? 'eager' : 'lazy'}">`
                        }
                    </div>
                `;
            }).join('');

            const dotsHTML = images.map((_, sIdx) => `<span class="dg-card-dot ${sIdx === 0 ? 'active' : ''}"></span>`).join('');

            mediaHTML = `
                <div class="dg-card-slider">
                    <div class="dg-card-slider-track">
                        ${slidesHTML}
                    </div>
                    <div class="dg-card-dots">
                        ${dotsHTML}
                    </div>
                </div>
            `;
        } else {
            const firstImage = images[0];
            const isVideo = /\.(mp4|webm)$/i.test(firstImage);
            mediaHTML = isVideo
                ? `<video class="placeholder-video" autoplay muted loop playsinline><source src="${firstImage}" type="video/mp4"/></video>`
                : `<img src="${firstImage}" alt="${escapeHtml(p.name)}" class="card-img" loading="${idx < 3 ? 'eager' : 'lazy'}">`;
        }

        const card       = document.createElement('a');
        card.href = `/product?id=${p.id}`;
        card.className   = 'product-card fade-up visible';
        card.style.transitionDelay = `${(idx % 3) * 0.1}s`;

        // Store searchable data attrs for client-side filtering
        card.dataset.name     = (p.name     || '').toLowerCase();
        card.dataset.category = (p.category || '').toLowerCase();

        card.innerHTML = `
            <div class="card-img-wrap">
                ${isFirst && !catFilter ? '<div class="badge-new card-badge">NEW</div>' : ''}
                <div class="card-img-placeholder">
                    ${mediaHTML}
                </div>
                <button class="card-quick-add" aria-label="Quick explore">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </button>
            </div>
            <div class="card-info">
                <p class="card-name">${p.name}</p>
                <p class="card-cat">${p.category || 'Apparel'}</p>
                <div class="card-foot">
                    ${p.old_price && parseFloat(p.old_price) > parseFloat(p.price)
                        ? `<span class="card-old-price" style="text-decoration:line-through;opacity:0.5;font-size:0.8em;margin-right:6px;">EGP ${parseFloat(p.old_price).toFixed(2)}</span>`
                        : ''}
                    <span class="card-price">EGP ${parseFloat(p.price).toFixed(2)}</span>
                </div>
            </div>`;

        // Multi-image hover / swipe interaction
        if (hasMultiple) {
            const track = card.querySelector('.dg-card-slider-track');
            const dots = card.querySelectorAll('.dg-card-dot');
            let cardSlide = 0;
            let cardTimer = null;

            const setCardSlide = (s) => {
                cardSlide = (s + images.length) % images.length;
                if (track) track.style.transform = `translateX(-${cardSlide * 100}%)`;
                dots.forEach((d, i) => d.classList.toggle('active', i === cardSlide));
            };

            // On Hover: cycle through images every 1.6s
            card.addEventListener('mouseenter', () => {
                if (cardTimer) clearInterval(cardTimer);
                cardTimer = setInterval(() => {
                    setCardSlide(cardSlide + 1);
                }, 1600);
            });

            card.addEventListener('mouseleave', () => {
                if (cardTimer) {
                    clearInterval(cardTimer);
                    cardTimer = null;
                }
                setCardSlide(0);
            });

            // Touch swipe on mobile
            let touchX = 0;
            card.addEventListener('touchstart', (e) => {
                touchX = e.changedTouches[0].screenX;
            }, { passive: true });

            card.addEventListener('touchend', (e) => {
                const diff = touchX - e.changedTouches[0].screenX;
                if (Math.abs(diff) > 35) {
                    if (diff > 0) setCardSlide(cardSlide + 1);
                    else setCardSlide(cardSlide - 1);
                }
            }, { passive: true });
        }

        attachCursorFX(card);
        return card;
    }

    // ================================================================
    // 5.  Accurate Category Matching & Client-Side Filtering
    // ================================================================
    function matchCategory(p, pill) {
        if (!pill || pill === 'all') return true;

        const cat  = (p.category || '').toLowerCase().trim();
        const name = (p.name     || '').toLowerCase().trim();

        const isWomen = cat.startsWith('women') || cat.includes('women-') || cat.includes('women') || cat.includes('حريمي') || cat.includes('بناتي') || name.includes('women') || name.includes('بناتي') || name.includes('حريمي');
        const isMen   = (cat.startsWith('men') || cat.includes('men-') || cat.includes('رجالي') || name.includes('men') || name.includes('رجالي')) && !isWomen;
        const isUnisex = cat.startsWith('unisex') || cat.includes('unisex-') || cat.includes('stealth') || cat.includes('للجنسين');

        const isTshirt = cat.includes('tshirt') || cat.includes('t-shirt') || cat.includes('top') || cat.includes('تيشيرت') || cat.includes('توب') || name.includes('t-shirt') || name.includes('tee') || name.includes('tshirt') || name.includes('تيشيرت');
        const isBottom = cat.includes('bottom') || cat.includes('pant') || cat.includes('trouser') || cat.includes('short') || cat.includes('بنطلون') || name.includes('pant') || name.includes('sweatpant') || name.includes('trousers') || name.includes('بنطلون');
        const isHoodie = cat.includes('hoodie') || cat.includes('sweatshirt') || cat.includes('سويت') || cat.includes('هودي') || name.includes('hoodie') || name.includes('sweatshirt') || name.includes('هود');

        if (pill === 'men')      return isMen || (isUnisex && !isWomen);
        if (pill === 'women')    return isWomen || (isUnisex && !isMen);
        if (pill === 'unisex')   return isUnisex;
        if (pill === 't-shirts') return isTshirt;
        if (pill === 'bottoms')  return isBottom;
        if (pill === 'hoodies')  return isHoodie;

        // Direct slug or keyword fallback
        return cat.includes(pill) || name.includes(pill);
    }

    function applyFilters() {
        const q    = searchQuery.trim().toLowerCase();
        const pill = activePill;

        grid.innerHTML = '';
        let visibleCount = 0;

        allProducts.forEach((p, idx) => {
            const name     = (p.name     || '').toLowerCase();
            const category = (p.category || '').toLowerCase();

            // ── pill filter ──
            const pillMatch = matchCategory(p, pill);

            // ── search filter ──
            const searchMatch = !q || name.includes(q) || category.includes(q);

            if (pillMatch && searchMatch) {
                const card = buildCard(p, visibleCount, visibleCount === 0);
                grid.appendChild(card);
                visibleCount++;
            }
        });

        // no-results state
        if (noResults) {
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // update count label
        if (typeof window.updateProductCount === 'function') {
            window.updateProductCount(visibleCount);
        } else {
            const countEl = document.getElementById('product-count-label');
            if (countEl) countEl.textContent = visibleCount + ' PRODUCT' + (visibleCount !== 1 ? 'S' : '');
        }
    }

    // ================================================================
    // 6.  Pill click handler
    // ================================================================
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activePill = pill.dataset.filter;
            applyFilters();
        });
    });

    // ================================================================
    // 7.  Live search handler
    // ================================================================
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value;
            applyFilters();
        });
    }

    // ================================================================
    // 7b. Sort handler
    // ================================================================
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const val = sortSelect.value;
            if (val === 'price-asc') {
                allProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            } else if (val === 'price-desc') {
                allProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            } else {
                // newest: re-sort by original order (by id desc)
                allProducts.sort((a, b) => b.id - a.id);
            }
            applyFilters();
        });
    }

    // ================================================================
    // 8.  Fetch from Supabase
    // ================================================================

    // Show skeletons immediately
    renderSkeletons(6);

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Clear skeleton, store data, render
        grid.innerHTML = '';
        allProducts    = products || [];

        if (allProducts.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">
                Collection is currently empty.
            </p>`;
            return;
        }

        // Sync pill active state from URL cat param
        if (catFilter) {
            const cleanCat = catFilter.toLowerCase();
            if (cleanCat.includes('women')) activePill = 'women';
            else if (cleanCat.includes('men')) activePill = 'men';
            else if (cleanCat.includes('bottom') || cleanCat.includes('pant')) activePill = 'bottoms';
            else if (cleanCat.includes('tshirt') || cleanCat.includes('t-shirt') || cleanCat.includes('top')) activePill = 't-shirts';
            else if (cleanCat.includes('hoodie')) activePill = 'hoodies';

            pills.forEach(p => {
                p.classList.toggle('active', p.dataset.filter === activePill);
            });
        }

        applyFilters();

    } catch (err) {
        console.error('Error fetching products:', err);
        grid.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">
            Failed to load collection. Please check your network connection.
        </p>`;
    }

});