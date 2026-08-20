/* ══════════════════════════════════════════════════════════════════════════
   DROGLA STREETWEAR — OPERATIONS CONSOLE (ADMIN JS ENGINE)
   Streetwear & Apparel Operations Management
   ══════════════════════════════════════════════════════════════════════════ */

// ── State Variables ──
let allProducts = [];
let allCategories = [];
let allShipping = [];
let allOrders = [];
let currentOrders = [];

// ── Toast Notification Helper ──
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ── Escape HTML Helper ──
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Format Date Helper ──
function formatDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
}

/* ══════════════════════════════════════════
   AUTHENTICATION & SESSION VERIFICATION
══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  // Theme Toggle Button in Sidebar
  const themeBtn = document.getElementById('adm-theme-btn');
  const themeIco = document.getElementById('adm-theme-ico');
  const themeLbl = document.getElementById('adm-theme-lbl');

  const updateThemeUI = () => {
    const isDark = document.body.classList.contains('dark-mode');
    if (themeIco && themeLbl) {
      themeIco.textContent = isDark ? '☀️' : '🌙';
      themeLbl.textContent = isDark ? 'Light Mode' : 'Night Mode';
    }
  };
  updateThemeUI();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('drogla_theme', isDark ? 'dark' : 'light');
      updateThemeUI();
    });
  }

  // Check Supabase Auth Session & Verify Admin Authorization
  async function verifyAdminUser(user) {
    if (!user) return false;
    // 1. Check verified server-controlled app_metadata claim
    if (user.app_metadata?.role === 'admin') {
      return true;
    }
    // 2. Check if user ID is in admin_users table
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data && data.role === 'admin') {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false; // Strict: Deny by default
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session && !error && session.user) {
      const isAdmin = await verifyAdminUser(session.user);
      if (isAdmin) {
        showDashboard();
      } else {
        await supabase.auth.signOut();
        showLoginGate();
        const errEl = document.getElementById('login-error');
        if (errEl) {
          errEl.textContent = 'Access Denied: Administrator permissions required.';
          errEl.style.display = 'block';
        }
      }
    } else {
      showLoginGate();
    }
  } catch (err) {
    console.warn('Session check fallback:', err);
    showLoginGate();
  }

  // Realtime Auth State Listener (Auto-logout if session expires or signed out)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      showLoginGate();
    }
  });

  // Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-pass').value;
      const btn = document.getElementById('login-btn');
      const errEl = document.getElementById('login-error');

      btn.textContent = 'Authenticating...';
      btn.disabled = true;
      errEl.style.display = 'none';

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        if (data && data.user) {
          const isAdmin = await verifyAdminUser(data.user);
          if (!isAdmin) {
            await supabase.auth.signOut();
            throw new Error('Access Denied: Your account is not authorized as an administrator.');
          }
        }
        showDashboard();
      } catch (err) {
        errEl.textContent = err.message || 'Invalid credentials. Access Denied.';
        errEl.style.display = 'block';
      } finally {
        btn.textContent = 'Authenticate →';
        btn.disabled = false;
      }
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  }

  // Mobile sidebar menu close on overlay click
  const overlay = document.getElementById('adm-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      document.getElementById('adm-sidebar').classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // Initialize Modals Event Listeners
  initModalListeners();
});

function showDashboard() {
  document.getElementById('admin-gate').classList.add('hidden');
  document.getElementById('admin-dash').classList.remove('hidden');
  initDashboard();
}

function showLoginGate() {
  document.getElementById('admin-gate').classList.remove('hidden');
  document.getElementById('admin-dash').classList.add('hidden');
}

/* ══════════════════════════════════════════
   NAVIGATION & TABS
══════════════════════════════════════════ */

window.toggleAdminMenu = function () {
  document.getElementById('adm-sidebar').classList.toggle('open');
  document.getElementById('adm-overlay').classList.toggle('open');
};

function switchTab(tab) {
  document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));

  const targetTab = document.getElementById('tab-' + tab);
  const targetNav = document.getElementById('nav-' + tab);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // Close sidebar on mobile after clicking
  document.getElementById('adm-sidebar').classList.remove('open');
  document.getElementById('adm-overlay').classList.remove('open');

  if (window.lucide) lucide.createIcons();

  if (tab === 'overview') renderOverview();
  if (tab === 'products') renderProducts();
  if (tab === 'categories') renderCategories();
  if (tab === 'shipping') renderShipping();
  if (tab === 'orders') renderOrders();
}

document.querySelectorAll('.adm-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

window.switchTab = switchTab;

/* ══════════════════════════════════════════
   MODAL HELPERS & TOGGLES
══════════════════════════════════════════ */

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;

function initModalListeners() {
  document.querySelectorAll('.modal-bg').forEach(bg => {
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.classList.remove('open');
    });
  });

  // Init all toggle buttons
  ['m-featured-toggle', 'm-bestseller-toggle', 'm-active-toggle', 'cm-active-toggle', 'sm-active-toggle'].forEach(id => {
    initToggles(id);
  });
}

function getToggleVal(id) {
  const sel = document.querySelector(`#${id} .roast-admin-btn.sel`);
  return sel ? sel.dataset.val === 'true' : false;
}

function setToggleVal(id, val) {
  document.querySelectorAll(`#${id} .roast-admin-btn`).forEach(btn => {
    btn.classList.toggle('sel', btn.dataset.val === String(val));
  });
}

function initToggles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.roast-admin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.roast-admin-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });
}

/* ══════════════════════════════════════════
   1. OVERVIEW TAB
══════════════════════════════════════════ */

