let products = [];
let invoices = [];
let filteredInvoices = [];
let scannerStream = null;
let currentProductPage = 1;
let searchQuery = '';
const productsPerPage = 10;
let authorizedSections = {
    products: false,
    reports: false,
    stock: false
};

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadInvoices();
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    document.getElementById('invoiceForm').addEventListener('submit', createInvoice);
    document.getElementById('productSearch').addEventListener('input', event => {
        searchQuery = event.target.value;
        currentProductPage = 1;
        displayProducts();
        updatePagination();
    });
    showSection('home');
});

function requestAccess(section) {
    const passcode = prompt('Enter passcode to continue:');
    if (passcode === '01012026') {
        authorizedSections[section] = true;
        return true;
    }
    alert('Incorrect passcode. Access denied.');
    return false;
}

function showSection(section) {
    if ((section === 'products' || section === 'reports' || section === 'stock') && !authorizedSections[section]) {
        if (!requestAccess(section)) {
            return;
        }
    }
    document.getElementById('home-section').style.display = section === 'home' ? 'block' : 'none';
    document.getElementById('products-section').style.display = section === 'products' ? 'block' : 'none';
    document.getElementById('invoices-section').style.display = section === 'invoices' ? 'block' : 'none';
    document.getElementById('stock-section').style.display = section === 'stock' ? 'block' : 'none';
    document.getElementById('reports-section').style.display = section === 'reports' ? 'block' : 'none';
    if (section === 'stock') {
        updateStockList();
    }
}

function getFilteredProducts() {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(product => {
        const name = (product.name || '').toLowerCase();
        const displayedSku = (product.sku || `SKU-${product.id}`).toLowerCase();
        const id = String(product.id);
        return name.includes(query) || displayedSku.includes(query) || id.includes(query);
    });
}

function loadProducts() {
    fetch('/api/products')
        .then(response => response.json())
        .then(data => {
            products = data;
            if (currentProductPage < 1) currentProductPage = 1;
            const filteredProducts = getFilteredProducts();
            const maxPage = Math.ceil(filteredProducts.length / productsPerPage) || 1;
            if (currentProductPage > maxPage) currentProductPage = maxPage;
            displayProducts();
            updatePagination();
            updateProductSelects();
            updateStockList();
        });
}

function displayProducts() {
    const tbody = document.querySelector('#products-list tbody');
    tbody.innerHTML = '';
    const filteredProducts = getFilteredProducts();
    const startIndex = (currentProductPage - 1) * productsPerPage;
    const pageItems = filteredProducts.slice(startIndex, startIndex + productsPerPage);
    pageItems.forEach(product => {
        const createdDate = product.createdAt ? new Date(product.createdAt).toLocaleString() : 'N/A';
        const fallbackSku = product.sku || `SKU-${product.id}`;
        const barcodeValue = String(product.sku || fallbackSku);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.sku || fallbackSku}</td>
            <td>${product.name}</td>
            <td>₹${product.price.toFixed(2)}</td>
            <td>₹${product.costPrice.toFixed(2)}</td>
            <td>${product.quantity}</td>
            <td class="barcode-cell">
                <canvas id="barcode-canvas-${product.id}" style="border: 1px solid #ddd; border-radius: 4px; max-width: 160px; height: auto;"></canvas>
                <div class="barcode-name">${product.name} | ₹${product.price.toFixed(2)}</div>
            </td>
            <td>${createdDate}</td>
            <td>
                <button onclick="editProduct(${product.id})">Edit</button>
                <button onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
        
        // Generate barcode for this product
        setTimeout(() => {
            const canvas = document.getElementById(`barcode-canvas-${product.id}`);
            if (canvas) {
                JsBarcode(canvas, barcodeValue, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    margin: 0,
                    fontSize: 14
                });
            }
        }, 0);
    });
}

