// Handles Cart Badge and shared utilities
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('drogla_cart')) || [];
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    // Update desktop nav badge
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = count;
    // Update mobile drawer badge
    const mobileBadge = document.getElementById('cart-count-mobile');
    if (mobileBadge) mobileBadge.innerText = count;
    // Update floating FAB badge
    const fabBadge = document.getElementById('cart-fab-count');
    if (fabBadge) {
        fabBadge.innerText = count;
        // Pulse animation
        fabBadge.classList.remove('pulse');
        void fabBadge.offsetWidth; // reflow trick
        if (count > 0) fabBadge.classList.add('pulse');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    
    if (themeBtn) {
        // Set initial icon
        if (document.body.classList.contains('dark-mode')) {
            themeBtn.innerHTML = sunSVG;
        } else {
            themeBtn.innerHTML = moonSVG;
        }
        
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('drogla_theme', isDark ? 'dark' : 'light');
            themeBtn.innerHTML = isDark ? sunSVG : moonSVG;
        });
    }
});