async function renderOverview() {
  const dateEl = document.getElementById('ov-date');
  if (dateEl) dateEl.textContent = formatDate();

  try {
    const [pRes, oRes, sRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('orders').select('*').order('id', { ascending: false }),
      supabase.from('shipping_rates').select('*')
    ]);

    allProducts = pRes.data || [];
    allOrders = oRes.data || [];
    allShipping = sRes.data || [];
  } catch (err) {
    console.warn('Overview fetch error:', err);
  }

  // Calculate metrics
  const activeProductsCount = allProducts.filter(p => p.active !== false).length;
  const totalOrdersCount = allOrders.length;
  const totalRevenue = allOrders.reduce((acc, o) => acc + (parseFloat(o.total_price || o.total) || 0), 0);
  
  // Calculate total units in stock across all sizes
  let totalStockCount = 0;
  allProducts.forEach(p => {
    if (p.sizes && Array.isArray(p.sizes)) {
      p.sizes.forEach(s => totalStockCount += (parseInt(s.stock) || 0));
    } else if (p.variants && Array.isArray(p.variants)) {
      p.variants.forEach(v => {
        if (v.sizes) {
          Object.values(v.sizes).forEach(qty => totalStockCount += (parseInt(qty) || 0));
        }
      });
    } else {
      totalStockCount += 10;
    }
  });

  const activeShippingCount = allShipping.filter(s => s.active !== false).length;
  const pendingOrdersCount = allOrders.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length;

  const statsEl = document.getElementById('adm-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="adm-stat">
        <div class="adm-stat-n">${activeProductsCount}</div>
        <div class="adm-stat-l">Active Products</div>
      </div>
      <div class="adm-stat">
        <div class="adm-stat-n">${totalOrdersCount}</div>
        <div class="adm-stat-l">Total Orders</div>
      </div>
      <div class="adm-stat">
        <div class="adm-stat-n">${totalRevenue.toLocaleString()} EGP</div>
        <div class="adm-stat-l">Total Revenue</div>
      </div>
      <div class="adm-stat">
        <div class="adm-stat-n">${totalStockCount}</div>
        <div class="adm-stat-l">Units in Stock</div>
      </div>
      <div class="adm-stat">
        <div class="adm-stat-n">${activeShippingCount}</div>
        <div class="adm-stat-l">Active Regions</div>
      </div>
      <div class="adm-stat">
        <div class="adm-stat-n" style="color:var(--orange)">${pendingOrdersCount}</div>
        <div class="adm-stat-l">Pending Orders</div>
      </div>
    `;
  }

  // Recent Orders Table
  const tbody = document.getElementById('recent-orders-body');
  if (tbody) {
    const recent = allOrders.slice(0, 6);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-muted)">No customer orders recorded yet.</td></tr>`;
    } else {
      tbody.innerHTML = recent.map(o => {
        const orderId = String(o.id).substring(0, 8);
        const customerName = escapeHtml(o.customer_name || (o.customer && o.customer.name) || 'Customer');
        const totalFormatted = (parseFloat(o.total_price || o.total) || 0).toLocaleString() + ' EGP';
        const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB') : (o.date || '—');
        const status = o.status || 'pending';
        return `
          <tr>
            <td><strong style="font-family:monospace; color:var(--burgundy);">#${orderId}</strong></td>
            <td><strong>${customerName}</strong></td>
            <td><span class="tag">Apparel Order</span></td>
            <td><strong>${totalFormatted}</strong></td>
            <td style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</td>
            <td>${getOrderStatusPill(status)}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="viewOrder('${o.id}')">View Details</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

/* ══════════════════════════════════════════
   2. PRODUCTS TAB (STREETWEAR ENGINE)
══════════════════════════════════════════ */

async function renderProducts() {
  const tbody = document.getElementById('products-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Loading streetwear catalog...</td></tr>`;

  try {
    const [pRes, cRes] = await Promise.all([
      supabase.from('products').select('*').order('id', { ascending: false }),
      supabase.from('categories').select('*')
    ]);

    allProducts = pRes.data || [];
    allCategories = cRes.data || [];
  } catch (err) {
    console.warn('Error loading products:', err);
  }

  tbody.innerHTML = '';
  if (allProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)">No products found in catalog. Click "+ Add Product" to create one.</td></tr>`;
    return;
  }

  allProducts.forEach(p => {
    // Media thumbnail
    const imgList = (p.image || '').split(',').map(s => s.trim()).filter(Boolean);
    const firstMedia = imgList[0] || 'https://placehold.co/400x500/16161a/ffffff?text=DROGLA';
    const isVideo = firstMedia.match(/\.(mp4|webm)$/i);

    const thumbHtml = isVideo
      ? `<video src="${firstMedia}" style="width:48px;height:58px;object-fit:cover;border-radius:4px;" muted loop autoplay></video>`
      : `<img src="${firstMedia}" alt="${escapeHtml(p.name)}" style="width:48px;height:58px;object-fit:cover;border-radius:4px;background:var(--bg-secondary)"/>`;

    // Sizes badges & inline stock adjusters
    let sizes = p.sizes;
    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      if (p.size) {
        sizes = p.size.split(',').map(s => ({ label: s.trim(), price: p.price, stock: 10 })).filter(x => x.label);
      } else {
        sizes = [{ label: 'Standard', price: p.price, stock: 10 }];
      }
    }

    const stockBadges = sizes.map((sz, si) => `
      <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.3rem">
        <span style="font-size:.72rem;font-weight:700;min-width:32px">${escapeHtml(sz.label)}</span>
        <div class="qty-inline-wrap">
          <button type="button" class="qty-inline-btn" onclick="adjustStock('${p.id}', ${si}, -1)">−</button>
          <input class="qty-inline-val" type="number" value="${sz.stock !== undefined ? sz.stock : 0}" min="0"
            onchange="setStockDirect('${p.id}', ${si}, this.value)"/>
          <button type="button" class="qty-inline-btn" onclick="adjustStock('${p.id}', ${si}, 1)">+</button>
        </div>
        <span style="font-size:.68rem;color:var(--text-muted)">${parseFloat(sz.price || p.price).toFixed(0)} EGP</span>
      </div>
    `).join('');

    const fitType = p.fit_type || 'Oversized';
    const priceFormatted = parseFloat(p.price || 0).toFixed(2);
    const oldPriceFormatted = p.old_price ? `<span style="font-size:0.7rem;text-decoration:line-through;color:var(--text-muted);margin-left:4px;">${parseFloat(p.old_price).toFixed(2)}</span>` : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${thumbHtml}</td>
      <td>
        <strong style="font-size:0.85rem;display:block;">${escapeHtml(p.name)}</strong>
        <span style="font-size:0.7rem;color:var(--text-muted);">${escapeHtml(p.name_ar || '')}</span>
        <div style="margin-top:0.25rem;">
          <span class="tag">🏷️ ${escapeHtml(p.category || 'Apparel')}</span>
        </div>
      </td>
      <td>
        <span class="tag" style="background:rgba(92,26,26,0.06);color:var(--burgundy);font-weight:700;">
          ${escapeHtml(fitType)}
        </span>
      </td>
      <td>${stockBadges}</td>
      <td>
        <strong>${priceFormatted} EGP</strong>
        ${oldPriceFormatted}
      </td>
      <td>
        <div style="display:flex;flex-direction:column;gap:0.3rem;">
          <span class="s-pill ${p.active !== false ? 'on' : 'off'}">
            ${p.active !== false ? '✓ Active' : '✗ Hidden'}
          </span>
          ${p.featured ? '<span class="tag" style="font-size:0.58rem;">⭐ Featured</span>' : ''}
          ${p.is_bestseller ? '<span class="tag" style="font-size:0.58rem;background:var(--burgundy);color:#fff;">🔥 Best Seller</span>' : ''}
          ${p.badge ? `<span class="tag" style="font-size:0.58rem;">🏷️ ${escapeHtml(p.badge)}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="act-row">
          <button class="btn btn-ghost btn-sm" onclick="openEditProduct('${p.id}')">⚙️ Edit</button>
          <button class="btn ${p.active !== false ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleProduct('${p.id}')">
            ${p.active !== false ? 'Hide' : 'Show'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')" title="Delete Product Permanently">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Adjust Stock Inline ──
window.adjustStock = async function (pid, sizeIdx, delta) {
  try {
    const p = allProducts.find(x => String(x.id) === String(pid));
    if (!p) return;

    let sizes = p.sizes;
    if (!sizes || !Array.isArray(sizes)) {
      sizes = (p.size || 'S,M,L,XL').split(',').map(s => ({ label: s.trim(), price: p.price, stock: 10 }));
    }

    if (!sizes[sizeIdx]) return;
    sizes[sizeIdx].stock = Math.max(0, (parseInt(sizes[sizeIdx].stock) || 0) + delta);

    // Save to Supabase
    const { error } = await supabase.from('products').update({ sizes }).eq('id', pid);
    if (error) throw error;

    p.sizes = sizes;
    renderProducts();
    toast(`Stock updated: ${p.name} (${sizes[sizeIdx].label}) → ${sizes[sizeIdx].stock}`, 'success');
  } catch (e) {
    toast('Stock update failed: ' + e.message, 'error');
  }
};

window.setStockDirect = async function (pid, sizeIdx, val) {
  try {
    const p = allProducts.find(x => String(x.id) === String(pid));
    if (!p) return;

    let sizes = p.sizes;
    if (!sizes || !Array.isArray(sizes)) {
      sizes = (p.size || 'S,M,L,XL').split(',').map(s => ({ label: s.trim(), price: p.price, stock: 10 }));
    }

    if (!sizes[sizeIdx]) return;
    sizes[sizeIdx].stock = Math.max(0, parseInt(val) || 0);

    const { error } = await supabase.from('products').update({ sizes }).eq('id', pid);
    if (error) throw error;

    p.sizes = sizes;
    toast(`Stock set: ${p.name} (${sizes[sizeIdx].label}) → ${sizes[sizeIdx].stock}`, 'info');
  } catch (e) {
    toast('Stock set failed: ' + e.message, 'error');
  }
};

// ── Toggle Product Active ──
window.toggleProduct = async function (pid) {
  try {
    const p = allProducts.find(x => String(x.id) === String(pid));
    if (!p) return;
    const nextStatus = !(p.active !== false);

    const { error } = await supabase.from('products').update({ active: nextStatus }).eq('id', pid);
    if (error) throw error;

    p.active = nextStatus;
    renderProducts();
    toast(`Product "${p.name}" is now ${nextStatus ? 'visible' : 'hidden'}`, nextStatus ? 'success' : 'info');
  } catch (e) {
    toast('Toggle failed: ' + e.message, 'error');
  }
};

// ── Delete Product ──
window.deleteProduct = async function (pid) {
  const p = allProducts.find(x => String(x.id) === String(pid));
  if (!p) return;
  if (!confirm(`Are you sure you want to permanently delete "${p.name}"?`)) return;

  try {
    // Delete associated order items if any to avoid constraint error
    await supabase.from('order_items').delete().eq('product_id', pid);
    const { error } = await supabase.from('products').delete().eq('id', pid);
    if (error) throw error;

    toast(`Deleted product "${p.name}"`, 'info');
    await renderProducts();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

// ── Add / Edit Product Modal ──
window.openEditProduct = async function (pid) {
  let p = null;
  if (pid) {
    p = allProducts.find(x => String(x.id) === String(pid));
  }

  // Populate category dropdown with Optgroups (Men, Women, Unisex, Accessories)
  const catSelect = document.getElementById('m-cat');
  catSelect.innerHTML = '';

  const defaultCats = [
    { slug: 'men-tops', name: 'Men Tops', name_ar: 'توبات رجالي', gender: 'men' },
    { slug: 'men-tshirts', name: 'Men T-Shirts', name_ar: 'تيشيرتات رجالي', gender: 'men' },
    { slug: 'men-shirts', name: 'Men Shirts', name_ar: 'قمصان رجالي', gender: 'men' },
    { slug: 'men-bottoms', name: 'Men Bottoms / Pants', name_ar: 'بناطيل رجالي', gender: 'men' },
    { slug: 'women-tops', name: 'Women Tops', name_ar: 'توبات حريمي', gender: 'women' },
    { slug: 'women-tshirts', name: 'Women T-Shirts', name_ar: 'تيشيرتات حريمي', gender: 'women' },
    { slug: 'women-shirts', name: 'Women Shirts', name_ar: 'قمصان حريمي', gender: 'women' },
    { slug: 'women-bottoms', name: 'Women Bottoms', name_ar: 'بناطيل حريمي', gender: 'women' },
    { slug: 'stealth', name: 'Stealth Drop', name_ar: 'مجموعة ستيلث', gender: 'unisex' },
    { slug: 'hoodies', name: 'Hoodies & Sweatshirts', name_ar: 'هوديز وسويت شيرت', gender: 'unisex' }
  ];

  const catsToUse = allCategories.length > 0 ? allCategories : defaultCats;

  const groups = {
    men: { label: '👨 Men — رجالي', items: [] },
    women: { label: '👩 Women — حريمي', items: [] },
    unisex: { label: '⚡ Unisex & Collections — للجنسين', items: [] },
    accessories: { label: '🎒 Accessories — إكسسوارات', items: [] }
  };

  catsToUse.forEach(cat => {
    let g = (cat.gender || '').toLowerCase();
    if (!g) {
      const s = (cat.slug || '').toLowerCase();
      if (s.startsWith('men-') || s.startsWith('men')) g = 'men';
      else if (s.startsWith('women-') || s.startsWith('women')) g = 'women';
      else if (s.startsWith('acc-') || s.startsWith('accessory')) g = 'accessories';
      else g = 'unisex';
    }
    if (!groups[g]) groups[g] = { label: g.toUpperCase(), items: [] };
    groups[g].items.push(cat);
  });

  Object.values(groups).forEach(grp => {
    if (grp.items.length > 0) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = grp.label;
      grp.items.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
        opt.textContent = `${c.name} ${c.name_ar ? `(${c.name_ar})` : ''}`;
        optGroup.appendChild(opt);
      });
      catSelect.appendChild(optGroup);
    }
  });

  document.getElementById('modal-title').textContent = p ? `Edit: ${p.name}` : 'Add Streetwear Product';
  document.getElementById('m-pid').value = p ? p.id : '';
  document.getElementById('m-name').value = p ? p.name : '';
  document.getElementById('m-name-ar').value = p ? (p.name_ar || '') : '';
  document.getElementById('m-price').value = p ? p.price : '';
  document.getElementById('m-old-price').value = p && p.old_price ? p.old_price : '';
  document.getElementById('m-cat').value = p ? (p.category || catsToUse[0].slug) : catsToUse[0].slug;
  document.getElementById('m-fit-type').value = p && p.fit_type ? p.fit_type : 'Oversized';
  document.getElementById('m-badge').value = p && p.badge ? p.badge : '';
  document.getElementById('m-desc').value = p ? (p.description || '') : '';
  document.getElementById('m-images').value = p ? (p.image || '') : '';

  setToggleVal('m-featured-toggle', p ? !!p.featured : false);
  setToggleVal('m-bestseller-toggle', p ? !!p.is_bestseller : false);
  setToggleVal('m-active-toggle', p ? p.active !== false : true);

  // Sizes rows
  let sizes = p ? p.sizes : null;
  if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
    if (p && p.size) {
      sizes = p.size.split(',').map(s => ({ label: s.trim(), price: p.price, stock: 10 }));
    } else {
      sizes = [
        { label: 'S', price: p ? p.price : 650, stock: 10 },
        { label: 'M', price: p ? p.price : 650, stock: 15 },
        { label: 'L', price: p ? p.price : 650, stock: 15 },
        { label: 'XL', price: p ? p.price : 650, stock: 10 },
        { label: 'XXL', price: p ? p.price : 650, stock: 5 }
      ];
    }
  }
  renderSizeRows(sizes);

  // Colors rows
  let colors = p ? p.colors : null;
  let colorsList = [];
  if (Array.isArray(colors)) {
    colorsList = colors;
  } else if (typeof colors === 'string' && colors) {
    colorsList = colors.split(',').map(c => ({ name: c.trim(), hex: '#111010' }));
  }
  renderColorRows(colorsList);

  // Variant images mapping
  renderVariantImageInputs(p ? (p.variant_images || p.variantImages) : null, colorsList);

  // Render Image Previews
  renderDropPreviews();

  openModal('product-modal');
};

document.getElementById('add-product-btn').addEventListener('click', () => openEditProduct(null));

document.getElementById('m-price').addEventListener('input', (e) => {
  const newPrice = parseFloat(e.target.value);
  if (!isNaN(newPrice)) {
    const priceInputs = document.querySelectorAll('#m-size-rows .size-row [data-field="price"]');
    priceInputs.forEach(input => input.value = newPrice);
  }
});

// ── Size Rows Management ──
function renderSizeRows(sizes) {
  const wrap = document.getElementById('m-size-rows');
  wrap.innerHTML = '';
  sizes.forEach((sz, i) => {
    const row = document.createElement('div');
    row.className = 'size-row';
    row.innerHTML = `
      <span class="size-row-lbl">#${i + 1}</span>
      <div class="fg"><input type="text" placeholder="Size (e.g. M)" value="${escapeHtml(sz.label || '')}" data-field="label"/></div>
      <div class="fg"><input type="number" placeholder="Price" value="${sz.price || ''}" min="0" data-field="price"/></div>
      <div class="fg"><input type="number" placeholder="Stock" value="${sz.stock !== undefined ? sz.stock : 10}" min="0" data-field="stock"/></div>
      <button type="button" onclick="this.closest('.size-row').remove()" style="color:var(--red);background:none;border:none;font-size:1.1rem;cursor:pointer;padding:0.2rem">✕</button>
    `;
    wrap.appendChild(row);
  });
}

function getSizeRowsData() {
  const rows = document.querySelectorAll('#m-size-rows .size-row');
  return Array.from(rows).map(row => ({
    label: row.querySelector('[data-field="label"]').value.trim(),
    price: parseFloat(row.querySelector('[data-field="price"]').value) || parseFloat(document.getElementById('m-price').value) || 0,
    stock: parseInt(row.querySelector('[data-field="stock"]').value) || 0
  })).filter(s => s.label);
}

document.getElementById('add-size-btn').addEventListener('click', () => {
  const sizes = getSizeRowsData();
  const basePrice = parseFloat(document.getElementById('m-price').value) || 650;
  sizes.push({ label: '', price: basePrice, stock: 10 });
  renderSizeRows(sizes);
});

document.getElementById('preset-sizes-btn').addEventListener('click', () => {
  const basePrice = parseFloat(document.getElementById('m-price').value) || 650;
  const standard = ['S', 'M', 'L', 'XL', 'XXL'].map(l => ({ label: l, price: basePrice, stock: 10 }));
  renderSizeRows(standard);
});

document.getElementById('preset-pants-btn').addEventListener('click', () => {
  const basePrice = parseFloat(document.getElementById('m-price').value) || 750;
  const pants = ['30', '32', '34', '36', '38'].map(l => ({ label: l, price: basePrice, stock: 10 }));
  renderSizeRows(pants);
});

// ── Colors Rows Management ──
function renderColorRows(colors) {
  const wrap = document.getElementById('m-color-rows');
  wrap.innerHTML = '';
  colors.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'color-admin-row';
    row.innerHTML = `
      <input type="color" value="${c.hex || '#111010'}" data-field="hex" title="Select color hex"/>
      <div class="fg" style="flex:1;"><input type="text" placeholder="Color Name (e.g. Washed Black)" value="${escapeHtml(c.name || '')}" data-field="name"/></div>
      <button type="button" onclick="this.closest('.color-admin-row').remove(); updateVariantInputsOnColorChange();" style="color:var(--red);background:none;border:none;font-size:1.1rem;cursor:pointer;padding:0.2rem">✕</button>
    `;
    wrap.appendChild(row);
  });
}

function getColorRowsData() {
  const rows = document.querySelectorAll('#m-color-rows .color-admin-row');
  return Array.from(rows).map(row => ({
    hex: row.querySelector('[data-field="hex"]').value,
    name: row.querySelector('[data-field="name"]').value.trim()
  })).filter(c => c.name);
}

document.getElementById('add-color-btn').addEventListener('click', () => {
  const colors = getColorRowsData();
  colors.push({ hex: '#111010', name: '' });
  renderColorRows(colors);
  updateVariantInputsOnColorChange();
});

function updateVariantInputsOnColorChange() {
  const colors = getColorRowsData();
  renderVariantImageInputs(getVariantImagesData(), colors);
}

// ── Variant Images Mapping ──
function renderVariantImageInputs(variantImages, colors) {
  const sec = document.getElementById('m-variants-img-section');
  const container = document.getElementById('variant-img-inputs');
  container.innerHTML = '';

  if (!colors || colors.length === 0) {
    sec.style.display = 'none';
    return;
  }
  sec.style.display = 'block';

  colors.forEach(c => {
    const val = variantImages && variantImages[c.name] ? variantImages[c.name] : '';
    container.innerHTML += `
      <div style="display:flex; flex-direction:column; gap:0.25rem;">
        <label style="font-size:0.72rem; font-weight:700; color:var(--burgundy);">${escapeHtml(c.name)} Image</label>
        <input type="text" class="f-input v-img-input" data-color="${escapeHtml(c.name)}" placeholder="Paste image URL..." value="${escapeHtml(val)}" style="font-size:0.78rem; padding:0.45rem;"/>
      </div>
    `;
  });
}

function getVariantImagesData() {
  const inputs = document.querySelectorAll('.v-img-input');
  const data = {};
  inputs.forEach(inp => {
    if (inp.value.trim()) data[inp.dataset.color] = inp.value.trim();
  });
  return data;
}

// ── Drag & Drop Multi-Image Upload ──
(function initDropZone() {
  const zone = document.getElementById('m-drop-zone');
  const input = document.getElementById('m-file-input');
  const pathInput = document.getElementById('m-images');

  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  input.addEventListener('change', () => handleFiles(input.files));

  async function handleFiles(files) {
    const textEl = zone.querySelector('.drop-zone-text');
    const origText = textEl.innerHTML;
    textEl.innerHTML = 'Uploading files to storage... please wait.';

    const ALLOWED_ADMIN_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/webm'];
    const MAX_ADMIN_FILE_SIZE = 15 * 1024 * 1024; // 15MB

    const uploadedUrls = [];

    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_ADMIN_MIMES.includes(file.type.toLowerCase())) {
          throw new Error(`File "${file.name}" has invalid format. Only JPEG, PNG, WEBP images and MP4/WEBM videos are allowed.`);
        }
        if (file.size > MAX_ADMIN_FILE_SIZE) {
          throw new Error(`File "${file.name}" exceeds maximum allowed size of 15MB.`);
        }

        const rawExt = file.name.split('.').pop() || 'jpg';
        const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
        const randomHash = Math.random().toString(36).substring(2, 9);
        const fileName = `media-${Date.now()}-${randomHash}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        if (publicUrlData && publicUrlData.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      const existing = pathInput.value.split(',').map(s => s.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...uploadedUrls])].join(', ');
      pathInput.value = merged;
      renderDropPreviews();
      toast(`Successfully uploaded ${uploadedUrls.length} file(s)`, 'success');
    } catch (err) {
      toast('Upload failed: ' + err.message, 'error');
    } finally {
      textEl.innerHTML = origText;
    }
  }
})();

