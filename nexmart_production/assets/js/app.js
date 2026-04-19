// ============================================
// NexMart - Main Application JavaScript
// ============================================

const API = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '') + '/api'; // Dynamic absolute path for production

// ============================================
// STATE MANAGEMENT
// ============================================
const State = {
  user:       JSON.parse(localStorage.getItem('nm_user') || 'null'),
  token:      localStorage.getItem('nm_token') || null,
  cartCount:  parseInt(localStorage.getItem('nm_cart_count') || '0'),
  currentFilter: 'all',
  currentSort:   'views',
  searchTimeout: null,
  currentProduct: null,
};

function saveUser(user, token) {
  State.user  = user;
  State.token = token;
  localStorage.setItem('nm_user',  JSON.stringify(user));
  localStorage.setItem('nm_token', token);
  updateNavUser();
}

function clearUser() {
  State.user  = null;
  State.token = null;
  localStorage.removeItem('nm_user');
  localStorage.removeItem('nm_token');
  localStorage.removeItem('nm_cart_count');
  State.cartCount = 0;
  updateNavUser();
  updateCartBadge();
}

// ============================================
// API HELPER
// ============================================
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (State.token) {
      headers['Authorization'] = 'Bearer ' + State.token;
      headers['X-Auth-Token'] = State.token; // Fallback for free hosting that strips Authorization
  }

  try {
    const res = await fetch(endpoint, { ...options, headers });
    const text = await res.text();
    
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      // InfinityFree and other free hosts often inject tracking scripts or HTML into the API response.
      // Extract the JSON object from the text to prevent SyntaxError.
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(text.substring(start, end + 1));
      }
      throw new Error('Invalid response format from server');
    }
  } catch (err) {
    console.error('API Fetch Error:', err);
    return { success: false, message: 'A network or server error occurred. Please try again.' };
  }
}

// ============================================
// NAVIGATION
// ============================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navLink = document.querySelector(`[data-page="${id}"]`);
  if (navLink) navLink.classList.add('active');

  // Load page data
  if (id === 'shop')            loadProducts();

  if (id === 'cart')            loadCart();
  if (id === 'analytics')       loadAnalytics();
  if (id === 'orders')          loadOrders();
}

// ============================================
// USER / AUTH
// ============================================
function updateNavUser() {
  const btn = document.getElementById('userBtn');
  const av  = document.getElementById('navAvatar');
  const nm  = document.getElementById('navUserName');
  const logoutBtn = document.getElementById('logoutBtn');
  if (State.user) {
    av.innerHTML = `<img src="${State.user.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    nm.textContent = State.user.name.split(' ')[0];
    btn.onclick = () => showPage('orders');
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    av.innerHTML = '👤';
    nm.textContent = 'Sign In';
    btn.onclick = () => showPage('auth');
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function updateCartBadge() {
  document.getElementById('cartBadge').textContent = State.cartCount;
}

// ---- AUTH FORM ----
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('authTitle').textContent = mode === 'login' ? 'Welcome back' : 'Create account';
  document.getElementById('authSubtitle').textContent = mode === 'login'
    ? 'Sign in to your NexMart account'
    : 'Join NexMart — discover curated products';
  document.getElementById('authBtn').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authSwitchText').innerHTML = mode === 'login'
    ? 'New to NexMart? <span class="auth-switch-link" onclick="setAuthMode(\'register\')">Create account</span>'
    : 'Already have an account? <span class="auth-switch-link" onclick="setAuthMode(\'login\')">Sign in</span>';

  const nameField = document.getElementById('nameField');
  nameField.style.display = mode === 'register' ? 'block' : 'none';
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const pass  = document.getElementById('authPass').value;
  const name  = document.getElementById('authName').value.trim();
  const btn   = document.getElementById('authBtn');

  if (!email || !pass) { toast('Please fill in all fields', 'error'); return; }
  if (authMode === 'register' && !name) { toast('Please enter your name', 'error'); return; }

  btn.textContent = 'Please wait...';
  btn.disabled = true;

  const body = authMode === 'login' ? { email, password: pass } : { name, email, password: pass };
  const res  = await apiFetch(`${API}/auth.php?action=${authMode}`, {
    method: 'POST',
    body:   JSON.stringify(body)
  });

  btn.disabled = false;
  btn.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';

  if (res.success) {
    saveUser(res.data.user, res.data.token);
    toast(`Welcome, ${res.data.user.name}! 🎉`, 'success');
    showPage('shop');
  } else {
    toast(res.message || 'Authentication failed', 'error');
  }
}

function loginDemo(name, email) {
  document.getElementById('authEmail').value = email;
  document.getElementById('authPass').value  = 'demo123';
  if (authMode !== 'login') setAuthMode('login');
}

function signOut() {
  clearUser();
  toast('Signed out successfully', 'info');
  showPage('shop');
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><div class="loading-text">Loading products...</div></div>';

  const params = new URLSearchParams({
    action:   'list',
    category: State.currentFilter,
    sort:     State.currentSort,
    limit:    20,
  });
  const search = document.getElementById('searchInput')?.value.trim();
  if (search) params.set('search', search);

  const res = await apiFetch(`${API}/products.php?${params}`);

  if (!res.success) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div><div class="empty-text">${res.message}</div></div>`;
    return;
  }

  document.getElementById('productCount').textContent = `${res.data.total} products`;
  renderProductGrid(grid, res.data.products);
}