function updatePagination() {
    const pagination = document.getElementById('product-pagination');
    pagination.innerHTML = '';
    const filteredProducts = getFilteredProducts();
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentProductPage} of ${totalPages}`;
    pagination.appendChild(pageInfo);

    if (totalPages <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentProductPage === 1;
    prevButton.onclick = () => {
        if (currentProductPage > 1) {
            currentProductPage -= 1;
            displayProducts();
            updatePagination();
        }
    };
    pagination.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i += 1) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentProductPage) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => {
            currentProductPage = i;
            displayProducts();
            updatePagination();
        };
        pagination.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentProductPage === totalPages;
    nextButton.onclick = () => {
        if (currentProductPage < totalPages) {
            currentProductPage += 1;
            displayProducts();
            updatePagination();
        }
    };
    pagination.appendChild(nextButton);
}

function generateLabels() {
    const labelWindow = window.open('', '_blank', 'width=900,height=700');
    const labelCards = products.map(product => `
        <div class="label-card">
            <div class="label-text"><strong>${product.name}</strong></div>
            <div class="label-text">Price: ₹${product.price.toFixed(2)}</div>
            <div class="label-text">SKU: ${product.sku || `(auto-${product.id})`}</div>
            <canvas id="label-barcode-${product.id}" class="label-barcode"></canvas>
        </div>
    `).join('');
    labelWindow.document.write(`
        <html>
        <head>
            <title>Product Labels</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 1rem; background: #f4f4f4; }
                .labels-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 1rem; }
                .label-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 0.9rem; text-align: center; }
                .label-text { margin: 0.25rem 0; font-size: 0.95rem; }
                .label-barcode { margin-top: 0.5rem; width: 100%; }
                .print-note { margin-bottom: 1rem; color: #333; }
                button { margin: 0.75rem 0; padding: 0.55rem 1rem; font-size: 0.95rem; }
            </style>
        </head>
        <body>
            <p class="print-note">Print these labels on your label machine. Use browser print or Ctrl+P.</p>
            <button onclick="window.print()">Print Labels</button>
            <div class="labels-grid">${labelCards}</div>
        </body>
        </html>
    `);
    labelWindow.document.close();
    labelWindow.onload = () => {
        products.forEach(product => {
            const canvas = labelWindow.document.getElementById(`label-barcode-${product.id}`);
            if (canvas) {
                JsBarcode(canvas, product.sku ? String(product.sku) : String(product.id), {
                    format: 'CODE128',
                    width: 2,
                    height: 50,
                    displayValue: true,
                    margin: 0,
                    fontSize: 14
                });
            }
        });
    };
}

function showAddProductForm() {
    document.getElementById('form-title').textContent = 'Add Product';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productSku').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCostPrice').value = '';
    document.getElementById('productQuantity').value = '';
    document.getElementById('product-form').style.display = 'block';
}

function hideProductForm() {
    document.getElementById('product-form').style.display = 'none';
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        document.getElementById('form-title').textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productSku').value = product.sku || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCostPrice').value = product.costPrice;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('product-form').style.display = 'block';
    }
}

function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const product = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSku').value.trim() || null,
        price: parseFloat(document.getElementById('productPrice').value),
        costPrice: parseFloat(document.getElementById('productCostPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value)
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';
    fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    })
    .then(() => {
        hideProductForm();
        loadProducts();
    });
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        fetch(`/api/products/${id}`, { method: 'DELETE' })
        .then(() => loadProducts());
    }
}

function loadInvoices() {
    fetch('/api/invoices')
        .then(response => response.json())
        .then(data => {
            invoices = data;
            displayInvoices();
        });
}

function displayInvoices() {
    const tbody = document.querySelector('#invoices-list tbody');
    tbody.innerHTML = '';
    const invoicesToDisplay = filteredInvoices.length > 0 ? filteredInvoices : invoices;
    invoicesToDisplay.forEach(invoice => {
        const dateTime = new Date(invoice.date).toLocaleString();
        const itemsCount = invoice.items ? invoice.items.length : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${dateTime}</td>
            <td>₹${invoice.total.toFixed(2)}</td>
            <td>${itemsCount}</td>
            <td>
                <button onclick="toggleDetails(${invoice.id})">View Items</button>
                <button onclick="printInvoiceById(${invoice.id})">Print</button>
                <button onclick="deleteInvoice(${invoice.id})" style="background-color: #dc3545;">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
        
        const detailsRow = document.createElement('tr');
        detailsRow.className = `details-row details-${invoice.id}`;
        detailsRow.innerHTML = `
            <td colspan="5">
                <div class="details-content">
                    <h4>Order Items:</h4>
                    <ul>
                        ${(invoice.items || []).map(item => {
                            const product = products.find(p => p.id == item.productId);
                            const unitPrice = parseFloat(item.price || 0).toFixed(2);
                            const lineTotal = (item.quantity * parseFloat(unitPrice)).toFixed(2);
                            return `<li>${product?.name || 'Unknown'} - Qty: ${item.quantity} x ₹${unitPrice} = ₹${lineTotal}</li>`;
                        }).join('')}
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(detailsRow);
    });
}