function renderDropPreviews() {
  const preview = document.getElementById('m-drop-preview');
  const pathInput = document.getElementById('m-images');
  if (!preview || !pathInput) return;

  preview.innerHTML = '';
  const urls = pathInput.value.split(',').map(s => s.trim()).filter(Boolean);

  urls.forEach((url, idx) => {
    const isVideo = url.match(/\.(mp4|webm)$/i);
    const item = document.createElement('div');
    item.className = 'drop-preview-item';

    if (isVideo) {
      item.innerHTML = `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" muted autoplay loop></video>`;
    } else {
      item.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;"/>`;
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.innerHTML = '✕';
    delBtn.style = 'position:absolute;top:2px;right:2px;background:rgba(198,40,40,0.85);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      urls.splice(idx, 1);
      pathInput.value = urls.join(', ');
      renderDropPreviews();
    };

    item.appendChild(delBtn);
    preview.appendChild(item);
  });
}

// ── Save Product to Supabase (Adaptive & Resilient) ──
document.getElementById('save-product-btn').addEventListener('click', async () => {
  const pid = document.getElementById('m-pid').value;
  const name = document.getElementById('m-name').value.trim();
  const nameAr = document.getElementById('m-name-ar').value.trim();
  const price = parseFloat(document.getElementById('m-price').value) || 0;
  const oldPrice = parseFloat(document.getElementById('m-old-price').value) || null;
  const cat = document.getElementById('m-cat').value;
  const fitType = document.getElementById('m-fit-type').value;
  const badge = document.getElementById('m-badge').value.trim() || null;
  const desc = document.getElementById('m-desc').value.trim();
  const imgStr = document.getElementById('m-images').value.trim();

  const sizes = getSizeRowsData();
  const colors = getColorRowsData();
  const variantImages = getVariantImagesData();

  if (!name || !price) {
    toast('Please fill in Product Name and Price', 'error');
    return;
  }

  // Format storefront-compatible variants
  const variants = colors.map(c => {
    const sizeMap = {};
    sizes.forEach(s => { sizeMap[s.label] = s.stock || 10; });
    return {
      color: c.name,
      image: (variantImages && variantImages[c.name]) || (imgStr ? imgStr.split(',')[0].trim() : ''),
      sizes: sizeMap
    };
  });

  let payload = {
    name,
    name_ar: nameAr,
    price,
    old_price: oldPrice,
    category: cat,
    fit_type: fitType,
    badge,
    description: desc,
    image: imgStr,
    size: sizes.map(s => s.label).join(', '),
    sizes: sizes,
    colors: colors,
    variant_images: variantImages,
    variants: variants,
    featured: getToggleVal('m-featured-toggle'),
    is_bestseller: getToggleVal('m-bestseller-toggle'),
    active: getToggleVal('m-active-toggle')
  };

  const btn = document.getElementById('save-product-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    let saveSuccess = false;
    let attempts = 0;

    // Resilient retry loop that catches any missing database column errors and saves cleanly
    while (!saveSuccess && attempts < 6) {
      attempts++;
      let error = null;

      if (pid) {
        const res = await supabase.from('products').update(payload).eq('id', pid);
        error = res.error;
      } else {
        const res = await supabase.from('products').insert([payload]);
        error = res.error;
      }

      if (!error) {
        saveSuccess = true;
      } else {
        console.warn(`Supabase attempt ${attempts} error:`, error.message);
        const match = error.message.match(/column "([^"]+)" of relation "products" does not exist/i) ||
                      error.message.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && payload.hasOwnProperty(match[1])) {
          console.warn(`Auto-removing unsupported column "${match[1]}" and retrying...`);
          delete payload[match[1]];
        } else {
          throw error;
        }
      }
    }

    toast(`Product "${name}" saved successfully!`, 'success');
    closeModal('product-modal');
    await renderProducts();
  } catch (err) {
    console.error('Save product error:', err);
    toast('Failed to save product: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Save Product';
    btn.disabled = false;
  }
});

