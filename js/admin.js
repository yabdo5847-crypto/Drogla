document.addEventListener('DOMContentLoaded', async () => {
    // Layout Elements
    const loginPanel = document.getElementById('login-panel');
    const adminPanel = document.getElementById('admin-panel');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Sidebar & Navigation Elements
    const sidebar = document.getElementById('adminSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const tabTitle = document.getElementById('tabTitle');
    const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Search wraps
    const catalogSearchWrap = document.getElementById('catalogSearchWrap');
    const ordersSearchWrap = document.getElementById('ordersSearchWrap');
    
    // State management
    let currentTab = 'dashboard';
    let productsData = [];
    let ordersData = [];
    let shippingRatesData = [];
    
    // Chart instances
    let salesChartInstance = null;
    let categoryChartInstance = null;

    // ==================== AUTHENTICATION & INITIALIZATION ====================
    
    // Attach login submit handler immediately
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const btn = e.target.querySelector('button');
        const loginError = document.getElementById('login-error');
        
        btn.innerText = 'Authenticating...';
        btn.disabled = true;
        loginError.innerText = '';
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            btn.innerText = 'Authenticate';
            btn.disabled = false;

            if (error) {
                loginError.innerText = error.message;
            } else {
                showDashboard();
            }
        } catch (err) {
            btn.innerText = 'Authenticate';
            btn.disabled = false;
            loginError.innerText = 'System Error: ' + err.message;
        }
    });

    // Check existing session on load
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
            showDashboard();
        } else {
            loginPanel.style.display = 'flex';
        }
    } catch (err) {
        console.error("Session check failed", err);
        loginPanel.style.display = 'flex';
        document.getElementById('login-error').innerText = "Init Error: " + err.message;
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.reload();
        });
    }

    function showDashboard() {
        loginPanel.style.display = 'none';
        adminPanel.style.display = 'flex';
        
        // Load User Info
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                document.getElementById('profileEmail').innerText = user.email.split('@')[0];
                document.getElementById('avatarName').innerText = user.email[0].toUpperCase();
            }
        });

        // Initialize default tab layout
        switchTab('dashboard');
        
        // Load datasets from Supabase
        refreshConsoleData();
    }
    
    // Refresh all data
    async function refreshConsoleData() {
        await Promise.all([
            loadProducts(),
            loadOrders(),
            loadShippingRates(),
            loadSettings()
        ]);
        
        // Re-calculate dashboard metrics
        calculateMetrics();
    }

    // ==================== WORKSPACE NAVIGATION ====================
    
    // Switch tabs handler
    function switchTab(tabName) {
        currentTab = tabName;
        
        // Update menu active class
        sidebarMenuItems.forEach(li => {
            if (li.dataset.tab === tabName) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
        
        // Update active content block
        tabContents.forEach(content => {
            if (content.id === `tab-${tabName}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Header details
        const formattedTitles = {
            'dashboard': 'Operations Overview',
            'catalog': 'Catalog Inventory',
            'orders': 'Customer Transactions',
            'shipping': 'Shipping Tariffs',
            'settings': 'Payment Configurations'
        };
        
        tabTitle.innerText = formattedTitles[tabName] || 'Operations Console';
        
        // Show/hide specific search inputs on header
        catalogSearchWrap.style.display = (tabName === 'catalog') ? 'block' : 'none';
        ordersSearchWrap.style.display = (tabName === 'orders') ? 'block' : 'none';
        
        // Close sidebar drawer if open on mobile
        sidebar.classList.remove('open');
    }
    
    // Bind tab clicks
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.dataset.tab);
        });
    });
    
    // Mobile toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
    
    // Close sidebar clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // ==================== DASHBOARD & VISUALIZATION ====================
    
    function calculateMetrics() {
        const totalProducts = productsData.length;
        const totalOrders = ordersData.length;
        
        // Total Sales / Revenue
        const revenue = ordersData.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0);
        
        // Average Order Value
        const aov = totalOrders > 0 ? (revenue / totalOrders) : 0;
        
        // Update values dynamically
        document.getElementById('kpi-revenue').innerText = `EGP ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('kpi-orders').innerText = totalOrders;
        document.getElementById('kpi-aov').innerText = `EGP ${aov.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('kpi-products').innerText = totalProducts;
        
        // Initialize dynamic charts
        initializeDashboardCharts();
    }
    
    window.initializeDashboardCharts = function() {
        // Destroy existing instances if they exist
        if (salesChartInstance) salesChartInstance.destroy();
        if (categoryChartInstance) categoryChartInstance.destroy();
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Visual theme variables
        const chartTextColor = isDarkMode ? '#b0aeab' : '#6e6c69';
        const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
        const chartBurgundy = isDarkMode ? '#a03030' : '#5c1a1a';
        
        // 1. Sales Flow over Time (Line Chart)
        const salesByDate = {};
        ordersData.forEach(order => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            salesByDate[dateStr] = (salesByDate[dateStr] || 0) + parseFloat(order.total_price || 0);
        });
        
        // Sort dates chronologically
        const datesKeys = Object.keys(salesByDate).reverse().slice(-10); // Last 10 days
        const salesSums = datesKeys.map(date => salesByDate[date]);
        
        const ctxSales = document.getElementById('salesFlowChart')?.getContext('2d');
        if (ctxSales) {
            salesChartInstance = new Chart(ctxSales, {
                type: 'line',
                data: {
                    labels: datesKeys.length > 0 ? datesKeys : ['No Sales'],
                    datasets: [{
                        label: 'Revenue',
                        data: salesSums.length > 0 ? salesSums : [0],
                        borderColor: chartBurgundy,
                        backgroundColor: 'rgba(92, 26, 26, 0.05)',
                        borderWidth: 2,
                        tension: 0.35,
                        fill: true,
                        pointBackgroundColor: chartBurgundy,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: chartTextColor, font: { family: 'Montserrat', size: 9 } }
                        },
                        y: {
                            grid: { color: chartGridColor },
                            ticks: { color: chartTextColor, font: { family: 'Montserrat', size: 9 } }
                        }
                    }
                }
            });
        }
        
        // 2. Department Breakdown Chart (Donut Chart)
        let menCount = 0, womenCount = 0, unisexCount = 0;
        productsData.forEach(p => {
            const cat = (p.category || '').toLowerCase();
            if (cat.includes('men')) menCount++;
            else if (cat.includes('women')) womenCount++;
            else unisexCount++;
        });
        
        const ctxCategory = document.getElementById('categoryMatrixChart')?.getContext('2d');
        if (ctxCategory) {
            categoryChartInstance = new Chart(ctxCategory, {
                type: 'doughnut',
                data: {
                    labels: ['Men', 'Women', 'Unisex'],
                    datasets: [{
                        data: [menCount, womenCount, unisexCount],
                        backgroundColor: [
                            chartBurgundy,
                            isDarkMode ? '#3d1010' : '#7a2525',
                            isDarkMode ? '#6e6c69' : '#b0aeab'
                        ],
                        borderWidth: isDarkMode ? 2 : 1,
                        borderColor: isDarkMode ? '#1a1717' : '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: chartTextColor,
                                font: { family: 'Montserrat', size: 9 },
                                padding: 15
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    };

    // ==================== DRAWER MANAGEMENT (PRODUCTS EDITOR) ====================
    
    const productDrawer = document.getElementById('productDrawer');
    const productDrawerOverlay = document.getElementById('productDrawerOverlay');
    const openAddDrawerBtn = document.getElementById('openAddDrawerBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const cancelDrawerBtn = document.getElementById('cancelDrawerBtn');
    const drawerTitle = document.getElementById('drawerTitle');
    const addProductForm = document.getElementById('add-product-form');
    
    function openDrawer(editMode = false) {
        productDrawerOverlay.classList.add('open');
        productDrawer.classList.add('open');
        
        if (!editMode) {
            drawerTitle.innerText = 'Publish New Product';
            document.getElementById('add-p-btn').innerText = 'Publish Product';
            addProductForm.reset();
            document.getElementById('p-id').value = '';
            document.getElementById('p-image').value = '';
            renderPreviews();
        } else {
            drawerTitle.innerText = 'Modify Product Details';
            document.getElementById('add-p-btn').innerText = 'Save Changes';
        }
    }
    
    function closeDrawer() {
        productDrawerOverlay.classList.remove('open');
        productDrawer.classList.remove('open');
        addProductForm.reset();
        document.getElementById('p-id').value = '';
        document.getElementById('p-image').value = '';
        renderPreviews();
    }
    
    if (openAddDrawerBtn) openAddDrawerBtn.addEventListener('click', () => openDrawer(false));
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (cancelDrawerBtn) cancelDrawerBtn.addEventListener('click', closeDrawer);
    if (productDrawerOverlay) productDrawerOverlay.addEventListener('click', closeDrawer);

    // ==================== CATALOG MANAGEMENT (TAB 2) ====================
    
    // Live Search inputs
    const catalogSearchInput = document.getElementById('catalogSearch');
    const filterGender = document.getElementById('catalogFilterGender');
    const filterType = document.getElementById('catalogFilterType');
    
    async function loadProducts() {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching products:", error);
            return;
        }
        productsData = data || [];
        renderProductsTable();
    }
    
    function renderProductsTable() {
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) return;
        
        // Retrieve values for filters
        const query = catalogSearchInput.value.toLowerCase().trim();
        const gender = filterGender.value;
        const type = filterType.value;
        
        // Filter rows dynamically
        const filteredProducts = productsData.filter(p => {
            const matchesQuery = p.name.toLowerCase().includes(query) || 
                                 (p.description || '').toLowerCase().includes(query) ||
                                 (p.category || '').toLowerCase().includes(query);
            
            let matchesGender = true;
            if (gender) {
                matchesGender = (p.category || '').toLowerCase().includes(gender.toLowerCase());
            }
            
            let matchesType = true;
            if (type) {
                matchesType = (p.category || '').toLowerCase().includes(type.toLowerCase());
            }
            
            return matchesQuery && matchesGender && matchesType;
        });
        
        tbody.innerHTML = '';
        if (filteredProducts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">No products fit filters</td></tr>`;
            return;
        }
        
        filteredProducts.forEach(p => {
            // First image thumbnail
            const imgArray = p.image ? p.image.split(',').map(img => img.trim()).filter(img => img !== '') : [];
            const firstImg = imgArray.length > 0 ? imgArray[0] : 'https://placehold.co/400x533?text=NO+IMAGE';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="prod-cell">
                        <img src="${firstImg}" alt="thumbnail" class="prod-thumbnail">
                        <div>
                            <strong style="display:block; font-size: 0.85rem;">${p.name}</strong>
                            <span style="font-size: 0.6rem; color: var(--text-muted); letter-spacing: 0.05em; text-transform: uppercase;">ID: #${p.id.toString().substring(0, 8)}</span>
                        </div>
                    </div>
                </td>
                <td style="font-size: 0.72rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${p.category || 'Unspecified'}</td>
                <td style="font-size: 0.7rem; letter-spacing: 0.05em;">${p.size || 'N/A'}</td>
                <td style="font-weight: 600; font-size: 0.82rem;">EGP ${parseFloat(p.price).toFixed(2)}</td>
                <td>
                    <div class="actions-cell" style="justify-content: flex-end;">
                        <button class="action-btn edit-product-btn" data-id="${p.id}" title="Edit Product">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteProduct(${p.id})" title="Delete Product">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            `;
            
            // Edit row binding
            tr.querySelector('.edit-product-btn').addEventListener('click', () => {
                bindProductToDrawer(p);
            });
            
            tbody.appendChild(tr);
        });
    }
    
    // Bind filters
    catalogSearchInput.addEventListener('input', renderProductsTable);
    filterGender.addEventListener('change', renderProductsTable);
    filterType.addEventListener('change', renderProductsTable);
    
    // Bind Product to drawer for Editing
    function bindProductToDrawer(p) {
        document.getElementById('p-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-image').value = p.image || '';
        document.getElementById('p-video').value = p.video_url || '';
        
        let catVal = p.category || '';
        let g = 'Men', t = 'T-Shirts';
        
        if (catVal.toLowerCase().includes('women')) g = 'Women';
        else if (catVal.toLowerCase().includes('unisex')) g = 'Unisex';
        
        if (catVal.toLowerCase().includes('bottom')) t = 'Bottoms';
        else if (catVal.toLowerCase().includes('tops')) t = 'Tops';
        
        document.getElementById('p-gender').value = g;
        document.getElementById('p-type').value = t;
        
        document.getElementById('p-size').value = p.size;
        document.getElementById('p-color').value = p.colors || '';
        document.getElementById('p-desc').value = p.description || '';
        
        renderPreviews();
        openDrawer(true);
    }
    
    // Product publish submit handler
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('add-p-btn');
        btn.disabled = true;
        btn.innerText = 'Saving changes...';
        
        const product = {
            name: document.getElementById('p-name').value,
            price: parseFloat(document.getElementById('p-price').value),
            image: document.getElementById('p-image').value,
            video_url: document.getElementById('p-video').value,
            category: document.getElementById('p-gender').value + ' ' + document.getElementById('p-type').value,
            size: document.getElementById('p-size').value,
            colors: document.getElementById('p-color').value,
            description: document.getElementById('p-desc').value
        };

        const editId = document.getElementById('p-id').value;
        let error;

        if (editId) {
            const res = await supabase.from('products').update(product).eq('id', editId);
            error = res.error;
        } else {
            const res = await supabase.from('products').insert([product]);
            error = res.error;
        }

        btn.disabled = false;
        btn.innerText = editId ? 'Save Changes' : 'Publish Product';

        if (error) {
            alert('Operation failed: ' + error.message);
        } else {
            closeDrawer();
            refreshConsoleData();
        }
    });

    window.deleteProduct = async function(id) {
        if (confirm('Are you sure you want to delete this product from the catalog? This action cannot be undone.')) {
            // First delete associated order_items to avoid foreign key constraint error
            await supabase.from('order_items').delete().eq('product_id', id);
            
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) alert(error.message);
            else refreshConsoleData();
        }
    }

    // ==================== IMAGE DROZONE LOGIC ====================
    
    const dropzone = document.getElementById('image-dropzone');
    const fileInput = document.getElementById('p-file-input');
    const imageInput = document.getElementById('p-image');
    const previewContainer = document.getElementById('image-preview-container');
    const dropzoneText = document.getElementById('dropzone-text');

    if (dropzone) dropzone.addEventListener('click', () => fileInput.click());

    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--burgundy)';
            dropzone.style.background = 'rgba(92,26,26,0.05)';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.background = 'transparent';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.background = 'transparent';
            if (e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFiles(e.target.files);
            }
        });
    }

    async function handleFiles(files) {
        dropzoneText.innerText = 'Uploading to Storage...';
        let currentUrls = imageInput.value ? imageInput.value.split(',').map(u=>u.trim()).filter(u=>u!=='') : [];
        
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);
                
            if (error) {
                alert('Upload failed: ' + error.message);
            } else {
                const { data: publicUrlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);
                    
                currentUrls.push(publicUrlData.publicUrl);
            }
        }
        
        imageInput.value = currentUrls.join(', ');
        renderPreviews();
        dropzoneText.innerText = 'Drop images here or click to browse';
        fileInput.value = ''; // Reset
    }

    function renderPreviews() {
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        let currentUrls = imageInput.value ? imageInput.value.split(',').map(u=>u.trim()).filter(u=>u!=='') : [];
        
        currentUrls.forEach((url, idx) => {
            const wrapper = document.createElement('div');
            wrapper.style = 'position: relative; width: 60px; height: 80px;';
            const img = document.createElement('img');
            img.src = url;
            img.style = 'width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);';
            const del = document.createElement('button');
            del.innerHTML = '×';
            del.style = 'position: absolute; top: -5px; right: -5px; background: #e53935; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; cursor: pointer; font-size: 11px; line-height: 16px; text-align: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
            del.onclick = (e) => {
                e.preventDefault();
                currentUrls.splice(idx, 1);
                imageInput.value = currentUrls.join(', ');
                renderPreviews();
            };
            wrapper.appendChild(img);
            wrapper.appendChild(del);
            previewContainer.appendChild(wrapper);
        });
    }

    // ==================== ORDERS AUDITING MANAGEMENT (TAB 3) ====================
    
    const ordersSearchInput = document.getElementById('ordersSearch');
    const filterPayment = document.getElementById('ordersFilterPayment');
    
    async function loadOrders() {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching orders:", error);
            return;
        }
        ordersData = data || [];
        renderOrdersTable();
    }
    
    function renderOrdersTable() {
        const tbody = document.getElementById('admin-orders-list');
        if (!tbody) return;
        
        const query = ordersSearchInput.value.toLowerCase().trim();
        const paymentFilter = filterPayment.value;
        
        const filteredOrders = ordersData.filter(o => {
            const matchesQuery = o.id.toLowerCase().includes(query) ||
                                 o.customer_name.toLowerCase().includes(query) ||
                                 o.email.toLowerCase().includes(query) ||
                                 (o.address || '').toLowerCase().includes(query);
                                 
            let matchesPayment = true;
            if (paymentFilter) {
                matchesPayment = (o.address || '').toLowerCase().includes(paymentFilter.toLowerCase());
            }
            
            return matchesQuery && matchesPayment;
        });
        
        tbody.innerHTML = '';
        if (filteredOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">No order matches criteria</td></tr>`;
            return;
        }
        
        filteredOrders.forEach(o => {
            // Address extraction
            const addressRaw = o.address || '';
            let paymentMethod = 'COD';
            let statusBadge = `<span class="badge badge-cod">Cash on Delivery</span>`;
            
            if (addressRaw.includes('Vodafone Cash')) {
                paymentMethod = 'Vodafone Cash';
                if (addressRaw.includes('[Proof:')) {
                    statusBadge = `<span class="badge badge-verify">Verify proof</span>`;
                } else {
                    statusBadge = `<span class="badge badge-paid" style="background:rgba(229,57,53,0.1); color:#e53935;">Unverified</span>`;
                }
            } else if (addressRaw.includes('InstaPay')) {
                paymentMethod = 'InstaPay';
                if (addressRaw.includes('[Proof:')) {
                    statusBadge = `<span class="badge badge-verify">Verify proof</span>`;
                } else {
                    statusBadge = `<span class="badge badge-paid" style="background:rgba(229,57,53,0.1); color:#e53935;">Unverified</span>`;
                }
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; font-size: 0.72rem; font-weight: 600;">#${o.id.toString().substring(0, 10)}...</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:0.2rem;">
                        <span style="font-weight:600; font-size: 0.8rem;">${o.customer_name}</span>
                        <span style="font-size:0.64rem; color:var(--text-muted);">${o.email}</span>
                    </div>
                </td>
                <td style="font-weight: 600;">EGP ${parseFloat(o.total_price).toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="actions-cell" style="justify-content: flex-end;">
                        <button class="action-btn view-order-btn" data-id="${o.id}" title="Inspect Receipt">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteOrder('${o.id}')" title="Remove Record">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            `;
            
            tr.querySelector('.view-order-btn').addEventListener('click', () => {
                openOrderReceiptModal(o);
            });
            
            tbody.appendChild(tr);
        });
    }
    
    // Bind search/filter triggers
    ordersSearchInput.addEventListener('input', renderOrdersTable);
    filterPayment.addEventListener('change', renderOrdersTable);

    window.deleteOrder = async function(id) {
        if (confirm('Are you sure you want to delete this order?')) {
            // First delete associated order_items to avoid foreign key constraint error
            await supabase.from('order_items').delete().eq('order_id', id);
            
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) alert(error.message);
            else refreshConsoleData();
        }
    }

    // ==================== RECEIPT MODAL LOGIC ====================
    
    const orderModalOverlay = document.getElementById('orderModalOverlay');
    const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
    
    // Zoom proof elements
    const zoomModalOverlay = document.getElementById('zoomModalOverlay');
    const closeZoomBtn = document.getElementById('closeZoomBtn');
    const zoomModalImg = document.getElementById('zoomModalImg');
    
    function closeOrderModal() {
        orderModalOverlay.classList.remove('open');
    }
    
    if (closeOrderModalBtn) closeOrderModalBtn.addEventListener('click', closeOrderModal);
    if (orderModalOverlay) {
        orderModalOverlay.addEventListener('click', (e) => {
            if (e.target === orderModalOverlay) closeOrderModal();
        });
    }
    
    if (closeZoomBtn) closeZoomBtn.addEventListener('click', () => zoomModalOverlay.classList.remove('open'));
    if (zoomModalOverlay) {
        zoomModalOverlay.addEventListener('click', (e) => {
            if (e.target === zoomModalOverlay) zoomModalOverlay.classList.remove('open');
        });
    }
    
    async function openOrderReceiptModal(order) {
        document.getElementById('orderModalTitle').innerText = `Auditing Receipt #${order.id.toString().substring(0, 10)}`;
        document.getElementById('orderCustomer').innerHTML = `<strong>Name:</strong> ${order.customer_name}<br><strong>Email:</strong> ${order.email}`;
        document.getElementById('orderTotal').innerText = `EGP ${parseFloat(order.total_price).toFixed(2)}`;
        
        // Extract address clean details
        const rawAddr = order.address || '';
        
        // Address parse helpers
        let parsedAddr = rawAddr;
        let proofUrl = '';
        
        // Proof check
        if (rawAddr.includes('[Proof:')) {
            const proofIndex = rawAddr.indexOf('[Proof:');
            parsedAddr = rawAddr.substring(0, proofIndex).trim();
            const rawUrl = rawAddr.substring(proofIndex + 7, rawAddr.indexOf(']', proofIndex)).trim();
            proofUrl = rawUrl;
        }
        
        document.getElementById('orderAddress').innerText = parsedAddr;
        
        const proofSection = document.getElementById('orderProofSection');
        const proofImg = document.getElementById('modalProofImg');
        
        if (proofUrl) {
            proofSection.style.display = 'block';
            proofImg.src = proofUrl;
            
            // Click to zoom triggers
            document.getElementById('proofVerificationArea').onclick = () => {
                zoomModalImg.src = proofUrl;
                zoomModalOverlay.classList.add('open');
            };
        } else {
            proofSection.style.display = 'none';
            proofImg.src = '';
        }
        
        orderModalOverlay.classList.add('open');
        
        // Dynamic fetch of order_items joined with products
        const breakdownDiv = document.getElementById('orderItemsBreakdown');
        breakdownDiv.innerHTML = `<div style="text-align:center; padding:1rem;" class="skeleton">Itemizing products details...</div>`;
        
        try {
            const { data: items, error } = await supabase
                .from('order_items')
                .select('*, products(name, image, size, colors)')
                .eq('order_id', order.id);
                
            if (error) throw error;
            
            breakdownDiv.innerHTML = '';
            if (!items || items.length === 0) {
                breakdownDiv.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">No linked order items found.</div>`;
                return;
            }
            
            items.forEach(item => {
                const prod = item.products || {};
                const nameStr = prod.name || `Unlisted Product (#${item.product_id})`;
                const imgStr = prod.image ? prod.image.split(',')[0].trim() : 'https://placehold.co/400x533?text=N/A';
                const sizeStr = prod.size || 'N/A';
                
                const itemRow = document.createElement('div');
                itemRow.className = 'receipt-item-row';
                itemRow.innerHTML = `
                    <div class="receipt-item-left">
                        <img src="${imgStr}" alt="product thumbnail" class="receipt-item-thumb">
                        <div class="receipt-item-info">
                            <span class="receipt-item-name">${nameStr}</span>
                            <span class="receipt-item-meta">Qty: ${item.quantity} | Size: ${sizeStr}</span>
                        </div>
                    </div>
                    <span class="receipt-item-right">EGP ${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                `;
                breakdownDiv.appendChild(itemRow);
            });
            
        } catch (err) {
            console.error("Order items load failure:", err);
            breakdownDiv.innerHTML = `<div style="font-size:0.75rem; color:#ff4444; text-align:center;">Failed to join order items details.</div>`;
        }
    }

    // ==================== SHIPPING RATES CONTROL (TAB 4) ====================
    
    async function loadShippingRates() {
        const { data, error } = await supabase.from('shipping_rates').select('*').order('governorate', { ascending: true });
        if (error) {
            console.error("Rates fetch error:", error);
            return;
        }
        shippingRatesData = data || [];
        renderShippingRates();
    }
    
    function renderShippingRates() {
        const tbody = document.getElementById('admin-shipping-list');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        if (shippingRatesData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No rates configured yet</td></tr>`;
            return;
        }
        
        shippingRatesData.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">${r.governorate}</td>
                <td style="font-weight: 500;">EGP ${parseFloat(r.cost).toFixed(2)}</td>
                <td>
                    <div class="actions-cell" style="justify-content: flex-end;">
                        <button class="action-btn btn-delete" onclick="deleteShippingRate(${r.id})" title="Delete rate">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    document.getElementById('shipping-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const gov = document.getElementById('s-gov').value;
        const cost = parseFloat(document.getElementById('s-cost').value);
        const btn = document.getElementById('s-add-btn');
        
        btn.disabled = true;
        btn.innerText = 'Deploying...';

        const { error } = await supabase.from('shipping_rates').insert([{
            governorate: gov,
            cost: cost
        }]);

        btn.disabled = false;
        btn.innerText = 'Deploy Rate';

        if (error) {
            alert('Error adding rate: ' + error.message);
        } else {
            document.getElementById('shipping-form').reset();
            loadShippingRates();
        }
    });

    window.deleteShippingRate = async function(id) {
        if (confirm('Delete this shipping rate?')) {
            const { error } = await supabase.from('shipping_rates').delete().eq('id', id);
            if (error) alert(error.message);
            else loadShippingRates();
        }
    }

    // ==================== STORE SETTINGS (TAB 5) ====================
    
    async function loadSettings() {
        try {
            const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (data) {
                document.getElementById('set-vodafone').value = data.vodafone_cash || '';
                document.getElementById('set-instapay').value = data.instapay || '';
            }
        } catch(e) {
            console.error('Settings not loaded', e);
        }
    }
    
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('set-save-btn');
        const msg = document.getElementById('settings-msg');
        
        btn.disabled = true;
        btn.innerText = 'Saving Store settings...';
        
        const updates = {
            vodafone_cash: document.getElementById('set-vodafone').value,
            instapay: document.getElementById('set-instapay').value
        };

        const { error } = await supabase.from('store_settings').update(updates).eq('id', 1);
        
        btn.disabled = false;
        btn.innerText = 'Save Store Settings';
        msg.style.display = 'block';
        
        if (error) {
            msg.style.color = '#e53935';
            msg.innerText = error.message;
        } else {
            msg.style.color = '#4CAF50';
            msg.innerText = 'Store configurations saved successfully!';
            setTimeout(() => msg.style.display = 'none', 3000);
        }
    });
});
