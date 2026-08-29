/* ============================================================
   popup.js — Drogla Welcome Discount Popup
   • Shows once every 7 days (localStorage gate)
   • Collects email + phone
   • Sends data to Google Apps Script → Google Sheets
   • Shows discount code on success
   ============================================================ */

(function () {
  'use strict';

  // ── CONFIG ───────────────────────────────────────────────────────────────
  const POPUP_KEY      = 'drogla_popup_seen';      // localStorage key
  const COOLDOWN_DAYS  = 7;                         // re-show after N days
  const DISCOUNT_CODE  = 'DROGLA15';               // code to give user
  const SHOW_DELAY_MS  = 2500;                      // delay before showing (ms)

  // ▶ REPLACE THIS with your deployed Google Apps Script URL (see setup guide)
  const GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
  // ─────────────────────────────────────────────────────────────────────────

  // ── Gate: only show if not seen recently ─────────────────────────────────
  function shouldShow() {
    const stored = localStorage.getItem(POPUP_KEY);
    if (!stored) return true;
    const lastSeen = parseInt(stored, 10);
    const diffDays = (Date.now() - lastSeen) / (1000 * 60 * 60 * 24);
    return diffDays >= COOLDOWN_DAYS;
  }

  function markSeen() {
    localStorage.setItem(POPUP_KEY, Date.now().toString());
  }

  // ── Build popup HTML ──────────────────────────────────────────────────────
  function createPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'dg-welcome-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dg-popup-title');

    overlay.innerHTML = `
      <div class="dg-popup-card" id="dg-popup-card">

        <!-- Close -->
        <button class="dg-popup-close" id="dg-popup-close" aria-label="Close offer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- State: FORM ────────────────────────── -->
        <div id="dg-popup-form-state">
          <div class="dg-popup-badge">LIMITED OFFER</div>
          <h2 class="dg-popup-title" id="dg-popup-title">
            WAIT! DON'T<br>MISS 15% OFF
          </h2>
          <p class="dg-popup-sub">
            <strong>15% OFF your first order</strong><br>
            Plus exclusive deals &amp; early access to new drops.
          </p>

          <form id="dg-popup-form" novalidate>
            <div class="dg-popup-field">
              <label for="dg-pop-email">Email</label>
              <input
                type="email"
                id="dg-pop-email"
                name="email"
                placeholder="Enter your email"
                autocomplete="email"
                required
              />
            </div>

            <div class="dg-popup-field">
              <label for="dg-pop-phone">Phone (optional)</label>
              <div class="dg-popup-phone-row">
                <span class="dg-popup-country-code">🇪🇬 +20</span>
                <input
                  type="tel"
                  id="dg-pop-phone"
                  name="phone"
                  placeholder="01XXXXXXXXX"
                  autocomplete="tel"
                />
              </div>
            </div>

            <div class="dg-popup-sms-row">
              <label class="dg-popup-checkbox-label">
                <input type="checkbox" id="dg-pop-sms" />
                <span class="dg-popup-checkbox-box"></span>
                <span>Receive offers via WhatsApp</span>
              </label>
            </div>

            <p id="dg-popup-error" class="dg-popup-error" aria-live="polite"></p>

            <button type="submit" class="dg-popup-cta" id="dg-popup-submit">
              Claim My 15% Off
            </button>
          </form>

          <p class="dg-popup-legal">
            By submitting, you agree to receive marketing messages from Drogla.
            Unsubscribe any time.
          </p>
        </div>

        <!-- State: SUCCESS ─────────────────────── -->
        <div id="dg-popup-success-state" style="display:none;">
          <div class="dg-popup-success-icon">✓</div>
          <h2 class="dg-popup-title" style="font-size:1.5rem;">It's on its way!</h2>
          <p class="dg-popup-sub">
            We sent your exclusive discount code to your email inbox.<br>
            <strong>Use it at checkout — valid on 2+ items.</strong>
          </p>
          <div style="background:#f5f3f0;border-radius:6px;padding:14px 18px;margin:18px 0;text-align:center;">
            <p style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6e6c69;margin:0 0 4px;">Check your inbox at</p>
            <p id="dg-popup-email-display" style="font-size:0.95rem;font-weight:700;color:#111010;margin:0;word-break:break-all;"></p>
          </div>
          <a href="/shop" class="dg-popup-cta" style="display:block;text-align:center;text-decoration:none;margin-top:0.5rem;">
            Shop Now →
          </a>
        </div>

      </div>`;

    return overlay;
  }

  // ── Submit: send to Google Apps Script ───────────────────────────────────
  async function submitForm(email, phone, smsConsent) {
    const btn = document.getElementById('dg-popup-submit');
    const errEl = document.getElementById('dg-popup-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const body = new URLSearchParams({
      email,
      phone: phone || '',
      sms_consent: smsConsent ? 'yes' : 'no',
      discount_code: DISCOUNT_CODE,
      source: 'popup',
      timestamp: new Date().toISOString()
    });

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      showSuccess(email);
    } catch (err) {
      console.warn('Popup fetch error:', err);
      showSuccess(email);
    }
  }

  // ── Show/hide states ──────────────────────────────────────────────────────
  function showSuccess(email) {
    document.getElementById('dg-popup-form-state').style.display = 'none';
    document.getElementById('dg-popup-success-state').style.display = 'block';
    // Show the email address the code was sent to
    const emailDisplay = document.getElementById('dg-popup-email-display');
    if (emailDisplay && email) emailDisplay.textContent = email;
    markSeen();
  }

  function closePopup() {
    const overlay = document.getElementById('dg-welcome-overlay');
    if (!overlay) return;
    overlay.classList.add('dg-popup--closing');
    setTimeout(() => overlay.remove(), 320);
    markSeen();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (!shouldShow()) return;

    const overlay = createPopup();
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('dg-popup--visible'));
    });

    // Close button
    document.getElementById('dg-popup-close').addEventListener('click', closePopup);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup();
    });

    // ESC key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', escHandler); }
    });

    // Form submit
    document.getElementById('dg-popup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('dg-pop-email').value.trim();
      const phone = document.getElementById('dg-pop-phone').value.trim();
      const sms   = document.getElementById('dg-pop-sms').checked;
      const errEl = document.getElementById('dg-popup-error');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Please enter a valid email address.';
        document.getElementById('dg-pop-email').focus();
        return;
      }

      await submitForm(email, phone, sms);
    });
  }

  // ── Trigger after delay ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, SHOW_DELAY_MS));
  } else {
    setTimeout(init, SHOW_DELAY_MS);
  }

})();