/* ══════════════════════════════════════════
   3. CATEGORIES TAB
══════════════════════════════════════════ */

function getGenderBadge(gender, slug = '') {
  let g = (gender || '').toLowerCase();
  if (!g) {
    const s = slug.toLowerCase();
    if (s.startsWith('men-') || s.startsWith('men')) g = 'men';
    else if (s.startsWith('women-') || s.startsWith('women')) g = 'women';
    else if (s.startsWith('acc-') || s.startsWith('accessory')) g = 'accessories';
    else g = 'unisex';
  }

  const map = {
    men: { label: '👨 Men (رجالي)', color: 'var(--burgundy)', bg: 'rgba(92,26,26,0.08)' },
    women: { label: '👩 Women (حريمي)', color: '#d81b60', bg: 'rgba(216,27,96,0.08)' },
    unisex: { label: '⚡ Unisex (للجنسين)', color: '#e65100', bg: 'rgba(230,81,0,0.08)' },
    accessories: { label: '🎒 Accessories', color: '#5e35b1', bg: 'rgba(94,53,177,0.08)' }
  };

  const item = map[g] || map.unisex;
  return `<span class="tag" style="color:${item.color};background:${item.bg};font-weight:700;font-size:0.65rem;">${item.label}</span>`;
}

async function renderCategories() {
  const tbody = document.getElementById('categories-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Loading categories...</td></tr>`;

  try {
    const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
    if (!error && data) {
      allCategories = data;
    }
  } catch (err) {
    console.warn('Category fetch error:', err);
  }

  tbody.innerHTML = '';
  if (allCategories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-muted)">No custom categories found. Click "+ Add Category" to create one.</td></tr>`;
    return;
  }

  allCategories.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="font-size:.72rem;font-family:monospace">#${c.id}</span></td>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${escapeHtml(c.name_ar || '—')}</td>
      <td>${getGenderBadge(c.gender, c.slug)}</td>
      <td><span class="s-pill">${escapeHtml(c.slug || '')}</span></td>
      <td>
        <button class="s-pill ${c.active !== false ? 'on' : 'off'}" onclick="toggleCategoryActive('${c.id}', ${c.active !== false})" style="cursor:pointer;border:none">
          ${c.active !== false ? 'Active' : 'Hidden'}
        </button>
      </td>
      <td>
        <div class="act-row">
          <button class="btn btn-ghost btn-sm" onclick="openEditCategory('${c.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.toggleCategoryActive = async function (id, currentStatus) {
  try {
    const { error } = await supabase.from('categories').update({ active: !currentStatus }).eq('id', id);
    if (error) throw error;
    await renderCategories();
    toast('Category status updated', 'success');
  } catch (e) {
    toast('Status toggle failed: ' + e.message, 'error');
  }
};

