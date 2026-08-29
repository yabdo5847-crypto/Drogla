/**
 * DROGLA — Google Apps Script
 * ═══════════════════════════════════════════════════════════
 * PURPOSE:
 *   1. Receive POST from the Drogla website popup form
 *   2. Append customer data to Google Sheet
 *   3. Send a discount code email to the customer
 *
 * HOW TO DEPLOY (follow exactly):
 *   1. Go to https://script.google.com  (sign in with Google)
 *   2. Click "New Project"
 *   3. Delete the placeholder code and paste THIS entire file
 *   4. Click the floppy-disk icon (Save). Name it "Drogla Popup"
 *   5. Click "Deploy" → "New deployment"
 *   6. Select type: "Web app"
 *   7. Description: "Drogla v1"
 *   8. Execute as: "Me"
 *   9. Who has access: "Anyone"   ← IMPORTANT
 *  10. Click "Deploy" → Authorize when prompted (allow all permissions)
 *  11. Copy the Web app URL — it looks like:
 *      https://script.google.com/macros/s/LONG_ID/exec
 *  12. Paste that URL in js/popup.js as the value of GAS_URL
 * ═══════════════════════════════════════════════════════════
 */

// ─── CONFIGURATION ────────────────────────────────────────────────
// Paste your Google Sheet URL (or just the Spreadsheet ID) below.
// The sheet will be created automatically if it doesn't exist.
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
// e.g. 'https://docs.google.com/spreadsheets/d/1aBcDeFgHi...' → just the ID part
// OR leave blank and the script will create a new spreadsheet automatically.

const SHEET_NAME = 'Leads';         // Tab name inside the sheet
const SENDER_NAME = 'DROGLA';       // Sender name on the email
// ──────────────────────────────────────────────────────────────────

// ── Main entry point — handles POST from website ──────────────────
function doPost(e) {
  try {
    const params = e.parameter;
    const email       = (params.email        || '').trim().toLowerCase();
    const phone       = (params.phone        || '').trim();
    const smsConsent  = (params.sms_consent  || 'no').trim();
    const code        = (params.discount_code|| 'DROGLA15').trim();
    const source      = (params.source       || 'popup').trim();
    const timestamp   = (params.timestamp    || new Date().toISOString()).trim();

    if (!email) {
      return jsonResponse({ status: 'error', message: 'No email provided' });
    }

    // 1. Store in Google Sheet
    appendToSheet(email, phone, smsConsent, code, source, timestamp);

    // 2. Send discount email
    sendDiscountEmail(email, code);

    return jsonResponse({ status: 'ok', message: 'Success' });
  } catch (err) {
    console.error('doPost error:', err);
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// Also allow GET (for testing via browser URL)
function doGet(e) {
  return ContentService
    .createTextOutput('Drogla popup script is running ✓')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── Append one row to the Google Sheet ───────────────────────────
function appendToSheet(email, phone, smsConsent, code, source, timestamp) {
  let ss;

  if (SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE') {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    // Auto-create a sheet if none configured
    const files = DriveApp.getFilesByName('Drogla Leads');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('Drogla Leads');
      Logger.log('Created new spreadsheet: ' + ss.getUrl());
    }
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add header row
    sheet.appendRow([
      'Timestamp', 'Email', 'Phone', 'SMS Consent', 'Discount Code', 'Source'
    ]);
    // Style the header
    const header = sheet.getRange(1, 1, 1, 6);
    header.setFontWeight('bold');
    header.setBackground('#111010');
    header.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // Check for duplicate email (skip duplicate insert)
  const emails = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  const isDuplicate = emails.some(row => row[0] && row[0].toString().toLowerCase() === email);

  if (!isDuplicate) {
    sheet.appendRow([timestamp, email, phone, smsConsent, code, source]);
  }
  // Even if duplicate, we still re-send the email (they might have missed it)
}

// ── Send discount code email ───────────────────────────────────────
function sendDiscountEmail(email, code) {
  const subject = `Your 15% off code from DROGLA 🖤`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Drogla Discount Code</title>
</head>
<body style="margin:0;padding:0;background:#f5f3f0;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="max-width:560px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111010;padding:32px 40px;text-align:center;">
              <h1 style="color:#f5f3f0;font-size:28px;font-weight:800;letter-spacing:0.12em;margin:0;">
                DROGLA
              </h1>
              <p style="color:#b0aeab;font-size:11px;letter-spacing:0.18em;margin:6px 0 0;text-transform:uppercase;">
                Digital Grit Streetwear
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="color:#111010;font-size:22px;font-weight:700;margin:0 0 12px;">
                Your 15% off is ready 🖤
              </h2>
              <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Thanks for joining the DROGLA family. Use the code below at checkout
                to get <strong>15% off</strong> your entire first order.
              </p>

              <!-- Discount Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f5f3f0;border:2px dashed #111010;border-radius:4px;padding:22px 16px;">
                    <p style="color:#6e6c69;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 8px;">
                      Your discount code
                    </p>
                    <p style="color:#111010;font-size:28px;font-weight:900;letter-spacing:0.22em;margin:0;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#888;font-size:12px;margin:14px 0 28px;text-align:center;">
                Valid on your first order. No minimum spend required.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://drogla.com/shop.html"
                       style="display:inline-block;background:#111010;color:#f5f3f0;font-size:13px;
                              font-weight:700;letter-spacing:0.14em;text-transform:uppercase;
                              text-decoration:none;padding:16px 40px;border-radius:2px;">
                      Shop Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Perks strip -->
          <tr>
            <td style="background:#f5f3f0;padding:20px 40px;border-top:1px solid #ede9e4;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;padding:0 8px;">
                    <p style="color:#111010;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 2px;">Free Shipping</p>
                    <p style="color:#888;font-size:10px;margin:0;">Over 1500 EGP</p>
                  </td>
                  <td style="text-align:center;padding:0 8px;border-left:1px solid #ddd;border-right:1px solid #ddd;">
                    <p style="color:#111010;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 2px;">14-Day Returns</p>
                    <p style="color:#888;font-size:10px;margin:0;">No questions asked</p>
                  </td>
                  <td style="text-align:center;padding:0 8px;">
                    <p style="color:#111010;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 2px;">260 GSM Cotton</p>
                    <p style="color:#888;font-size:10px;margin:0;">Premium heavyweight</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;text-align:center;border-top:1px solid #ede9e4;">
              <p style="color:#aaa;font-size:11px;line-height:1.6;margin:0;">
                © 2026 DROGLA. All rights reserved.<br>
                You're receiving this because you signed up on drogla.com.<br>
                <a href="https://drogla.com" style="color:#111010;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const plainText = `
DROGLA — Your 15% Off Code

Thanks for joining! Use this code at checkout:

  ${code}

Shop now: https://drogla.com/shop.html

---
© 2026 DROGLA. drogla.com
`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: plainText,
    htmlBody: htmlBody,
    name: SENDER_NAME
  });
}

// ── Helper: return JSON response ──────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