function showCreateInvoiceForm() {
    document.getElementById('invoice-items').innerHTML = `
        <div class="item">
            <select class="product-select" required></select>
            <input type="number" class="quantity" min="1" required>
            <button type="button" onclick="removeItem(this)">Remove</button>
        </div>
    `;
    updateProductSelects();
    document.getElementById('invoice-form').style.display = 'block';
}

function hideInvoiceForm() {
    document.getElementById('invoice-form').style.display = 'none';
}

function showInvoiceScanner() {
    document.getElementById('qr-scanner').style.display = 'block';
    startScanner();
}

function hideScanner() {
    stopScanner();
    document.getElementById('qr-scanner').style.display = 'none';
}

function startScanner() {
    const video = document.getElementById('scanner-video');
    const status = document.getElementById('scanner-status');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            scannerStream = stream;
            video.srcObject = stream;
            video.play();
            status.textContent = 'Scanning for product QR code...';
            requestAnimationFrame(scanFrame);
        })
        .catch(() => {
            status.textContent = 'Unable to access camera. Please allow camera permission.';
        });
}

function stopScanner() {
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
}

function scanFrame() {
    const video = document.getElementById('scanner-video');
    const status = document.getElementById('scanner-status');
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (scannerStream) requestAnimationFrame(scanFrame);
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        const scannedValue = code.data;
        let product = null;
        const key = scannedValue.replace(/^product[:\-]?/i, '');
        if (/^\d+$/.test(key)) {
            const productId = parseInt(key, 10);
            product = products.find(p => p.id === productId);
        }
        if (!product) {
            product = products.find(p => p.qrCode === scannedValue || p.qrCode === key);
        }
        if (product) {
            status.textContent = `Scanned ${product.name}`;
            addScannedProduct(product.id);
            stopScanner();
            return;
        }
        status.textContent = 'QR code scanned, but product not found.';
    }

    if (scannerStream) requestAnimationFrame(scanFrame);
}

function addScannedProduct(productId) {
    if (document.getElementById('invoice-form').style.display === 'none') {
        showCreateInvoiceForm();
    }
    const itemsDiv = document.getElementById('invoice-items');
    const existing = Array.from(document.querySelectorAll('#invoice-items .item')).find(item => parseInt(item.querySelector('.product-select').value, 10) === productId);
    if (existing) {
        const quantityInput = existing.querySelector('.quantity');
        quantityInput.value = parseInt(quantityInput.value, 10) + 1;
        return;
    }

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';
    itemDiv.innerHTML = `
        <select class="product-select" required></select>
        <input type="number" class="quantity" min="1" required>
        <button type="button" onclick="removeItem(this)">Remove</button>
    `;
    itemsDiv.appendChild(itemDiv);
    updateProductSelects();
    itemDiv.querySelector('.product-select').value = productId;
    itemDiv.querySelector('.quantity').value = 1;
}