window.deleteCategory = async function (id) {
  if (!confirm('Are you sure you want to delete this category?')) return;
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await renderCategories();
    toast('Category deleted', 'info');
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

// Auto-generate suggested slug based on name and gender
function suggestCategorySlug() {
  const isAddMode = !document.getElementById('cm-id').value;
  if (!isAddMode) return;

  const gender = document.getElementById('cm-gender').value;
  const name = document.getElementById('cm-name').value.trim().toLowerCase();
  if (!name) return;

  const cleanName = name.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let suggested = cleanName;

  if (gender === 'men') {
    suggested = cleanName.startsWith('men-') ? cleanName : `men-${cleanName}`;
  } else if (gender === 'women') {
    suggested = cleanName.startsWith('women-') ? cleanName : `women-${cleanName}`;
  } else if (gender === 'accessories') {
    suggested = cleanName.startsWith('acc-') ? cleanName : `acc-${cleanName}`;
  }

  document.getElementById('cm-slug').value = suggested;
}

window.openEditCategory = function (id) {
  document.getElementById('cm-id').value = id || '';
  if (id) {
    const c = allCategories.find(x => String(x.id) === String(id));
    if (!c) return;
    document.getElementById('cm-title').textContent = 'Edit Category';
    
    // Determine gender
    let g = c.gender || '';
    if (!g) {
      const s = (c.slug || '').toLowerCase();
      if (s.startsWith('men-') || s.startsWith('men')) g = 'men';
      else if (s.startsWith('women-') || s.startsWith('women')) g = 'women';
      else if (s.startsWith('acc-') || s.startsWith('accessory')) g = 'accessories';
      else g = 'unisex';
    }

    document.getElementById('cm-gender').value = g;
    document.getElementById('cm-name').value = c.name;
    document.getElementById('cm-name-ar').value = c.name_ar || '';
    document.getElementById('cm-slug').value = c.slug || '';
    document.getElementById('cm-image').value = c.image || '';
    setToggleVal('cm-active-toggle', c.active !== false);
  } else {
    document.getElementById('cm-title').textContent = 'Add Category';
    document.getElementById('cm-gender').value = 'men';
    document.getElementById('cm-name').value = '';
    document.getElementById('cm-name-ar').value = '';
    document.getElementById('cm-slug').value = '';
    document.getElementById('cm-image').value = '';
    setToggleVal('cm-active-toggle', true);
  }
  openModal('cat-modal');
};

document.getElementById('add-cat-btn').addEventListener('click', () => openEditCategory(null));

// Slug generator listeners
document.getElementById('cm-name').addEventListener('input', suggestCategorySlug);
document.getElementById('cm-gender').addEventListener('change', suggestCategorySlug);

document.getElementById('save-cat-btn').addEventListener('click', async () => {
  const id = document.getElementById('cm-id').value;
  const gender = document.getElementById('cm-gender').value;
  const name = document.getElementById('cm-name').value.trim();
  const nameAr = document.getElementById('cm-name-ar').value.trim();
  const slug = document.getElementById('cm-slug').value.trim() || name.toLowerCase().replace(/\s+/g, '-');
  const image = document.getElementById('cm-image').value.trim();
  const active = getToggleVal('cm-active-toggle');

  if (!name) {
    toast('Category Name is required', 'error');
    return;
  }

  let payload = {
    name,
    name_ar: nameAr,
    gender,
    slug,
    image,
    active
  };

  const btn = document.getElementById('save-cat-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    let saveSuccess = false;
    let attempts = 0;

    while (!saveSuccess && attempts < 4) {
      attempts++;
      let error = null;

      if (id) {
        const res = await supabase.from('categories').update(payload).eq('id', id);
        error = res.error;
      } else {
        const res = await supabase.from('categories').insert([payload]);
        error = res.error;
      }

      if (!error) {
        saveSuccess = true;
      } else {
        console.warn(`Category attempt ${attempts} error:`, error.message);
        const match = error.message.match(/column "([^"]+)" of relation "categories" does not exist/i) ||
                      error.message.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && payload.hasOwnProperty(match[1])) {
          console.warn(`Auto-removing column "${match[1]}" and retrying category save...`);
          delete payload[match[1]];
        } else {
          throw error;
        }
      }
    }

    toast(`Category "${name}" saved!`, 'success');
    closeModal('cat-modal');
    await renderCategories();
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Save Category';
    btn.disabled = false;
  }
});