function renderProductGrid(container, products) {
  if (!products.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-title">No products found</div><div class="empty-text">Try a different search or filter</div></div>`;
    return;
  }

  container.innerHTML = products.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.05}s" onclick="openProduct(${p.id})">
      <div class="product-img">
        <img src="${p.emoji}" alt="" style="width:100%;height:100%;object-fit:cover;">
        ${p.badge ? `<div class="product-badge badge-${p.badge}">${p.badge}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-cat">${p.category_name || 'General'}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <div class="stars">${getStars(p.rating)}</div>
          <span class="rating-val">${parseFloat(p.rating).toFixed(1)}</span>
        </div>
        <div class="product-footer">
          <div>
            <div class="product-price">₹${parseFloat(p.price).toFixed(2)}</div>
            ${p.original_price ? `<div class="price-orig">₹${parseFloat(p.original_price).toFixed(2)}</div>` : ''}
          </div>
          <button class="add-btn" onclick="event.stopPropagation(); addToCart(${p.id}, '${escHtml(p.name)}')" title="Add to cart">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

function escHtml(str) { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ---- FILTER ----
function setFilter(slug, btn) {
  State.currentFilter = slug;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  loadProducts();
}

// ---- SORT ----
function setSort(val) {
  State.currentSort = val;
  loadProducts();
}

// ============================================
// SEARCH SUGGESTIONS
// ============================================
function handleSearch(val) {
  clearTimeout(State.searchTimeout);
  const dd = document.getElementById('searchDropdown');

  if (val.length < 2) { dd.classList.remove('open'); loadProducts(); return; }

  State.searchTimeout = setTimeout(async () => {
    const res = await apiFetch(`${API}/products.php?action=search_suggest&q=${encodeURIComponent(val)}`);
    if (!res.success || !res.data.suggestions.length) { dd.classList.remove('open'); loadProducts(); return; }

    const sugs = res.data.suggestions;
    const cats = res.data.categories || [];

    dd.innerHTML = (cats.length ? `<div class="search-dd-label">Categories</div>` + cats.map(c => `
      <div class="search-dd-item" onclick="selectCategory('${escHtml(c.name.toLowerCase())}')">
        <div class="sug-emoji"><img src="${c.icon}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>
        <div class="sug-name">${c.name}</div>
        <div class="ai-tag">Category</div>
      </div>
    `).join('') : '') +
    `<div class="search-dd-label">Products <span class="ai-tag">AI Search</span></div>` +
    sugs.map(s => `
      <div class="search-dd-item" onclick="openProduct(${s.id}); closeDropdown();">
        <div class="sug-emoji"><img src="${s.emoji}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>
        <div class="sug-name">${s.name}</div>
        <div class="sug-price">₹${parseFloat(s.price).toFixed(2)}</div>
      </div>
    `).join('');

    dd.classList.add('open');
    loadProducts(); // live-filter results
  }, 300);
}

function closeDropdown() { document.getElementById('searchDropdown').classList.remove('open'); }

function selectCategory(name) {
  const chip = document.querySelector(`.filter-chip[data-slug="${name}"]`);
  if (chip) { setFilter(name, chip); }
  closeDropdown();
}

// ============================================
// PRODUCT MODAL
// ============================================
async function openProduct(id) {
  const overlay = document.getElementById('productModal');
  overlay.classList.add('open');

  document.getElementById('modalBody').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  document.getElementById('modalImg').innerHTML = '⏳';

  const res = await apiFetch(`${API}/products.php?action=detail&id=${id}`);
  if (!res.success) { closeModal(); toast(res.message, 'error'); return; }

  const p = res.data.product;
  State.currentProduct = p;

  document.getElementById('modalImg').innerHTML = `<img src="${p.emoji}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-cat">${p.category_name || 'Product'}</div>
    <div class="modal-title">${p.name}</div>
    <div class="product-rating" style="margin-bottom:0.75rem">
      <div class="stars">${getStars(p.rating)}</div>
      <span class="rating-val">${parseFloat(p.rating).toFixed(1)} · ${p.views} views</span>
    </div>
    <div class="modal-price">
      ₹${parseFloat(p.price).toFixed(2)}
      ${p.original_price ? `<span style="font-size:1rem;color:var(--muted);text-decoration:line-through;margin-left:0.5rem;font-weight:400">₹${parseFloat(p.original_price).toFixed(2)}</span>` : ''}
    </div>
    <div class="modal-desc">${p.description}</div>
    ${p.tags ? `<div class="modal-tags">${p.tags.split(',').map(t=>`<span class="tag-chip">${t.trim()}</span>`).join('')}</div>` : ''}
    <div style="font-size:0.8rem;color:var(--muted);margin-bottom:1.5rem">
      ${p.stock > 0 ? `<span style="color:var(--teal)">✓ In Stock</span> · ${p.stock} units available` : '<span style="color:var(--danger)">Out of Stock</span>'}
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">← Back</button>
      <button class="btn-primary" onclick="addToCart(${p.id}, '${escHtml(p.name)}'); closeModal();" ${p.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
    </div>
  `;
}

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  State.currentProduct = null;
}

// ============================================
// CART
// ============================================
async function addToCart(productId, name) {
  if (!State.user) {
    toast('Please sign in to add items to cart', 'info');
    showPage('auth');
    return;
  }

  const res = await apiFetch(`${API}/cart.php?action=add`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: 1 })
  });

  if (res.success) {
    State.cartCount = res.data.cart_count;
    localStorage.setItem('nm_cart_count', State.cartCount);
    updateCartBadge();
    toast(`${name} added to cart 🛒`, 'success');
  } else {
    toast(res.message, 'error');
  }
}

async function loadCart() {
  if (!State.user) {
    document.getElementById('cartContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔐</div>
        <div class="empty-title">Sign in to view cart</div>
        <div class="empty-text">Your cart awaits</div>
        <button class="btn-primary" style="width:auto;margin-top:1.5rem;padding:0.7rem 2rem" onclick="showPage('auth')">Sign In</button>
      </div>`;
    document.getElementById('cartSummaryPanel').innerHTML = '';
    return;
  }

  document.getElementById('cartContent').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';

  const res = await apiFetch(`${API}/cart.php?action=get`);
  if (!res.success) { toast(res.message, 'error'); return; }

  const { items, subtotal, count } = res.data;
  State.cartCount = count;
  updateCartBadge();

  if (!items.length) {
    document.getElementById('cartContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">Your cart is empty</div>
        <div class="empty-text">Discover our curated collection</div>
        <button class="btn-primary" style="width:auto;margin-top:1.5rem;padding:0.7rem 2rem" onclick="showPage('shop')">Shop Now</button>
      </div>`;
    document.getElementById('cartSummaryPanel').innerHTML = '';
    return;
  }

  document.getElementById('cartContent').innerHTML = items.map(item => `
    <div class="cart-item" id="cart-item-${item.product_id}">
      <div class="ci-img"><img src="${item.emoji}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>
      <div style="flex:1">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">₹${parseFloat(item.price).toFixed(2)} each</div>
        ${item.badge ? `<div style="margin-top:4px"><span class="product-badge badge-${item.badge}" style="position:static">${item.badge}</span></div>` : ''}
      </div>
      <div class="ci-controls">
        <div class="qty-wrap">
          <button class="qty-btn" onclick="updateQty(${item.product_id}, ${item.quantity - 1})">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty(${item.product_id}, ${item.quantity + 1})">+</button>
        </div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:700;color:var(--gold2);min-width:60px;text-align:right">
          ₹${(parseFloat(item.price) * item.quantity).toFixed(2)}
        </div>
        <button class="rm-btn" onclick="removeFromCart(${item.product_id})">✕</button>
      </div>
    </div>
  `).join('');

  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax      = subtotal * 0.08;
  const total    = subtotal + shipping + tax;

  document.getElementById('cartSummaryPanel').innerHTML = `
    <div class="cart-summary-card">
      <div class="summary-title">Order Summary</div>
      <div class="summary-row"><span>Subtotal (${count} items)</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--teal)">FREE</span>' : '₹' + shipping.toFixed(2)}</span></div>
      <div class="summary-row"><span>Tax (8%)</span><span>₹${tax.toFixed(2)}</span></div>
      <div class="summary-total"><span>Total</span><span class="text-gold">₹${total.toFixed(2)}</span></div>

      <div class="checkout-form">
        <div class="field">
          <label>Shipping Address</label>
          <textarea id="shipAddress" rows="2" placeholder="123 Main St, City, State 12345"></textarea>
        </div>
        <div class="field">
          <label>Payment Method</label>
          <select id="payMethod">
            <option value="card">💳 Credit / Debit Card</option>
            <option value="upi">📱 UPI / Digital Wallet</option>
            <option value="cod">💵 Cash on Delivery</option>
          </select>
        </div>
        <button class="checkout-btn" onclick="placeOrder()">Place Order — ₹${total.toFixed(2)}</button>
        ${subtotal < 100 ? `<div style="font-size:0.78rem;color:var(--muted);text-align:center;margin-top:0.5rem">Add ₹${(100 - subtotal).toFixed(2)} more for free shipping</div>` : ''}
      </div>
    </div>`;
}

async function updateQty(productId, qty) {
  const res = await apiFetch(`${API}/cart.php?action=update`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: qty })
  });
  if (res.success) loadCart();
  else toast(res.message, 'error');
}

async function removeFromCart(productId) {
  const item = document.getElementById('cart-item-' + productId);
  if (item) { item.style.opacity = '0.4'; item.style.transform = 'translateX(20px)'; item.style.transition = '0.3s'; }

  const res = await apiFetch(`${API}/cart.php?action=remove`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId })
  });
  if (res.success) loadCart();
  else toast(res.message, 'error');
}

async function placeOrder() {
  const address = document.getElementById('shipAddress')?.value.trim();
  const payment = document.getElementById('payMethod')?.value;

  if (!address) { toast('Please enter your shipping address', 'error'); return; }

  const btn = document.querySelector('.checkout-btn');
  btn.textContent = 'Processing...';
  btn.disabled = true;

  const res = await apiFetch(`${API}/orders.php?action=checkout`, {
    method: 'POST',
    body: JSON.stringify({ address, payment_method: payment })
  });

  btn.disabled = false;

  if (res.success) {
    State.cartCount = 0;
    localStorage.setItem('nm_cart_count', 0);
    updateCartBadge();
    toast(`Order #${res.data.order_id} placed! Total: ₹${res.data.total} 🎉`, 'success');
    showPage('orders');
  } else {
    btn.textContent = 'Place Order';
    toast(res.message, 'error');
  }
}