function updateProductSelects() {
    const selects = document.querySelectorAll('.product-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Product</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (₹${product.price.toFixed(2)}, Stock: ${product.quantity})`;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function updateStockList() {
    const tbody = document.querySelector('#stock-list tbody');
    if (!tbody) return;
    const sortedProducts = [...products].sort((a, b) => a.quantity - b.quantity);
    tbody.innerHTML = '';
    sortedProducts.forEach(product => {
        const row = document.createElement('tr');
        row.className = product.quantity < 2 ? 'low-stock-row' : '';
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>₹${product.costPrice.toFixed(2)}</td>
            <td>₹${product.price.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function sendStockReportEmail(type) {
    const lowStock = products.filter(p => p.quantity < 2);
    const allProducts = [...products].sort((a, b) => a.quantity - b.quantity);
    const title = type === 'monthly' ? 'Monthly Stock Report' : 'Weekly Stock Report';
    let body = `${title}%0D%0A%0D%0ALow stock products (qty < 2):%0D%0A`;
    if (lowStock.length === 0) {
        body += 'No low stock products.%0D%0A';
    } else {
        lowStock.forEach(p => {
            body += `- ${p.name}: ${p.quantity}%0D%0A`;
        });
    }
    body += '%0D%0AFull stock list:%0D%0A';
    allProducts.forEach(p => {
        body += `- ${p.name}: ${p.quantity}%0D%0A`;
    });
    const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${body}`;
    window.location.href = mailto;
}

function addItem() {
    const itemsDiv = document.getElementById('invoice-items');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';
    itemDiv.innerHTML = `
        <select class="product-select" required></select>
        <input type="number" class="quantity" min="1" required>
        <button type="button" onclick="removeItem(this)">Remove</button>
    `;
    itemsDiv.appendChild(itemDiv);
    updateProductSelects();
}

function removeItem(button) {
    button.parentElement.remove();
}

function generateProfitReport() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const type = document.getElementById('reportType').value;
    if (!fromDate || !toDate) {
        alert('Please select both From and To dates');
        return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
        alert('From date cannot be after To date');
        return;
    }
    fetch(`/api/invoices/profit?from=${fromDate}&to=${toDate}&type=${type}`)
        .then(response => response.json())
        .then(data => {
            const reportDiv = document.getElementById('profit-report');
            if (data.error) {
                reportDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
                return;
            }
            if (type === 'daily') {
                if (!Array.isArray(data)) {
                    reportDiv.innerHTML = `<p style="color: red;">Unexpected report response</p>`;
                    return;
                }
                let html = '<table><thead><tr><th>Date</th><th>Profit</th></tr></thead><tbody>';
                data.forEach(item => {
                    html += `<tr><td>${item.date}</td><td style="color: green;">₹${item.profit}</td></tr>`;
                });
                html += '</tbody></table>';
                reportDiv.innerHTML = html;
            } else {
                reportDiv.innerHTML = `<h4 style="color: green;">Total Profit: ₹${data.totalProfit}</h4>`;
            }
        })
        .catch(error => {
            document.getElementById('profit-report').innerHTML = `<p style="color: red;">Error generating report: ${error.message}</p>`;
        });
}

function setToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fromDate').value = today;
    document.getElementById('toDate').value = today;
    document.getElementById('reportType').value = 'total';
}

function setThisWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    document.getElementById('fromDate').value = startOfWeek.toISOString().split('T')[0];
    document.getElementById('toDate').value = endOfWeek.toISOString().split('T')[0];
    document.getElementById('reportType').value = 'daily';
}

function setThisMonth() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    document.getElementById('fromDate').value = startOfMonth.toISOString().split('T')[0];
    document.getElementById('toDate').value = endOfMonth.toISOString().split('T')[0];
    document.getElementById('reportType').value = 'daily';
}

function toggleDetails(invoiceId) {
    const detailsRow = document.querySelector(`.details-${invoiceId}`);
    if (detailsRow) {
        detailsRow.classList.toggle('show');
    }
}

function deleteInvoice(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        fetch(`/api/invoices/${invoiceId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (response.ok) {
                loadInvoices();
            } else {
                alert('Error deleting invoice');
            }
        })
        .catch(error => alert('Error: ' + error.message));
    }
}

function filterInvoicesByDate() {
    const fromDate = document.getElementById('invoiceFromDate').value;
    const toDate = document.getElementById('invoiceToDate').value;
    
    if (!fromDate || !toDate) {
        alert('Please select both From and To dates');
        return;
    }
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setDate(to.getDate() + 1);
    
    filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.date);
        return invoiceDate >= from && invoiceDate < to;
    });
    
    displayInvoices();
}

function resetInvoiceFilter() {
    document.getElementById('invoiceFromDate').value = '';
    document.getElementById('invoiceToDate').value = '';
    filteredInvoices = [];
    displayInvoices();
}