// Category Image Upload
document.getElementById('cat-image-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const lbl = document.getElementById('cat-upload-status');
  lbl.textContent = 'Uploading banner image...';

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `cat-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    document.getElementById('cm-image').value = publicUrlData.publicUrl;
    lbl.textContent = 'Uploaded successfully!';
  } catch (err) {
    lbl.textContent = 'Upload failed: ' + err.message;
  }
});

/* ══════════════════════════════════════════
   4. SHIPPING & GOVERNORATES TAB
══════════════════════════════════════════ */

async function renderShipping() {
  const listEl = document.getElementById('shipping-list');
  if (!listEl) return;
  listEl.innerHTML = `<p style="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem">Loading delivery governorates...</p>`;

  try {
    const { data, error } = await supabase.from('shipping_rates').select('*').order('id', { ascending: true });
    if (!error && data) {
      allShipping = data;
    }
  } catch (err) {
    console.warn('Shipping fetch error:', err);
  }

  listEl.innerHTML = '';
  if (allShipping.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2.5rem">No governorates added. Click "+ Add Governorate" above to configure delivery zones.</p>`;
    return;
  }

  allShipping.forEach(s => {
    const govName = s.governorate || s.name || '';
    const govNameAr = s.governorate_ar || s.name_ar || '';
    const cost = parseFloat(s.cost !== undefined ? s.cost : s.price) || 0;
    const duration = s.days || s.duration || '2-3 business days';
    const isActive = s.active !== false;

    const card = document.createElement('div');
    card.className = `ship-editor-card ${isActive ? '' : 'inactive-card'}`;
    card.innerHTML = `
      <div class="ship-ed-icon">📍</div>
      <div class="ship-ed-info">
        <div class="ship-ed-name">${escapeHtml(govNameAr ? `${govNameAr} — ${govName}` : govName)}</div>
        <div class="ship-ed-days">⏱ Delivery: ${escapeHtml(duration)}</div>
      </div>
      <div class="ship-ed-price">${cost === 0 ? 'Free Shipping' : cost.toLocaleString() + ' EGP'}</div>
      <div class="ship-ed-actions">
        <span class="s-pill ${isActive ? 'on' : 'off'}">${isActive ? '✓ Active' : '✗ Off'}</span>
        <button class="btn btn-ghost btn-sm" onclick="openEditShipping('${s.id}')">✏️ Edit</button>
        <button class="btn ${isActive ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleShipping('${s.id}')">
          ${isActive ? 'Disable' : 'Enable'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteShipping('${s.id}')">🗑</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

window.openEditShipping = function (sid) {
  const s = sid ? allShipping.find(x => String(x.id) === String(sid)) : null;
  document.getElementById('ship-modal-title').textContent = s ? `Edit: ${s.governorate || s.name}` : 'Add Governorate';
  document.getElementById('sm-id').value = s ? s.id : '';
  document.getElementById('sm-name').value = s ? (s.governorate || s.name || '') : '';
  document.getElementById('sm-name-ar').value = s ? (s.governorate_ar || s.name_ar || '') : '';
  document.getElementById('sm-price').value = s ? (s.cost !== undefined ? s.cost : s.price) : 50;
  document.getElementById('sm-days').value = s ? (s.days || s.duration || '') : '2-3 business days';
  setToggleVal('sm-active-toggle', s ? s.active !== false : true);
  openModal('shipping-modal');
};

window.toggleShipping = async function (sid) {
  try {
    const s = allShipping.find(x => String(x.id) === String(sid));
    if (!s) return;
    const nextStatus = !(s.active !== false);

    const { error } = await supabase.from('shipping_rates').update({ active: nextStatus }).eq('id', sid);
    if (error) throw error;

    s.active = nextStatus;
    await renderShipping();
    toast(`Governorate status updated`, 'success');
  } catch (e) {
    toast('Toggle failed: ' + e.message, 'error');
  }
};

window.deleteShipping = async function (sid) {
  if (!confirm('Delete this delivery governorate?')) return;
  try {
    const { error } = await supabase.from('shipping_rates').delete().eq('id', sid);
    if (error) throw error;
    await renderShipping();
    toast('Governorate removed', 'info');
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

document.getElementById('add-ship-btn').addEventListener('click', () => openEditShipping(null));

document.getElementById('save-ship-btn').addEventListener('click', async () => {
  const sid = document.getElementById('sm-id').value;
  const name = document.getElementById('sm-name').value.trim();
  const nameAr = document.getElementById('sm-name-ar').value.trim();
  const cost = parseFloat(document.getElementById('sm-price').value) || 0;
  const days = document.getElementById('sm-days').value.trim() || '2-3 business days';
  const active = getToggleVal('sm-active-toggle');

  if (!name || !nameAr) {
    toast('Please fill in both English and Arabic governorate names', 'error');
    return;
  }

  const payload = {
    governorate: name,
    name: name,
    governorate_ar: nameAr,
    name_ar: nameAr,
    cost: cost,
    price: cost,
    days: days,
    duration: days,
    active: active
  };

  try {
    if (sid) {
      const { error } = await supabase.from('shipping_rates').update(payload).eq('id', sid);
      if (error) throw error;
      toast(`Governorate "${name}" updated!`, 'success');
    } else {
      const { error } = await supabase.from('shipping_rates').insert([payload]);
      if (error) throw error;
      toast(`Governorate "${name}" added!`, 'success');
    }
    closeModal('shipping-modal');
    await renderShipping();
  } catch (err) {
    toast('Save failed: ' + err.message, 'error');
  }
});

/* ══════════════════════════════════════════
   5. ORDERS TAB
══════════════════════════════════════════ */

function getOrderStatusPill(status) {
  const s = (status || 'pending').toLowerCase();
  const map = {
    pending: { cls: 's-pill pending', label: '⏳ Pending' },
    processing: { cls: 's-pill processing', label: '🔄 Processing' },
    shipped: { cls: 's-pill on', label: '📦 Shipped' },
    delivered: { cls: 's-pill on', label: '✅ Delivered', style: 'background:var(--green);color:#fff;' },
    cancelled: { cls: 's-pill off', label: '✗ Cancelled' }
  };
  const info = map[s] || map.pending;
  return `<span class="${info.cls}"${info.style ? ' style="' + info.style + '"' : ''}>${info.label}</span>`;
}

function buildStatusSelect(orderId, currentStatus) {
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const opts = statuses.map(s =>
    `<option value="${s}" ${s === (currentStatus || 'pending').toLowerCase() ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
  ).join('');
  return `
    <select aria-label="Order status" onchange="updateOrderStatus('${orderId}', this.value)" style="font-size:.72rem;padding:.3rem .5rem;border-radius:4px;border:1px solid var(--border-subtle);background:var(--bg-secondary);color:var(--text-main);cursor:pointer;font-weight:600;">
      ${opts}
    </select>
  `;
}

window.updateOrderStatus = async function (orderId, newStatus) {
  try {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) throw error;

    const o = allOrders.find(x => String(x.id) === String(orderId));
    if (o) o.status = newStatus;

    toast(`Order #${String(orderId).substring(0, 8)} status → ${newStatus}`, 'success');
    await renderOrders();
  } catch (e) {
    toast('Status update failed: ' + e.message, 'error');
  }
};

