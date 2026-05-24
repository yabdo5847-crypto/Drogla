// Initialize EmailJS
emailjs.init("eZ7uWoJO76WgbZyo2");

document.addEventListener('DOMContentLoaded', async () => {
    const cart = JSON.parse(localStorage.getItem('drogla_cart')) || [];
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    document.getElementById('checkout-total').innerText = total.toFixed(2);

    // Load Shipping Rates
    const govSelect = document.getElementById('c-gov');
    let shippingRates = [];
    let currentShippingCost = 0;

    try {
        const { data, error } = await supabase.from('shipping_rates').select('*');
        if (error) throw error;

        shippingRates = data || [];
        govSelect.innerHTML = '<option value="" disabled selected>Select Governorate</option>';

        shippingRates.forEach(rate => {
            const opt = document.createElement('option');
            opt.value = rate.cost; // Store cost as value for easy calculation
            opt.dataset.gov = rate.governorate; // Store name
            opt.innerText = `${rate.governorate} (EGP ${rate.cost})`;
            govSelect.appendChild(opt);
        });

    } catch (err) {
        console.error('Failed to load shipping rates:', err);
        govSelect.innerHTML = '<option value="" disabled selected>Error loading regions</option>';
    }

    const updateTotals = () => {
        // Apply Free Shipping Rule
        let finalShippingCost = currentShippingCost;
        if (total >= 1000) {
            finalShippingCost = 0;
            // Optionally update the UI to show free shipping is active
            const shippingLabel = document.querySelector('#shipping-cost').parentElement;
            if (shippingLabel) {
                shippingLabel.innerHTML = '+ EGP <span id="shipping-cost">0.00</span> Shipping <span style="color:var(--burgundy); font-weight:600; font-size:0.7rem; margin-left:10px;">(FREE SHIPPING APPLIED!)</span>';
            }
        }

        const finalAmt = (total + finalShippingCost).toFixed(2);
        document.getElementById('shipping-cost').innerText = finalShippingCost.toFixed(2);
        document.getElementById('final-total').innerText = finalAmt;

        if (document.getElementById('payment-amount')) {
            document.getElementById('payment-amount').innerText = finalAmt;
        }
    };

    updateTotals(); // Init final total with 0 shipping

    govSelect.addEventListener('change', (e) => {
        currentShippingCost = parseFloat(e.target.value) || 0;
        updateTotals();
    });

    let paymentSettings = { vodafone_cash: '010XXXXXXXX', instapay: 'drogla@instapay' };

    try {
        const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (data) {
            if (data.vodafone_cash) paymentSettings.vodafone_cash = data.vodafone_cash;
            if (data.instapay) paymentSettings.instapay = data.instapay;
        }
    } catch (e) {
        console.error('Failed to load payment settings', e);
    }

    const paymentSelect = document.getElementById('c-payment');
    const paymentInstructions = document.getElementById('payment-instructions');
    const paymentText = document.getElementById('payment-text');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const transferProofSection = document.getElementById('transfer-proof-section');

    // Proof upload handlers
    const proofDropzone = document.getElementById('proof-dropzone');
    const proofFileInput = document.getElementById('proof-file-input');
    const proofPreview = document.getElementById('proof-preview');
    const proofImg = document.getElementById('proof-img');
    let proofFile = null;

    proofDropzone.addEventListener('click', () => proofFileInput.click());

    proofDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        proofDropzone.style.borderColor = 'var(--burgundy)';
        proofDropzone.style.background = 'rgba(92,26,26,0.05)';
    });

    proofDropzone.addEventListener('dragleave', () => {
        proofDropzone.style.borderColor = 'rgba(110,108,105,0.5)';
        proofDropzone.style.background = 'transparent';
    });

    proofDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        proofDropzone.style.borderColor = 'rgba(110,108,105,0.5)';
        proofDropzone.style.background = 'transparent';
        if (e.dataTransfer.files[0]) setProofFile(e.dataTransfer.files[0]);
    });

    proofFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) setProofFile(e.target.files[0]);
    });

    document.getElementById('proof-remove').addEventListener('click', () => {
        proofFile = null;
        proofPreview.style.display = 'none';
        proofImg.src = '';
        proofFileInput.value = '';
        document.getElementById('proof-text').innerText = 'Drop screenshot here or click to upload';
    });

    function setProofFile(file) {
        proofFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            proofImg.src = e.target.result;
            proofPreview.style.display = 'block';
            document.getElementById('proof-text').innerText = file.name;
        };
        reader.readAsDataURL(file);
    }

    paymentSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const finalAmt = document.getElementById('final-total').innerText;
        if (val === 'Cash on Delivery') {
            paymentInstructions.style.display = 'none';
            transferProofSection.style.display = 'none';
            placeOrderBtn.innerText = 'Place Order';
        } else if (val === 'Vodafone Cash') {
            paymentInstructions.style.display = 'block';
            transferProofSection.style.display = 'block';
            paymentText.innerHTML = `<strong>Vodafone Cash Details:</strong><br>Please transfer the total amount (EGP <span id="payment-amount">${finalAmt}</span>) to: <strong style="font-size:1.1rem; color:var(--burgundy);">${paymentSettings.vodafone_cash}</strong><br>Then upload your transfer screenshot below.`;
            placeOrderBtn.innerText = 'Confirm Order & Upload Proof';
        } else if (val === 'InstaPay') {
            paymentInstructions.style.display = 'block';
            transferProofSection.style.display = 'block';
            paymentText.innerHTML = `<strong>InstaPay Details:</strong><br>Please transfer the total amount (EGP <span id="payment-amount">${finalAmt}</span>) to: <strong style="font-size:1.1rem; color:var(--burgundy);">${paymentSettings.instapay}</strong><br>Then upload your transfer screenshot below.`;
            placeOrderBtn.innerText = 'Confirm Order & Upload Proof';
        }
    });

    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('place-order-btn');
        const msg = document.getElementById('checkout-msg');
        btn.disabled = true;
        btn.innerText = 'Processing Order...';
        msg.style.display = 'none';

        const name = document.getElementById('c-name').value;
        const email = document.getElementById('c-email').value;
        const phone = document.getElementById('c-phone').value;

        const selectedGovOption = govSelect.options[govSelect.selectedIndex];
        const govName = selectedGovOption.dataset.gov;
        const rawAddress = document.getElementById('c-address').value;

        let actualShippingCost = currentShippingCost;
        if (total >= 1000) actualShippingCost = 0;

        const senderPhone = document.getElementById('c-sender-phone')?.value || '';
        const paymentMethod = paymentSelect.value;
        const fullAddress = `${govName} - ${rawAddress} (Phone: ${phone}) [Payment: ${paymentMethod}${senderPhone ? ', From: ' + senderPhone : ''}]`;
        const finalTotal = total + actualShippingCost;

        try {
            // 1. Upload proof screenshot if provided
            let proofUrl = '';
            if (proofFile && (paymentMethod === 'Vodafone Cash' || paymentMethod === 'InstaPay')) {
                const fileExt = proofFile.name.split('.').pop();
                const fileName = `proof-${Date.now()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, proofFile);

                if (!uploadError) {
                    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                    proofUrl = publicData.publicUrl;
                }
            }

            // 2. Save order to Supabase
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_name: name,
                    email: email,
                    address: fullAddress + (proofUrl ? ` [Proof: ${proofUrl}]` : ''),
                    total_price: finalTotal
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 3. Save order items
            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                quantity: item.quantity,
                price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 4. Send Email via EmailJS
            let itemsString = cart.map(item => `${item.quantity}x ${item.name} (Size: ${item.size}${item.color ? ', Color: ' + item.color : ''}) - EGP ${item.price}`).join('\n');
            itemsString += `\n\nShipping (${govName}): EGP ${actualShippingCost} ${actualShippingCost === 0 && currentShippingCost > 0 ? '(FREE!)' : ''}`;
            itemsString += `\nGrand Total: EGP ${finalTotal}`;

            let paymentNote = `Payment Method: ${paymentMethod}`;
            if (senderPhone) paymentNote += `\nTransferred From: ${senderPhone}`;
            if (proofUrl) paymentNote += `\nTransfer Proof: ${proofUrl}`;

            const templateParams = {
                to_name: "DROGLA Admin",
                from_name: name,
                customer_email: email,
                address: `${govName} - ${rawAddress}`,
                order_total: finalTotal.toFixed(2),
                order_items: itemsString,
                order_id: orderData.id,
                payment_info: paymentNote
            };

            await emailjs.send(
                'service_hs4cccw',
                'template_fqgycdw',
                templateParams
            );

            // Success UI update
            document.querySelector('.checkout-form').innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; color: var(--burgundy); margin-bottom: 20px;">Order Confirmed!</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; line-height: 2;">Thank you ${name}. Your order has been placed successfully and will be processed soon.<br>Your Order ID is #${orderData.id}</p>
                    <a href="shop.html" class="submit-btn" style="display: inline-block; width: auto; margin-top: 30px; text-decoration: none;">Continue Shopping</a>
                </div>
            `;

            localStorage.removeItem('drogla_cart');
            if (window.updateCartBadge) window.updateCartBadge();

            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            msg.innerText = "Error processing order: " + (err.message || "Please check your network and try again.");
            msg.style.color = '#ff4444';
            msg.style.display = 'block';
            btn.disabled = false;
            btn.innerText = 'Place Order (Cash on Delivery)';
        }
    });
});
