
/* ============================================================
   shop.js — Drogla E-Commerce | Shop Page Logic
   Features: skeleton loading, live search, pill filters,
             URL-param pre-filtering, Supabase fetch, cursor FX
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

    // ── DOM refs ────────────────────────────────────────────
    const grid       = document.getElementById('products-grid');
    const loader     = document.getElementById('loader');
    const noResults  = document.getElementById('no-results');
    const searchInput = document.getElementById('shopSearchInput');
    const pills       = document.querySelectorAll('.filter-pill');
    const shopTitle   = document.getElementById('shop-title');

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
    // 1.  Page title based on URL cat param
    // ================================================================
    if (catFilter) {
        const formattedTitle = catFilter.replace('-', ' ').toUpperCase();
        shopTitle.innerHTML  = `${formattedTitle} <em>Collection</em>`;
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
    // 4.  Build a single product card DOM element
    // ================================================================
    function buildCard(p, idx, isFirst) {
        const firstImage = (p.image && p.image.split(',')[0].trim()) ||
            'https://via.placeholder.com/800x1000/16161a/ffffff?text=DROGLA';

        const isVideo   = /\.(mp4|webm)$/i.test(firstImage);
        const mediaHTML = isVideo
            ? `<video class="placeholder-video" autoplay muted loop playsinline>
                 <source src="${firstImage}" type="video/mp4"/>
               </video>`
            : `<img src="${firstImage}" alt="${p.name}" class="card-img">`;

        const card       = document.createElement('a');
        card.href        = `product.html?id=${p.id}`;
        card.className   = 'product-card fade-up visible';
        card.style.transitionDelay = `${(idx % 3) * 0.1}s`;

        // Store searchable data attrs for client-side filtering
        card.dataset.name     = (p.name     || '').toLowerCase();
        card.dataset.category = (p.category || '').toLowerCase();

        card.innerHTML = `
            <div class="card-img-wrap">
                ${isFirst && !catFilter ? '<div class="badge-new card-badge">New</div>' : ''}
                <div class="card-img-placeholder">
                    ${mediaHTML}
                </div>
                <div class="card-actions">
                    <button class="btn-add">Explore</button>
                </div>
            </div>
            <div class="card-info">
                <p class="card-cat">${p.category || 'Apparel'}</p>
                <p class="card-name">${p.name}</p>
                <div class="card-foot">
                    <span class="card-price">EGP ${parseFloat(p.price).toFixed(2)}</span>
                    <span class="card-stock ${p.stock && p.stock < 5 ? 'low' : ''}">
                        ${p.stock && p.stock < 5 ? p.stock + ' Left' : 'In Stock'}
                    </span>
                </div>
            </div>`;

        attachCursorFX(card);
        return card;
    }

    // ================================================================
    // 5.  Client-side filter + render visible cards
    // ================================================================
    function applyFilters() {
        const q    = searchQuery.trim().toLowerCase();
        const pill = activePill;  // 'all' | 'men' | 'women' | 't-shirts' | 'bottoms'

        grid.innerHTML = '';
        let visibleCount = 0;

        allProducts.forEach((p, idx) => {
            const name     = (p.name     || '').toLowerCase();
            const category = (p.category || '').toLowerCase();

            // ── pill filter ──
            let pillMatch = true;
            if (pill === 'men')      pillMatch = category.startsWith('men');
            else if (pill === 'women')   pillMatch = category.startsWith('women');
            else if (pill === 't-shirts') pillMatch = category.includes('t-shirt');
            else if (pill === 'bottoms') pillMatch = category.includes('bottom');

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
    // 8.  Fetch from Supabase
    // ================================================================

    // Show skeletons immediately
    renderSkeletons(6);

    try {
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply server-side category filter from URL
        if (catFilter) {
            let gender = '';
            let type   = '';

            if (catFilter.includes('women'))       gender = 'Women';
            else if (catFilter.includes('men'))    gender = 'Men';

            if (catFilter.includes('tshirts'))         type = 'T-Shirts';
            else if (catFilter.includes('bottoms'))    type = 'Bottoms';
            else if (catFilter.includes('tops'))       type = 'Tops';

            if (gender && !type) {
                query = query.ilike('category', `${gender}%`);
            } else if (gender && type) {
                if (type === 'Tops') {
                    query = query.or(
                        `category.ilike.${gender} Tops%,category.ilike.${gender} T-Shirts%`
                    );
                } else {
                    query = query.ilike('category', `${gender} ${type}%`);
                }
            }
        }

        const { data: products, error } = await query;

        if (error) throw error;

        // Clear skeleton, store data, render
        grid.innerHTML = '';
        allProducts    = products || [];

        if (allProducts.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">
                Collection is currently empty or no products match this category.
            </p>`;
            return;
        }

        // Sync pill active state from URL cat param so they stay in harmony
        if (catFilter) {
            if (catFilter.includes('women'))      activePill = 'women';
            else if (catFilter.includes('men'))   activePill = 'men';

            if (catFilter.includes('tshirts'))        activePill = 't-shirts';
            else if (catFilter.includes('bottoms'))   activePill = 'bottoms';

            pills.forEach(p => {
                p.classList.toggle('active', p.dataset.filter === activePill);
            });
        }

        applyFilters();

    } catch (err) {
        console.error('Error fetching products:', err);
        grid.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">
            Failed to load collection. Please check your Supabase connection.
        </p>`;
    }

});