async function renderOrders() {
  const tbody = document.getElementById('orders-body');
  const emptyEl = document.getElementById('orders-empty');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">Loading customer orders...</td></tr>`;

  try {
    const { data, error } = await supabase.from('orders').select('*').order('id', { ascending: false });
    if (!error && data) {
      allOrders = data;
      currentOrders = data;
    }
  } catch (err) {
    console.warn('Orders fetch error:', err);
  }

  tbody.innerHTML = '';
  if (allOrders.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  allOrders.forEach(o => {
    const addressRaw = o.address || '';
    
    const orderId = String(o.id).substring(0, 8);
    const customerName = escapeHtml(o.customer_name || (o.customer && o.customer.name) || 'Customer');
    const customerEmail = escapeHtml(o.email || '');
    const totalFormatted = (parseFloat(o.total_price || o.total) || 0).toLocaleString() + ' EGP';
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB') : (o.date || '—');

    let govName = 'Egypt';
    if (addressRaw.includes(' - ')) {
      govName = addressRaw.split(' - ')[0].trim();
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="font-family:monospace;color:var(--burgundy);display:block;margin-bottom:4px;">#${orderId}</strong>
        <button class="btn btn-ghost btn-sm" onclick="viewOrder('${o.id}')" style="font-size:0.6rem;padding:2px 6px;">View Details</button>
      </td>
      <td>
        <strong style="font-size:0.85rem;display:block;">${customerName}</strong>
        <span style="font-size:0.7rem;color:var(--text-muted);">${customerEmail}</span>
      </td>
      <td style="font-size:0.75rem;">
        <span class="tag">Apparel Order</span>
      </td>
      <td><strong>${escapeHtml(govName)}</strong></td>
      <td><strong style="font-size:0.85rem;">${totalFormatted}</strong></td>
      <td style="font-size:0.75rem;color:var(--text-muted);">${dateStr}</td>
      <td>${getOrderStatusPill(o.status)}</td>
      <td>${buildStatusSelect(o.id, o.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── View Order Details Modal (With Payment Proof Preview) ──
window.viewOrder = async function (id) {
  const o = allOrders.find(x => String(x.id) === String(id));
  if (!o) return;

  const addressRaw = o.address || '';

  let phone = '—';
  let paymentMethod = 'Cash on Delivery';
  let proofUrl = '';
  let cleanAddress = addressRaw;

  const phoneMatch = addressRaw.match(/\(Phone:\s*([^)]+)\)/i);
  if (phoneMatch) phone = phoneMatch[1].trim();

  const paymentMatch = addressRaw.match(/\[Payment:\s*([^\]]+)\]/i);
  if (paymentMatch) paymentMethod = paymentMatch[1].trim();

  const proofMatch = addressRaw.match(/\[Proof:\s*([^\]]+)\]/i);
  if (proofMatch) proofUrl = proofMatch[1].trim();

  // Fetch associated order items if available
  let orderItems = [];
  try {
    const { data } = await supabase.from('order_items').select('*, products(name, image)').eq('order_id', o.id);
    if (data) orderItems = data;
  } catch (err) {}

  let itemsHtml = '';
  if (orderItems.length > 0) {
    itemsHtml = orderItems.map(i => `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding:8px 0;">
        <div>
          <strong>${escapeHtml(i.products?.name || `Product #${i.product_id}`)}</strong>
          <span style="font-size:0.72rem; color:var(--text-muted); display:block;">Qty: ${i.quantity} × ${parseFloat(i.price).toFixed(2)} EGP</span>
        </div>
        <strong>${(parseFloat(i.price) * parseInt(i.quantity)).toFixed(2)} EGP</strong>
      </div>
    `).join('');
  } else {
    itemsHtml = `<p style="color:var(--text-muted);font-size:0.78rem;">Order items breakdown stored in checkout details.</p>`;
  }

  // Payment proof image section
  let proofHtml = '';
  if (proofUrl) {
    proofHtml = `
      <div style="margin-top:1.2rem; background:var(--bg-secondary); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
        <strong style="display:block; margin-bottom:0.5rem; color:var(--burgundy);">📸 Transfer Proof Screenshot (Vodafone Cash / InstaPay):</strong>
        <a href="${proofUrl}" target="_blank" title="Click to view full image">
          <img src="${proofUrl}" alt="Transfer Proof" style="max-width:100%; max-height:260px; object-fit:contain; border-radius:6px; border:1px solid var(--border-subtle); display:block;"/>
        </a>
        <a href="${proofUrl}" target="_blank" style="font-size:0.72rem; color:var(--burgundy); text-decoration:underline; display:inline-block; margin-top:0.4rem;">Open original high-res image ↗</a>
      </div>
    `;
  }

  const modalBody = document.getElementById('order-details-body');
  modalBody.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-bottom:1.2rem;">
      <div style="background:var(--bg-secondary); padding:1rem; border-radius:var(--radius-sm);">
        <h4 style="color:var(--burgundy); margin-bottom:0.6rem; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em;">👤 Customer Information</h4>
        <div><strong>Name:</strong> ${escapeHtml(o.customer_name || '—')}</div>
        <div><strong>Phone:</strong> ${escapeHtml(phone)}</div>
        <div><strong>Email:</strong> ${escapeHtml(o.email || '—')}</div>
        <div style="margin-top:0.4rem;"><strong>Shipping Address:</strong><br><span style="color:var(--text-muted);font-size:0.75rem;">${escapeHtml(cleanAddress)}</span></div>
      </div>
      <div style="background:var(--bg-secondary); padding:1rem; border-radius:var(--radius-sm);">
        <h4 style="color:var(--burgundy); margin-bottom:0.6rem; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em;">📋 Order Summary</h4>
        <div><strong>Order ID:</strong> <span style="font-family:monospace; color:var(--burgundy);">#${o.id}</span></div>
        <div><strong>Date:</strong> ${o.created_at ? new Date(o.created_at).toLocaleString('en-GB') : (o.date || '—')}</div>
        <div><strong>Payment:</strong> <span class="tag">${escapeHtml(paymentMethod)}</span></div>
        <div style="margin-top:0.4rem;"><strong>Status:</strong> ${getOrderStatusPill(o.status)}</div>
      </div>
    </div>

    <h4 style="color:var(--burgundy); margin-bottom:0.5rem; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em;">🛍️ Purchased Items</h4>
    <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.8rem 1rem; margin-bottom:1rem;">
      ${itemsHtml}
    </div>

    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:1.1rem; color:var(--burgundy); border-top:1px solid var(--border-color); padding-top:0.8rem;">
      <span>Grand Total:</span>
      <span>${(parseFloat(o.total_price || o.total) || 0).toLocaleString()} EGP</span>
    </div>

    ${proofHtml}
  `;

  openModal('order-details-modal');
};

// ── Clear All Orders ──
document.getElementById('clear-orders-btn').addEventListener('click', async () => {
  if (confirm('⚠️ WARNING: Are you sure you want to delete ALL customer orders? This action CANNOT be undone!')) {
    const btn = document.getElementById('clear-orders-btn');
    btn.textContent = 'Clearing...';
    btn.disabled = true;

    try {
      await supabase.from('order_items').delete().neq('id', 0);
      const { error } = await supabase.from('orders').delete().neq('id', '0');
      if (error) throw error;

      toast('All customer orders cleared.', 'success');
      await renderOrders();
      await renderOverview();
    } catch (err) {
      toast('Failed to clear orders: ' + err.message, 'error');
    } finally {
      btn.textContent = 'Clear All Orders';
      btn.disabled = false;
    }
  }
});

/* ══════════════════════════════════════════
   6. INITIALIZATION
══════════════════════════════════════════ */

function initDashboard() {
  renderOverview();
  if (window.lucide) lucide.createIcons();
}