function printInvoiceById(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        printInvoice(invoice);
    } else {
        fetch(`/api/invoices/${invoiceId}`)
            .then(response => response.json())
            .then(inv => printInvoice(inv));
    }
}

function printInvoice(invoice) {
    const invoiceHtml = renderInvoicePrintHtml(invoice);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.document.title = '';
    printWindow.focus();
    printWindow.print();
}

function renderInvoicePrintHtml(invoice) {
    const lines = (invoice.items || []).map(item => {
        const product = products.find(p => p.id == item.productId);
        const unitPrice = parseFloat(item.discountedPrice || item.price || 0).toFixed(2);
        const lineTotal = (item.quantity * parseFloat(unitPrice)).toFixed(2);
        return `<tr><td>${product?.name || 'Unknown'}</td><td>${item.quantity}</td><td>₹${unitPrice}</td><td>₹${lineTotal}</td></tr>`;
    }).join('');
    return `
        <html>
        <head>
            <title></title>
            <style>
                @page { size: auto; margin: 8mm; }
                body { font-family: Arial, sans-serif; padding: 0.5rem; margin: 0; }
                .header { margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: flex-start; }
                .header-left { text-align: left; max-width: 60%; }
                .header-right { text-align: right; min-width: 30%; }
                .header img { max-width: 150px; margin-bottom: 0.5rem; }
                .header p { margin: 0.25rem 0; }
                .invoice-info { margin-top: 1rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
                th { background: #f0f0f0; }
                tfoot td { font-weight: bold; }
                .signature { margin-top: 3rem; display: block; }
                .signature-block { float: right; width: 220px; text-align: center; border-top: 1px solid #000; padding-top: 0.15rem; }
                .signature-text { font-family: 'Dancing Script', 'Brush Script MT', cursive, sans-serif; font-size: 1.4rem; margin: 0; display: inline-block; background: #fff; position: relative; top: -0.9rem; padding: 0 0.35rem; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <img src="logo.jpeg" alt="Logo" style="max-width: 150px;">
                    <p>West car street, Near NVC School, Radhapuram</p>
                    <p>Contact: +918754745949</p>
                    <p><strong>Customer:</strong> ${invoice.customerName}</p>
                </div>
                <div class="header-right">
                    <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>
                </div>
            </div>
            <table>
                <thead>
                    <tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr>
                </thead>
                <tbody>
                    ${lines}
                </tbody>
                <tfoot>
                    <tr><td colspan="3"><strong>Total</strong></td><td><strong>₹${invoice.total.toFixed(2)}</strong></td></tr>
                </tfoot>
            </table>
            <div class="signature">
                <div class="signature-block">
                    <p class="signature-text">AK Fancy</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function showProductQr(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    let qrValue = product.qrCode;
    if (!qrValue) {
        qrValue = crypto.randomUUID ? crypto.randomUUID() : `product-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    const qrWindow = window.open('', '_blank', 'width=360,height=420');
    qrWindow.document.write(`
        <html>
        <head><title>Product QR - ${product.name}</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 1rem;">
            <h1>${product.name}</h1>
            <div id="qrcode"></div>
            <p>Scan this QR to add the product to a bill.</p>
        </body>
        </html>
    `);
    qrWindow.document.close();
    const qrContainer = qrWindow.document.getElementById('qrcode');
    QRCode.toCanvas(qrContainer, qrValue, { width: 256 }, function (error) {
        if (error) console.error(error);
    });

    if (!product.qrCode) {
        fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode: qrValue })
        })
        .then(response => response.json())
        .then(updated => {
            const index = products.findIndex(p => p.id === updated.id);
            if (index > -1) products[index] = updated;
        });
    }
}

function createInvoice(e) {
    e.preventDefault();
    const items = Array.from(document.querySelectorAll('#invoice-items .item')).map(item => ({
        productId: parseInt(item.querySelector('.product-select').value),
        quantity: parseInt(item.querySelector('.quantity').value)
    }));
    fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Error creating invoice');
    })
    .then(invoice => {
        hideInvoiceForm();
        loadProducts();
        loadInvoices();
        printInvoice(invoice);
    })
    .catch(error => {
        alert(error.message);
    });
}