// ============================================
// ANALYTICS
// ============================================
async function loadAnalytics() {
  const res = await apiFetch(`${API}/analytics.php`);
  if (!res.success) { toast('Failed to load analytics', 'error'); return; }

  const d = res.data;
  const m = d.metrics;

  document.getElementById('analyticsMetrics').innerHTML = [
    { icon: '📦', label: 'Total Orders',    value: m.total_orders,              sub: `${m.pending_orders} pending` },
    { icon: '💰', label: 'Total Revenue',   value: `₹${m.total_revenue.toFixed(0)}`, sub: `Avg ₹${m.avg_order}/order` },
    { icon: '👥', label: 'Registered Users', value: m.total_users,              sub: 'Active shoppers' },
    { icon: '🛍️', label: 'Products In Stock', value: m.total_products,          sub: 'Ready to ship' },
  ].map(card => `
    <div class="metric-card">
      <div class="metric-icon">${card.icon}</div>
      <div class="metric-label">${card.label}</div>
      <div class="metric-value">${card.value}</div>
      <div class="metric-sub">${card.sub}</div>
    </div>
  `).join('');

  // Most viewed products
  const maxViews = Math.max(...d.top_viewed.map(p => p.views), 1);
  document.getElementById('viewedChart').innerHTML = d.top_viewed.map(p => `
    <div class="bar-row">
      <div class="bar-emoji"><img src="${p.emoji}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>
      <div class="bar-label">${p.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.max(10, (p.views/maxViews)*100).toFixed(0)}%">${p.views}</div>
      </div>
      <div class="bar-count">${p.views}</div>
    </div>
  `).join('');

  // Categories
  const maxCatViews = Math.max(...d.top_categories.map(c => c.total_views || 0), 1);
  document.getElementById('catChart').innerHTML = d.top_categories.map(c => `
    <div class="bar-row">
      <div class="bar-emoji"><img src="${c.icon}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>
      <div class="bar-label">${c.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.max(6, ((c.total_views||0)/maxCatViews)*100).toFixed(0)}%;background:linear-gradient(90deg,rgba(123,110,246,0.5),rgba(123,110,246,0.85))">${c.product_count} items</div>
      </div>
      <div class="bar-count">${c.total_views || 0}</div>
    </div>
  `).join('');

  // Recent orders
  document.getElementById('recentOrdersList').innerHTML = d.recent_orders.length
    ? d.recent_orders.map(o => `
      <div class="order-card">
        <div>
          <div class="order-id">Order #${o.id}</div>
          <div style="font-weight:600;font-size:0.95rem">${o.user_name}</div>
          <div class="order-meta"><span>${new Date(o.created_at).toLocaleDateString()}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:1rem">
          <div class="order-total">₹${parseFloat(o.total).toFixed(2)}</div>
          <div class="status-badge status-${o.status}">${o.status}</div>
        </div>
      </div>
    `).join('')
    : '<div class="empty-state" style="padding:2rem"><div class="empty-icon" style="font-size:2rem">📋</div><div class="empty-text">No orders yet</div></div>';
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
  if (!State.user) {
    document.getElementById('ordersList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔐</div>
        <div class="empty-title">Sign in to view orders</div>
        <button class="btn-primary" style="width:auto;margin-top:1.5rem;padding:0.7rem 2rem" onclick="showPage('auth')">Sign In</button>
      </div>`;
    return;
  }

  document.getElementById('ordersList').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';

  const res = await apiFetch(`${API}/orders.php?action=list`);
  if (!res.success) { toast(res.message, 'error'); return; }

  const orders = res.data.orders;
  document.getElementById('ordersCount').textContent = `${orders.length} orders`;

  if (!orders.length) {
    document.getElementById('ordersList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">No orders yet</div>
        <div class="empty-text">Your order history will appear here</div>
        <button class="btn-primary" style="width:auto;margin-top:1.5rem;padding:0.7rem 2rem" onclick="showPage('shop')">Start Shopping</button>
      </div>`;
    return;
  }

  document.getElementById('ordersList').innerHTML = orders.map(o => `
    <div class="order-card">
      <div>
        <div class="order-id">Order #${o.id}</div>
        <div class="order-meta">
          <span>${o.item_count} item${o.item_count != 1 ? 's' : ''}</span>
          <span>${new Date(o.created_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
          <span>${o.payment_method.toUpperCase()}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem">
        <div class="order-total">₹${parseFloat(o.total).toFixed(2)}</div>
        <div class="status-badge status-${o.status}">${o.status}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const tc = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  tc.appendChild(el);

  requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavUser();
  updateCartBadge();
  showPage('shop');

  // Close modal on overlay click
  document.getElementById('productModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Close search dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) closeDropdown();
  });
});
