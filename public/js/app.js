/**
 * MESS MANAGEMENT SYSTEM - FRONTEND APPLICATION LOGIC
 * Features: Student Pre-Order + Live Tracker + Dedicated Feedback + Kitchen Staff Dashboard + Secure Admin Portal
 */

// Global Application State
const state = {
  currentView: 'student',
  currentRole: 'student', // 'student' | 'staff' | 'admin'
  isAdminLoggedIn: sessionStorage.getItem('mess_admin_logged_in') === 'true',
  currentCategory: 'All',
  searchQuery: '',
  menuItems: [],
  cart: [], // [{ id, name, price, quantity, maxStock, image }]
  trackingToken: null,
  staffOrders: [],
  staffFilter: 'All',
  selectedRating: 5,
  availableSlots: [],
  pollingTimer: null,
  lastAnnouncedStatus: null
};

// Food icon mapping helper
const foodIcons = {
  dosa: '🥞',
  vadapav: '🍔',
  samosa: '🥟',
  sandwich: '🥪',
  thali: '🍛',
  biryani: '🍚',
  chole: '🥘',
  maggi: '🍜',
  coffee: '☕',
  tea: '🫖',
  lime: '🥤',
  dessert: '🍨',
  default: '🍽️'
};

function getFoodIcon(imageKey, category) {
  if (foodIcons[imageKey]) return foodIcons[imageKey];
  if (category === 'Breakfast') return '🥞';
  if (category === 'Beverages') return '☕';
  if (category === 'Meals') return '🍛';
  if (category === 'Desserts') return '🍨';
  return '🥪';
}

// Rich Nutritional & Spice Metadata for Canteen Specials
const dishMetadata = {
  'menu-1': { isVeg: true, spice: '🌶️ Mild', calories: 320, rating: '4.9 (142)' },
  'menu-2': { isVeg: true, spice: '🌶️ Medium', calories: 280, rating: '4.8 (210)' },
  'menu-3': { isVeg: true, spice: '🌶️ Medium', calories: 310, rating: '4.8 (185)' },
  'menu-4': { isVeg: true, spice: '🌶️ Mild', calories: 340, rating: '4.7 (96)' },
  'menu-5': { isVeg: true, spice: '🌶️ Medium', calories: 640, rating: '4.9 (175)' },
  'menu-6': { isVeg: true, spice: '🌶️ Spicy', calories: 560, rating: '4.9 (190)' },
  'menu-7': { isVeg: true, spice: '🌶️ Medium', calories: 490, rating: '4.8 (130)' },
  'menu-8': { isVeg: true, spice: '🌶️ Mild', calories: 260, rating: '4.7 (115)' },
  'menu-9': { isVeg: true, spice: 'Sweet', calories: 190, rating: '4.9 (240)' },
  'menu-10': { isVeg: true, spice: 'Spiced', calories: 95, rating: '4.9 (310)' },
  'menu-11': { isVeg: true, spice: 'Tangy', calories: 110, rating: '4.6 (75)' },
  'menu-12': { isVeg: true, spice: 'Sweet', calories: 230, rating: '4.8 (88)' },
  'default': { isVeg: true, spice: 'Fresh', calories: 280, rating: '4.8 (50)' }
};

// ==========================================================================
// SMART MEAL-OF-THE-MOMENT LOGIC (TIME-AWARE GREETING & FILTERS)
// ==========================================================================

function getMealMomentInfo(date = new Date()) {
  const hours = date.getHours();
  if (hours >= 6 && hours < 11) {
    return {
      category: 'Breakfast',
      title: '☀️ Good Morning! Fresh Breakfast Specials',
      desc: 'Crispy Masala Dosa, South Indian Idli & Piping Hot Filter Coffee ready at Counter 1.',
      icon: '🥞'
    };
  } else if (hours >= 11 && hours < 16) {
    return {
      category: 'Meals',
      title: '🍛 Lunch Hour Rush! Fresh Meals & Thali',
      desc: 'Special Paneer Butter Masala Thali, Veg Dum Biryani & Chole Bhature are freshly cooked.',
      icon: '🍛'
    };
  } else if (hours >= 16 && hours < 19) {
    return {
      category: 'Snacks',
      title: '☕ Evening Tea & Hot Canteen Snacks',
      desc: 'Mumbai Vada Pav, Crispy Samosas, Grilled Sandwiches & Special Masala Chai ready to serve.',
      icon: '🥪'
    };
  } else {
    return {
      category: 'All',
      title: '🌙 Dinner & Night Canteen Specials',
      desc: 'Pre-order your dinner meals, thali, hot noodles & cold coffee before counter closing.',
      icon: '🌙'
    };
  }
}

function updateMealMomentUI() {
  const now = new Date();
  const clockEl = document.getElementById('live-digital-clock');
  if (clockEl) {
    clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  const moment = getMealMomentInfo(now);
  const titleEl = document.getElementById('meal-greeting-text');
  const descEl = document.getElementById('meal-greeting-desc');

  if (titleEl && (!titleEl.dataset.customized || titleEl.dataset.customized === 'false')) {
    titleEl.innerText = moment.title;
    if (descEl) descEl.innerText = moment.desc;
  }
}

function initMealMomentClock() {
  updateMealMomentUI();
  setInterval(updateMealMomentUI, 1000);

  // Auto-highlight initial meal period based on current hour
  const moment = getMealMomentInfo();
  const targetMeal = moment.category === 'All' ? 'Meals' : moment.category;
  document.querySelectorAll('#meal-slots-pills-bar .meal-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-meal') === targetMeal);
  });
}

function applyMealMomentFilter(category) {
  const titleEl = document.getElementById('meal-greeting-text');
  const descEl = document.getElementById('meal-greeting-desc');
  
  if (titleEl) {
    titleEl.dataset.customized = 'true';
    if (category === 'Breakfast') {
      titleEl.innerText = '🥞 Breakfast Specials Menu';
      if (descEl) descEl.innerText = 'Serving crispy dosas, fresh idli sambar, and hot morning beverages.';
    } else if (category === 'Meals') {
      titleEl.innerText = '🍛 Lunch & Thali Specials Menu';
      if (descEl) descEl.innerText = 'Hearty lunch thalis, dum biryani, and freshly prepared hot meals.';
    } else if (category === 'Snacks') {
      titleEl.innerText = '🥪 Evening Snacks & Tea Menu';
      if (descEl) descEl.innerText = 'Crispy samosa pav, vada pav, sandwiches, and hot masala chai.';
    } else {
      titleEl.innerText = '🍽️ Full Campus Mess Menu';
      if (descEl) descEl.innerText = 'Browse all categories, snacks, breakfast, beverages, and desserts.';
    }
  }

  // Update meal pill buttons active state
  document.querySelectorAll('#meal-slots-pills-bar .meal-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-meal') === category);
  });

  filterByCategory(category);
}

// Helper to make authenticated/role-aware requests
function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  headers['x-user-role'] = state.isAdminLoggedIn ? 'admin' : state.currentRole;
  return fetch(url, { ...options, headers });
}

// ==========================================================================
// 1. INITIALIZATION & VIEW NAVIGATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Load saved cart from localStorage if present
  try {
    const savedCart = localStorage.getItem('smart_canteen_cart');
    if (savedCart) state.cart = JSON.parse(savedCart);
  } catch (e) {
    console.warn('Could not parse saved cart', e);
  }

  // Load last active tracking token
  const lastToken = localStorage.getItem('smart_canteen_last_token');
  if (lastToken) {
    state.trackingToken = lastToken;
  }

  // Initial loads
  loadMenu();
  loadSlots();
  updateCartUI();
  updateRecentTokensUI();
  updateRoleIndicator();
  
  // Start background live polling (every 4 seconds)
  startPolling();

  // Initialize Smart Meal of the Moment live clock and greeting
  initMealMomentClock();

  // Initialize Custom Dynamic Glow Cursor
  initCustomCursor();

  // Initialize Futuristic Voice Assistant Engine
  initVoiceAssistant();

  // Check URL query parameters for direct QR scan tracking (?track=YR-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const trackToken = urlParams.get('track');
  if (trackToken) {
    state.trackingToken = trackToken;
    switchView('tracking');
    lookupOrderByToken(trackToken);
    showToast(`Displaying scanned order token #${trackToken}`, 'info');
  }
});

function switchView(viewName) {
  state.currentView = viewName;

  // Set active role according to view
  if (viewName === 'staff') {
    state.currentRole = 'staff';
  } else if (viewName === 'admin') {
    state.currentRole = state.isAdminLoggedIn ? 'admin' : 'student';
  } else {
    state.currentRole = 'student';
  }
  updateRoleIndicator();

  // Toggle view visibility
  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  // Update navbar tabs
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  const activeTab = document.getElementById(`tab-${viewName}`);
  if (activeTab) activeTab.classList.add('active');

  // Perform view-specific initializations
  if (viewName === 'student') {
    loadMenu();
    loadSlots();
  } else if (viewName === 'tracking') {
    if (state.trackingToken) {
      lookupOrderByToken(state.trackingToken, true);
    }
  } else if (viewName === 'feedback') {
    loadFeedbackView();
  } else if (viewName === 'staff') {
    loadStaffOrders();
  } else if (viewName === 'admin') {
    renderAdminPortal();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateRoleIndicator() {
  const roleLabel = document.getElementById('current-role-label');
  if (roleLabel) {
    const displayRole = (state.currentView === 'admin' && state.isAdminLoggedIn) ? 'ADMIN' : state.currentRole.toUpperCase();
    roleLabel.innerText = displayRole;
    if (displayRole === 'ADMIN') {
      roleLabel.style.color = 'var(--accent-purple)';
    } else if (displayRole === 'STAFF') {
      roleLabel.style.color = 'var(--accent-amber)';
    } else {
      roleLabel.style.color = 'var(--accent-cyan)';
    }
  }
}

// Background polling for real-time synchronization
function startPolling() {
  if (state.pollingTimer) clearInterval(state.pollingTimer);
  state.pollingTimer = setInterval(() => {
    // Refresh staff queue if staff view active
    if (state.currentView === 'staff') {
      loadStaffOrders(true);
    }
    // Refresh tracking if tracking view active and token selected
    if (state.currentView === 'tracking' && state.trackingToken) {
      lookupOrderByToken(state.trackingToken, true);
    }
    // Update badge count in header
    updateHeaderPendingBadge();
  }, 4000);
}

// ==========================================================================
// 2. SLOTS & CAPACITY MANAGEMENT
// ==========================================================================

async function loadSlots() {
  try {
    const res = await apiFetch('/api/slots');
    const data = await res.json();
    if (data.success) {
      state.availableSlots = data.data;
      populateSlotDropdown();
    }
  } catch (err) {
    console.warn('Failed to load slots', err);
  }
}

function populateSlotDropdown() {
  const select = document.getElementById('pickup-slot');
  if (!select) return;

  const currentVal = select.value;

  select.innerHTML = `
    <option value="">Select a pickup time slot...</option>
    ${state.availableSlots.map(s => {
      const isFull = s.remaining <= 0;
      const label = `${s.slot} (${s.remaining}/${s.capacity} spots available)`;
      return `<option value="${s.slot}" ${isFull ? 'disabled' : ''} ${s.slot === currentVal ? 'selected' : ''}>
        ${isFull ? `🔒 ${s.slot} (FULL)` : `🕒 ${label}`}
      </option>`;
    }).join('')}
  `;
}

// ==========================================================================
// 3. STUDENT MENU & CATEGORY FILTERING
// ==========================================================================

async function loadMenu() {
  try {
    const res = await apiFetch('/api/menu');
    const data = await res.json();
    if (data.success) {
      state.menuItems = data.data;
      renderMenu();
    }
  } catch (err) {
    showToast('Failed to load menu items', 'error');
  }
}

function filterByCategory(category) {
  state.currentCategory = category;
  
  // Update chips UI
  document.querySelectorAll('#category-filter-chips .chip').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-category') === category);
  });
  
  renderMenu();
}

function handleMenuSearch() {
  const input = document.getElementById('menu-search-input');
  state.searchQuery = input.value.trim().toLowerCase();
  
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = state.searchQuery ? 'block' : 'none';
  
  renderMenu();
}

function clearSearch() {
  const input = document.getElementById('menu-search-input');
  input.value = '';
  state.searchQuery = '';
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  renderMenu();
}

function renderMenu() {
  const grid = document.getElementById('menu-items-grid');
  const countBadge = document.getElementById('menu-count-badge');
  if (!grid) return;

  // Filter items by category & search
  let filtered = state.menuItems;

  if (state.currentCategory !== 'All') {
    filtered = filtered.filter(i => i.category.toLowerCase() === state.currentCategory.toLowerCase());
  }

  if (state.searchQuery) {
    filtered = filtered.filter(i => 
      i.name.toLowerCase().includes(state.searchQuery) ||
      i.description.toLowerCase().includes(state.searchQuery) ||
      i.category.toLowerCase().includes(state.searchQuery)
    );
  }

  if (countBadge) {
    countBadge.innerText = `${filtered.length} Items Available`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔍</div>
        <h3>No matching dishes found</h3>
        <p>Try searching for something else or browse another category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const isOut = !item.isAvailable || item.stock <= 0;
    const isLow = item.stock > 0 && item.stock <= 8;
    const cartItem = state.cart.find(c => c.id === item.id);
    const inCartQty = cartItem ? cartItem.quantity : 0;
    const icon = getFoodIcon(item.image, item.category);
    const meta = dishMetadata[item.id] || dishMetadata['default'];

    let stockTag = `<span class="stock-tag in-stock">● In Stock (${item.stock})</span>`;
    if (isOut) {
      stockTag = `<span class="stock-tag out-stock">● Sold Out</span>`;
    } else if (isLow) {
      stockTag = `<span class="stock-tag low-stock">● Few Left (${item.stock})</span>`;
    }

    return `
      <div class="food-card ${isOut ? 'out-of-stock' : ''}" data-category="${item.category}">
        <div class="card-visual">
          <span class="food-icon-huge">${icon}</span>
          ${item.badge ? `<span class="card-badge">${item.badge}</span>` : ''}
          <span class="card-preptime">⏱️ ${item.prepTime || '8 mins'}</span>
        </div>

        <div class="card-details">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span class="card-category">${item.category}</span>
            <span class="veg-badge" title="100% Pure Veg Canteen Meal"><span class="veg-dot"></span></span>
          </div>

          <h3 class="card-name">${item.name}</h3>
          
          <div class="card-meta-chips">
            <span class="meta-chip spice-chip">${meta.spice}</span>
            <span class="meta-chip kcal-chip">🔥 ${meta.calories} kcal</span>
            <span class="meta-chip rating-chip">★ ${meta.rating}</span>
          </div>

          <p class="card-desc">${item.description || 'Delicious freshly prepared mess specialty.'}</p>

          <div class="card-footer-row">
            <div class="card-price-wrap">
              <span class="price-currency">Price</span>
              <span class="price-value">₹${item.price}</span>
              ${stockTag}
            </div>

            <div class="card-action">
              ${isOut ? `
                <button class="add-btn" disabled>Sold Out</button>
              ` : inCartQty > 0 ? `
                <div class="card-qty-control">
                  <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                  <span class="qty-val">${inCartQty}</span>
                  <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                </div>
              ` : `
                <button class="add-btn" onclick="addToCart('${item.id}')">
                  + Add to Cart
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 4. SHOPPING CART & LOCAL PERSISTENCE
// ==========================================================================

function addToCart(itemId) {
  const menuItem = state.menuItems.find(i => i.id === itemId);
  if (!menuItem || !menuItem.isAvailable || menuItem.stock <= 0) {
    showToast('Item is currently out of stock', 'error');
    return;
  }

  const existing = state.cart.find(c => c.id === itemId);
  if (existing) {
    if (existing.quantity >= menuItem.stock) {
      showToast(`Only ${menuItem.stock} portions available!`, 'info');
      return;
    }
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      maxStock: menuItem.stock,
      image: menuItem.image
    });
  }

  saveCart();
  updateCartUI();
  renderMenu();
  showToast(`Added ${menuItem.name} to cart`, 'success');
}

function updateCartQuantity(itemId, delta) {
  const itemIdx = state.cart.findIndex(c => c.id === itemId);
  if (itemIdx === -1) return;

  const item = state.cart[itemIdx];
  const menuItem = state.menuItems.find(m => m.id === itemId);
  const maxStock = menuItem ? menuItem.stock : item.maxStock;

  item.quantity += delta;

  if (item.quantity > maxStock) {
    item.quantity = maxStock;
    showToast(`Maximum available portions reached (${maxStock})`, 'info');
  } else if (item.quantity <= 0) {
    state.cart.splice(itemIdx, 1);
  }

  saveCart();
  updateCartUI();
  renderMenu();
}

function saveCart() {
  try {
    localStorage.setItem('smart_canteen_cart', JSON.stringify(state.cart));
  } catch (e) {
    console.warn('Could not save cart', e);
  }
}

function updateCartUI() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update header cart indicators
  const badge = document.getElementById('cart-badge');
  const totalHeader = document.getElementById('cart-total-header');
  if (badge) badge.innerText = totalItems;
  if (totalHeader) totalHeader.innerText = `₹${totalAmount}`;

  // Update drawer contents
  renderCartDrawer(totalAmount);
}

function renderCartDrawer(totalAmount) {
  const drawerBody = document.getElementById('cart-items-body');
  const billSubtotal = document.getElementById('bill-subtotal');
  const billTotal = document.getElementById('bill-total');
  const checkoutBtn = document.getElementById('btn-proceed-checkout');
  if (!drawerBody) return;

  if (state.cart.length === 0) {
    drawerBody.innerHTML = `
      <div class="cart-empty-message">
        <div class="cart-empty-icon">🛒</div>
        <h4>Your Cart is Empty</h4>
        <p>Explore our menu and add your favorite dishes to pre-order.</p>
      </div>
    `;
    if (billSubtotal) billSubtotal.innerText = '₹0';
    if (billTotal) billTotal.innerText = '₹0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  drawerBody.innerHTML = state.cart.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</span>
      </div>

      <div class="card-qty-control">
        <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');

  if (billSubtotal) billSubtotal.innerText = `₹${totalAmount}`;
  if (billTotal) billTotal.innerText = `₹${totalAmount}`;
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const isActive = drawer.classList.contains('active');
  if (isActive) {
    closeCartDrawer();
  } else {
    openCartDrawer();
  }
}

function openCartDrawer() {
  document.getElementById('cart-drawer').classList.add('active');
  document.getElementById('drawer-overlay').classList.add('active');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('active');
  document.getElementById('drawer-overlay').classList.remove('active');
}

// ==========================================================================
// 5. CHECKOUT & TOKEN CREATION
// ==========================================================================

function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Please add items to cart first', 'error');
    return;
  }

  closeCartDrawer();
  loadSlots(); // Refresh slot capacity before checkout

  // Populate preview
  const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const previewContainer = document.getElementById('checkout-items-preview');
  const totalPreview = document.getElementById('checkout-total-preview');

  if (previewContainer) {
    previewContainer.innerHTML = state.cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
  }
  if (totalPreview) {
    totalPreview.innerText = `₹${totalAmount}`;
  }

  document.getElementById('checkout-modal-overlay').classList.add('active');
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal-overlay').classList.remove('active');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const studentName = document.getElementById('student-name').value.trim();
  const rollNumber = document.getElementById('roll-number').value.trim();
  const phone = document.getElementById('student-phone').value.trim();
  const pickupSlot = document.getElementById('pickup-slot').value;

  if (!studentName || !rollNumber || !pickupSlot) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  const btn = document.getElementById('btn-place-order');
  btn.disabled = true;
  btn.innerText = 'Creating Pre-Order...';

  try {
    const payload = {
      studentName,
      rollNumber,
      phone,
      pickupSlot,
      items: state.cart.map(c => ({ id: c.id, name: c.name, quantity: c.quantity }))
    };

    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Failed to place order', 'error');
      btn.disabled = false;
      btn.innerText = 'Confirm & Generate Token 🚀';
      return;
    }

    const createdOrder = data.data;

    // Clear cart
    state.cart = [];
    saveCart();
    updateCartUI();
    loadMenu(); // Refresh stock in menu

    // Save token
    state.trackingToken = createdOrder.token;
    saveRecentToken(createdOrder.token);

    // Close checkout and show success confirmation modal
    closeCheckoutModal();
    showSuccessModal(createdOrder);

  } catch (err) {
    showToast('Server error while placing order', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Confirm & Generate Token 🚀';
  }
}

function showSuccessModal(order) {
  state.lastCreatedOrder = order;
  state.currentTrackedOrder = order;
  document.getElementById('success-token-code').innerText = `#${order.token}`;
  document.getElementById('success-token-slot').innerText = order.pickupSlot;
  document.getElementById('success-total-amount').innerText = `₹${order.totalAmount}`;
  
  // Set QR code image
  const qrImg = document.getElementById('success-qr-image');
  if (qrImg && order.qrDataUrl) {
    qrImg.src = order.qrDataUrl;
  }
  
  document.getElementById('success-modal-overlay').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('success-modal-overlay').classList.remove('active');
}

function viewPlacedOrderInTracker() {
  closeSuccessModal();
  switchView('tracking');
}

// QR Code Enlarged View Modal
function openQrExpandedModal(orderToUse = null) {
  const order = orderToUse || state.currentTrackedOrder || state.lastCreatedOrder;
  if (!order) {
    showToast('No active order token to display QR code', 'info');
    return;
  }
  const modal = document.getElementById('qr-modal-overlay');
  const img = document.getElementById('qr-enlarged-img');
  const title = document.getElementById('qr-modal-token-title');
  const sub = document.getElementById('qr-modal-token-sub');
  const urlDisplay = document.getElementById('qr-modal-url-display');

  if (title) title.innerText = `Token #${order.token} QR Code`;
  if (sub) sub.innerText = `#${order.token}`;
  if (img) img.src = order.qrDataUrl || '';
  if (urlDisplay) urlDisplay.innerText = order.qrTrackUrl || `${window.location.origin}/?track=${order.token}`;

  if (modal) modal.classList.add('active');
}

function closeQrExpandedModal() {
  const modal = document.getElementById('qr-modal-overlay');
  if (modal) modal.classList.remove('active');
}

// Print Order Token Voucher Slip
function printOrderTokenReceipt(orderToUse = null) {
  const order = orderToUse || state.lastCreatedOrder || state.currentTrackedOrder;
  if (!order) {
    showToast('No active order available to print voucher', 'info');
    return;
  }
  
  document.getElementById('receipt-token').innerText = `#${order.token}`;
  document.getElementById('receipt-date').innerText = new Date(order.createdAt || Date.now()).toLocaleString();
  document.getElementById('receipt-student').innerText = order.studentName || 'Student';
  document.getElementById('receipt-roll').innerText = order.rollNumber || 'N/A';
  document.getElementById('receipt-slot').innerText = order.pickupSlot || 'Counter Pickup';
  document.getElementById('receipt-payment-status').innerText = order.paymentStatus || 'Pending';
  document.getElementById('receipt-total').innerText = `₹${order.totalAmount || 0}`;

  const qrImg = document.getElementById('receipt-qr-img');
  if (qrImg && order.qrDataUrl) {
    qrImg.src = order.qrDataUrl;
  }

  const tbody = document.getElementById('receipt-items-tbody');
  if (tbody && Array.isArray(order.items)) {
    tbody.innerHTML = order.items.map(it => `
      <tr>
        <td style="padding: 0.35rem 0;">${it.name}</td>
        <td style="padding: 0.35rem 0; text-align: center;">${it.quantity}</td>
        <td style="padding: 0.35rem 0; text-align: right;">₹${it.subtotal || (it.price * it.quantity)}</td>
      </tr>
    `).join('');
  }

  const receiptModal = document.getElementById('receipt-modal-overlay');
  if (receiptModal) receiptModal.classList.add('active');
}

function closeReceiptModal() {
  const receiptModal = document.getElementById('receipt-modal-overlay');
  if (receiptModal) receiptModal.classList.remove('active');
}

// Copy Token to Clipboard Helper
function copyCurrentToken() {
  const token = state.currentTrackedOrder ? state.currentTrackedOrder.token : (state.trackingToken || 'YR-1001');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(token).then(() => {
      showToast(`Token #${token} copied to clipboard!`, 'success');
    }).catch(() => {
      showToast(`Token: #${token}`, 'info');
    });
  } else {
    showToast(`Token: #${token}`, 'info');
  }
}

// Web Audio API Cafeteria Notification Sound Synthesizer
function playCafeteriaChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Ding (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.22, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.65);

    // Dong (880.00 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.28, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 1.25);
  } catch (e) {
    console.warn('Audio chime warning:', e);
  }
}

// Custom Cursor Movement with Smooth Lerp
function initCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    dot.style.display = 'none';
    ring.style.display = 'none';
    return;
  }

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let isMoving = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
    if (!isMoving) {
      isMoving = true;
      ringX = mouseX;
      ringY = mouseY;
    }
  });

  function renderCursor() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Hover expansion on interactive elements
  const hoverSelectors = 'button, a, input, select, textarea, .food-card, .chip, .nav-tab, .recent-token-pill, .cart-trigger-btn, .meal-pill-btn, .token-banner-qr, .qr-image-wrapper, .tracker-strip-btn, .voice-search-mic-btn, .vac-chip, .vac-btn-icon, .vac-mic-toggle-btn';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverSelectors)) {
      ring.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverSelectors)) {
      ring.classList.remove('cursor-hover');
    }
  });

  document.addEventListener('mousedown', () => ring.classList.add('cursor-active'));
  document.addEventListener('mouseup', () => ring.classList.remove('cursor-active'));
}

function saveRecentToken(token) {
  try {
    let recents = JSON.parse(localStorage.getItem('smart_canteen_recent_tokens') || '[]');
    recents = recents.filter(t => t !== token);
    recents.unshift(token);
    recents = recents.slice(0, 5);
    localStorage.setItem('smart_canteen_recent_tokens', JSON.stringify(recents));
    localStorage.setItem('smart_canteen_last_token', token);
    updateRecentTokensUI();
  } catch (e) {
    console.warn('Could not save recent token', e);
  }
}

function updateRecentTokensUI() {
  const container = document.getElementById('recent-tokens-list');
  if (!container) return;

  try {
    const recents = JSON.parse(localStorage.getItem('smart_canteen_recent_tokens') || '[]');
    if (recents.length === 0) {
      container.innerHTML = `
        <span style="font-size: 0.8rem; color: var(--text-dim);">Quick Demo Tokens:</span>
        <button class="recent-token-pill" onclick="lookupOrderByToken('YR-1001')">#YR-1001</button>
        <button class="recent-token-pill" onclick="lookupOrderByToken('YR-1002')">#YR-1002</button>
        <button class="recent-token-pill" onclick="lookupOrderByToken('YR-1003')">#YR-1003</button>
      `;
      return;
    }

    container.innerHTML = `
      <span style="font-size: 0.8rem; color: var(--text-dim);">Your Recent Tokens:</span>
      ${recents.map(t => `<button class="recent-token-pill" onclick="lookupOrderByToken('${t}')">#${t}</button>`).join('')}
    `;
  } catch (e) {
    console.warn(e);
  }
}

// ==========================================================================
// 6. LIVE ORDER TRACKING (5 STATUSES, CANCELLATION & PAYMENT STATUS)
// ==========================================================================

function lookupOrderByInput() {
  const input = document.getElementById('tracking-token-input');
  const token = input.value.trim();
  if (!token) {
    showToast('Please enter an order token', 'info');
    return;
  }
  lookupOrderByToken(token);
}

async function lookupOrderByToken(token, silent = false) {
  try {
    const cleanToken = token.trim().toUpperCase();
    const res = await apiFetch(`/api/orders/${cleanToken}`);
    const data = await res.json();

    if (!data.success) {
      if (!silent) showToast(data.message || 'Order not found', 'error');
      return;
    }

    const order = data.data;
    state.trackingToken = order.token;
    saveRecentToken(order.token);

    renderTrackingDetails(order);

  } catch (err) {
    if (!silent) showToast('Error tracking order', 'error');
  }
}

function renderTrackingDetails(order) {
  const detailsCard = document.getElementById('tracking-details-card');
  const emptyState = document.getElementById('tracking-empty-state');
  if (!detailsCard) return;

  detailsCard.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';

  // Header banner info
  document.getElementById('track-token-display').innerText = `#${order.token}`;
  const placedTime = order.statusHistory && order.statusHistory.length > 0
    ? new Date(order.statusHistory[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Recently';
  document.getElementById('track-time-display').innerText = `Placed at ${placedTime}`;
  
  state.currentTrackedOrder = order;

  // Set QR Code thumbnail in tracking header
  const trackQrImg = document.getElementById('track-qr-img');
  if (trackQrImg && order.qrDataUrl) {
    trackQrImg.src = order.qrDataUrl;
  }

  const statusPill = document.getElementById('track-status-pill');
  statusPill.innerText = order.status;
  statusPill.className = `current-status-badge status-${order.status.replace(/\s+/g, '')}`;

  document.getElementById('track-slot-display').innerText = order.pickupSlot;

  // Update quick action strip token text
  const stripTokenEl = document.getElementById('strip-token-text');
  if (stripTokenEl) stripTokenEl.innerText = order.token;

  // Live Preparation Countdown & Queue Bar Update
  const countdownBar = document.getElementById('tracker-countdown-bar');
  const tlsbIcon = document.getElementById('tlsb-icon');
  const tlsbTitle = document.getElementById('tlsb-title');
  const tlsbSub = document.getElementById('tlsb-sub');
  const timerVal = document.getElementById('tracker-timer-val');
  const queueText = document.getElementById('tracker-queue-text');

  if (countdownBar) {
    countdownBar.classList.remove('status-ready-state');

    if (order.status === 'Ready for Pickup') {
      countdownBar.classList.add('status-ready-state');
      if (tlsbIcon) tlsbIcon.innerText = '🔔';
      if (tlsbTitle) tlsbTitle.innerText = '🎉 Your Meal is Ready at Counter 2!';
      if (tlsbSub) tlsbSub.innerText = 'Present token #' + order.token + ' or your QR code to the counter server.';
      if (timerVal) timerVal.innerText = 'READY NOW';
      if (queueText) queueText.innerHTML = 'Status: <strong style="color: #6ee7b7;">Ready for Handover</strong>';

      // Play audio chime if status just changed to Ready
      if (state.lastAnnouncedStatus !== order.token + '_Ready') {
        state.lastAnnouncedStatus = order.token + '_Ready';
        playCafeteriaChime();
        showToast(`🔔 Meal Ready! Token #${order.token} is waiting at Counter 2`, 'success');
      }
    } else if (order.status === 'Preparing') {
      if (tlsbIcon) tlsbIcon.innerText = '🍳';
      if (tlsbTitle) tlsbTitle.innerText = 'Chef is Cooking Your Meal';
      if (tlsbSub) tlsbSub.innerText = 'Ingredients on the stove; cooking fresh for your pickup slot.';
      if (timerVal) timerVal.innerText = '~04:30 mins';
      if (queueText) queueText.innerHTML = 'Status: <strong style="color: var(--accent-amber);">Cooking Active</strong>';
    } else if (order.status === 'Accepted') {
      if (tlsbIcon) tlsbIcon.innerText = '👍';
      if (tlsbTitle) tlsbTitle.innerText = 'Order Accepted & Verified';
      if (tlsbSub) tlsbSub.innerText = 'Queued up for cooking at counter kitchen.';
      if (timerVal) timerVal.innerText = '~08:00 mins';
      if (queueText) queueText.innerHTML = 'Queue: <strong>Up Next</strong>';
    } else if (order.status === 'Placed') {
      if (tlsbIcon) tlsbIcon.innerText = '📋';
      if (tlsbTitle) tlsbTitle.innerText = 'Order Sent to Mess Kitchen';
      if (tlsbSub) tlsbSub.innerText = 'Waiting for kitchen staff verification.';
      if (timerVal) timerVal.innerText = '~10:00 mins';
      if (queueText) queueText.innerHTML = 'Queue: <strong>Order Logged</strong>';
    } else if (order.status === 'Collected') {
      if (tlsbIcon) tlsbIcon.innerText = '✅';
      if (tlsbTitle) tlsbTitle.innerText = 'Order Collected & Completed';
      if (tlsbSub) tlsbSub.innerText = 'Enjoy your delicious meal! Share your rating below.';
      if (timerVal) timerVal.innerText = 'Collected';
      if (queueText) queueText.innerHTML = 'Status: <strong>Completed</strong>';
    } else if (order.status === 'Cancelled') {
      if (tlsbIcon) tlsbIcon.innerText = '⚠️';
      if (tlsbTitle) tlsbTitle.innerText = 'Order Cancelled';
      if (tlsbSub) tlsbSub.innerText = 'Reserved items restored back to stock inventory.';
      if (timerVal) timerVal.innerText = 'Cancelled';
      if (queueText) queueText.innerHTML = 'Status: <strong style="color: var(--accent-rose);">Cancelled</strong>';
    }
  }

  // Render 5-step stepper
  updateStepperUI(order);

  // Items list
  const itemsContainer = document.getElementById('track-items-list');
  if (itemsContainer && Array.isArray(order.items)) {
    itemsContainer.innerHTML = order.items.map(it => `
      <div class="summary-item-row">
        <span><strong>${it.quantity}x</strong> ${it.name}</span>
        <span>₹${it.subtotal || (it.price * it.quantity)}</span>
      </div>
    `).join('');
  }

  document.getElementById('track-total-amount').innerText = `₹${order.totalAmount}`;
  document.getElementById('track-student-name').innerText = order.studentName;
  document.getElementById('track-roll-number').innerText = order.rollNumber || 'N/A';
  document.getElementById('track-phone').innerText = order.phone || 'N/A';
  document.getElementById('track-slot-info').innerText = order.pickupSlot;

  // Payment Status Pill (Separate from Order Status)
  const paymentPill = document.getElementById('track-payment-status');
  if (paymentPill) {
    if (order.paymentStatus === 'Paid') {
      paymentPill.innerHTML = `<span style="color: var(--accent-emerald);">Paid ✅ (${order.paidAt ? new Date(order.paidAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Cash'})</span>`;
    } else {
      paymentPill.innerHTML = `<span style="color: var(--accent-amber);">Pending (Cash at Counter)</span>`;
    }
  }

  // Cancel Order Button Handling (Rule: allowed only before order reaches Preparing)
  const cancelBtn = document.getElementById('btn-cancel-order');
  const cancelledBanner = document.getElementById('cancelled-order-banner');

  if (order.status === 'Cancelled') {
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (cancelledBanner) cancelledBanner.style.display = 'block';
  } else if (['Placed', 'Accepted'].includes(order.status)) {
    if (cancelBtn) {
      cancelBtn.style.display = 'block';
      cancelBtn.innerText = `Cancel Order ✕ (Allowed before preparation)`;
    }
    if (cancelledBanner) cancelledBanner.style.display = 'none';
  } else {
    // Preparing, Ready, or Collected -> Cannot cancel
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (cancelledBanner) cancelledBanner.style.display = 'none';
  }

  // Feedback prompt: show if order is Collected
  const fbPrompt = document.getElementById('tracking-feedback-prompt');
  if (fbPrompt) {
    fbPrompt.style.display = order.status === 'Collected' ? 'flex' : 'none';
  }
}

function updateStepperUI(order) {
  const stages = ['Placed', 'Accepted', 'Preparing', 'Ready for Pickup', 'Collected'];
  const currentIdx = stages.indexOf(order.status);

  // Map of timestamps from statusHistory
  const timeMap = {};
  if (order.statusHistory) {
    order.statusHistory.forEach(h => {
      timeMap[h.status] = new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
  }

  stages.forEach((stage, idx) => {
    const stepId = stage === 'Ready for Pickup' ? 'step-Ready' : `step-${stage}`;
    const stepElem = document.getElementById(stepId);
    const timeElem = document.getElementById(stage === 'Ready for Pickup' ? 'time-Ready' : `time-${stage}`);

    if (timeElem) {
      timeElem.innerText = timeMap[stage] || (idx <= currentIdx ? 'Done' : '--');
    }

    if (stepElem) {
      stepElem.classList.remove('completed', 'current');
      if (order.status === 'Cancelled') {
        stepElem.style.opacity = '0.4';
      } else {
        stepElem.style.opacity = '1';
        if (idx < currentIdx) {
          stepElem.classList.add('completed');
        } else if (idx === currentIdx) {
          stepElem.classList.add('current');
        }
      }
    }

    // Connectors
    if (idx < stages.length - 1) {
      const conn = document.getElementById(`connector-${idx + 1}`);
      if (conn) {
        conn.classList.toggle('filled', order.status !== 'Cancelled' && idx < currentIdx);
      }
    }
  });
}

// Student Order Cancellation
async function cancelCurrentOrder() {
  if (!state.trackingToken) return;

  if (!confirm(`Are you sure you want to cancel order #${state.trackingToken}?\n\nReserved items will be restored to mess stock.`)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/orders/${state.trackingToken}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by student' })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadMenu(); // Refresh stock in menu
      lookupOrderByToken(state.trackingToken);
    } else {
      showToast(data.message || 'Cancellation failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

// ==========================================================================
// 7. DEDICATED STUDENT FEEDBACK & REVIEWS VIEW
// ==========================================================================

async function loadFeedbackView() {
  try {
    const res = await apiFetch('/api/feedback');
    const data = await res.json();
    if (data.success) {
      renderPublicFeedback(data.data);
    }
  } catch (err) {
    console.error('Error loading feedback', err);
  }
}

function renderPublicFeedback(reviews) {
  const container = document.getElementById('public-feedback-grid');
  const avgNum = document.getElementById('feedback-average-num');
  const starsVisual = document.getElementById('feedback-stars-visual');
  const totalReviewsLabel = document.getElementById('feedback-total-reviews-label');
  if (!container) return;

  if (reviews.length > 0) {
    const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    if (avgNum) avgNum.innerText = avg;
    if (starsVisual) starsVisual.innerText = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
    if (totalReviewsLabel) totalReviewsLabel.innerText = `Based on ${reviews.length} student reviews`;
  }

  if (reviews.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No reviews submitted yet. Be the first to share your experience!</p>';
    return;
  }

  container.innerHTML = reviews.map(fb => `
    <div class="fb-card">
      <div class="fb-card-top">
        <span class="fb-student-title">${fb.studentName}</span>
        <span class="fb-stars-display">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</span>
      </div>
      <p class="fb-comment-text">"${fb.comment || 'Great food and fast pickup!'}"</p>
      <div class="fb-meta-bottom">
        <span>Order: <strong>#${fb.orderToken}</strong></span>
        <span>${new Date(fb.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

function openGeneralFeedbackModal() {
  document.getElementById('feedback-order-token-input').value = state.trackingToken || '';
  setRating(5);
  document.getElementById('feedback-modal-overlay').classList.add('active');
}

function openFeedbackModalForCurrentOrder() {
  if (!state.trackingToken) return;
  document.getElementById('feedback-order-token-input').value = state.trackingToken;
  setRating(5);
  document.getElementById('feedback-modal-overlay').classList.add('active');
}

function closeFeedbackModal() {
  document.getElementById('feedback-modal-overlay').classList.remove('active');
}

function setRating(rating) {
  state.selectedRating = rating;
  const stars = document.querySelectorAll('#star-rating-selector .star-btn');
  stars.forEach((s, idx) => {
    s.classList.toggle('active', idx < rating);
  });

  const hints = {
    1: '1 Star - Needs Improvement',
    2: '2 Stars - Fair',
    3: '3 Stars - Good',
    4: '4 Stars - Very Good',
    5: '5 Stars - Excellent Food & Service!'
  };
  document.getElementById('rating-text-hint').innerText = hints[rating] || '';
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();

  const token = document.getElementById('feedback-order-token-input').value.trim();
  const name = document.getElementById('feedback-name').value.trim();
  const comment = document.getElementById('feedback-comment').value.trim();

  try {
    const res = await apiFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderToken: token,
        studentName: name,
        rating: state.selectedRating,
        comment: comment
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Thank you for rating your meal!', 'success');
      closeFeedbackModal();
      document.getElementById('feedback-form').reset();
      loadFeedbackView();
    } else {
      showToast(data.message || 'Failed to submit rating', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

// ==========================================================================
// 8. CANTEEN STAFF KITCHEN DASHBOARD
// ==========================================================================

async function loadStaffOrders(silent = false) {
  try {
    const res = await apiFetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      state.staffOrders = data.data;
      renderStaffDashboard();
      updateHeaderPendingBadge();
    }
  } catch (err) {
    if (!silent) showToast('Failed to load kitchen orders', 'error');
  }
}

function filterStaffOrders(filter) {
  state.staffFilter = filter;
  document.querySelectorAll('.staff-filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  renderStaffDashboard();
}

function renderStaffDashboard() {
  const container = document.getElementById('staff-orders-grid');
  if (!container) return;

  // Counts for tabs
  const allActive = state.staffOrders.filter(o => ['Placed', 'Accepted', 'Preparing', 'Ready for Pickup'].includes(o.status));
  const placed = state.staffOrders.filter(o => o.status === 'Placed');
  const accepted = state.staffOrders.filter(o => o.status === 'Accepted');
  const preparing = state.staffOrders.filter(o => o.status === 'Preparing');
  const ready = state.staffOrders.filter(o => o.status === 'Ready for Pickup');

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setTxt('staff-count-all', allActive.length);
  setTxt('staff-count-placed', placed.length);
  setTxt('staff-count-accepted', accepted.length);
  setTxt('staff-count-preparing', preparing.length);
  setTxt('staff-count-ready', ready.length);

  // Filter orders according to selected tab
  let displayed = state.staffOrders;
  if (state.staffFilter === 'All') {
    displayed = allActive;
  } else {
    displayed = state.staffOrders.filter(o => o.status === state.staffFilter);
  }

  if (displayed.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md);">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">✨</div>
        <h3>No ${state.staffFilter === 'All' ? 'active' : state.staffFilter} orders in queue</h3>
        <p>Kitchen queue is clear!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayed.map(order => {
    const elapsedMinutes = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
    const timeText = elapsedMinutes < 1 ? 'Just now' : `${elapsedMinutes}m ago`;
    const isPaid = order.paymentStatus === 'Paid';

    let actionButtons = '';
    if (order.status === 'Placed') {
      actionButtons = `
        <button class="btn-kitchen-action btn-primary" onclick="advanceOrderStatus('${order.id}', 'Accepted')">
          Accept Order 👍
        </button>
        <button class="btn-kitchen-action btn-danger btn-sm" onclick="cancelOrderByStaff('${order.id}')">
          Cancel & Release Stock ✕
        </button>
      `;
    } else if (order.status === 'Accepted') {
      actionButtons = `
        <button class="btn-kitchen-action btn-secondary" onclick="advanceOrderStatus('${order.id}', 'Preparing')">
          Start Preparing 🍳
        </button>
        <button class="btn-kitchen-action btn-danger btn-sm" onclick="cancelOrderByStaff('${order.id}')">
          Cancel & Release Stock ✕
        </button>
      `;
    } else if (order.status === 'Preparing') {
      actionButtons = `
        <button class="btn-kitchen-action" style="background: #10b981; color: #000;" onclick="advanceOrderStatus('${order.id}', 'Ready for Pickup')">
          Mark Ready for Pickup 🔔
        </button>
      `;
    } else if (order.status === 'Ready for Pickup') {
      actionButtons = `
        <button class="btn-kitchen-action" style="background: #3b82f6; color: #fff;" onclick="advanceOrderStatus('${order.id}', 'Collected')">
          Hand Over & Collected 🎉
        </button>
      `;
    } else if (order.status === 'Cancelled') {
      actionButtons = `
        <span style="font-size: 0.8rem; color: var(--accent-rose); text-align: center;">Order Cancelled (Stock Restored)</span>
      `;
    } else {
      actionButtons = `
        <span style="font-size: 0.8rem; color: var(--text-dim); text-align: center;">Order Completed</span>
      `;
    }

    return `
      <div class="kitchen-card">
        <div class="kitchen-card-header">
          <div class="k-token-wrap">
            <span class="k-token-num">#${order.token}</span>
            <span class="k-time-elapsed">${timeText}</span>
          </div>
          <div style="text-align: right;">
            <span class="k-status-badge current-status-badge status-${order.status.replace(/\s+/g, '')}">${order.status}</span>
            <div style="margin-top: 4px;">
              <span class="payment-tag ${isPaid ? 'paid' : 'pending'}">
                ${isPaid ? 'Paid ✅' : 'Cash Pending 💵'}
              </span>
            </div>
          </div>
        </div>

        <div class="k-student-info">
          <span class="k-student-name">${order.studentName}</span>
          <span class="k-student-roll">Roll: ${order.rollNumber || 'N/A'} • ${order.phone || ''}</span>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
            <span class="k-slot-badge">🕒 Pickup: ${order.pickupSlot}</span>
            <strong style="color: #fff; font-family: var(--font-mono);">Total: ₹${order.totalAmount}</strong>
          </div>
        </div>

        <div class="k-items-list">
          ${order.items.map(it => `
            <div class="k-item-row">
              <span><span class="k-item-qty">${it.quantity}x</span> ${it.name}</span>
              <span style="color: var(--text-muted); font-size: 0.8rem;">₹${it.subtotal || (it.price * it.quantity)}</span>
            </div>
          `).join('')}
        </div>

        <div style="margin-bottom: 0.75rem;">
          ${!isPaid && order.status !== 'Cancelled' ? `
            <button class="btn btn-outline btn-sm btn-block" style="border-color: var(--accent-emerald); color: var(--accent-emerald);" onclick="updatePaymentStatus('${order.id}', 'Paid')">
              Mark Cash Received (Paid) 💵
            </button>
          ` : isPaid ? `
            <span style="font-size: 0.75rem; color: var(--accent-emerald); display: block; text-align: center;">Payment Verified</span>
          ` : ''}
        </div>

        <div class="k-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
}

async function advanceOrderStatus(orderId, newStatus) {
  try {
    const res = await apiFetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Status updated to "${newStatus}"`, 'success');
      loadStaffOrders();
    } else {
      showToast(data.message || 'Status update failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

async function updatePaymentStatus(orderId, paymentStatus) {
  try {
    const res = await apiFetch(`/api/orders/${orderId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Payment marked as ${paymentStatus}`, 'success');
      loadStaffOrders();
    } else {
      showToast(data.message || 'Failed to update payment', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

async function cancelOrderByStaff(orderId) {
  if (!confirm(`Cancel this order?\n\nThis will restore the reserved quantities back to stock.`)) return;

  try {
    const res = await apiFetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by kitchen staff' })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadMenu();
      loadStaffOrders();
    } else {
      showToast(data.message || 'Cancellation failed', 'error');
    }
  } catch (err) {
    showToast('Failed to cancel order', 'error');
  }
}

function updateHeaderPendingBadge() {
  const pendingBadge = document.getElementById('staff-pending-count');
  if (!pendingBadge) return;
  apiFetch('/api/orders')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const activeCount = data.data.filter(o => ['Placed', 'Accepted', 'Preparing'].includes(o.status)).length;
        pendingBadge.innerText = activeCount;
      }
    })
    .catch(() => {});
}

// ==========================================================================
// 9. ADMIN PORTAL (SECURE LOGIN & DASHBOARD)
// ==========================================================================

function renderAdminPortal() {
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboardScreen = document.getElementById('admin-dashboard-screen');

  if (state.isAdminLoggedIn) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboardScreen) dashboardScreen.style.display = 'block';
    state.currentRole = 'admin';
    updateRoleIndicator();
    loadAdminData();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboardScreen) dashboardScreen.style.display = 'none';
    state.currentRole = 'student';
    updateRoleIndicator();
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();

  const user = document.getElementById('admin-user-input').value.trim();
  const pass = document.getElementById('admin-pass-input').value;
  const errBox = document.getElementById('admin-login-error');
  const btn = document.getElementById('btn-admin-login');

  btn.disabled = true;
  btn.innerText = 'Authenticating...';
  if (errBox) errBox.style.display = 'none';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });

    const data = await res.json();

    if (data.success) {
      state.isAdminLoggedIn = true;
      sessionStorage.setItem('mess_admin_logged_in', 'true');
      showToast('Admin logged in successfully', 'success');
      renderAdminPortal();
    } else {
      if (errBox) {
        errBox.innerText = data.message || 'Invalid administrator credentials';
        errBox.style.display = 'block';
      }
      showToast('Authentication failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to authentication server', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Sign In to Admin Dashboard →';
  }
}

function handleAdminLogout() {
  state.isAdminLoggedIn = false;
  sessionStorage.removeItem('mess_admin_logged_in');
  showToast('Logged out of Admin Portal', 'info');
  renderAdminPortal();
}

function switchAdminTab(tabName) {
  state.activeAdminTab = tabName;
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`atab-${tabName}`).classList.add('active');

  document.querySelectorAll('.admin-subview').forEach(v => v.classList.remove('active'));
  document.getElementById(`admin-subview-${tabName}`).classList.add('active');

  loadAdminData();
}

async function loadAdminData() {
  if (!state.isAdminLoggedIn) return;

  try {
    // 1. Stats & KPIs
    const statsRes = await apiFetch('/api/stats');
    const statsData = await statsRes.json();
    if (statsData.success) {
      renderAdminKPIs(statsData.data);
    }

    // 2. Menu Table
    const menuRes = await apiFetch('/api/menu');
    const menuData = await menuRes.json();
    if (menuData.success) {
      renderAdminMenuTable(menuData.data);
    }

    // 3. Feedback
    const fbRes = await apiFetch('/api/feedback');
    const fbData = await fbRes.json();
    if (fbData.success) {
      renderAdminFeedback(fbData.data);
    }

    // 4. Slots Table
    const slotsRes = await apiFetch('/api/slots');
    const slotsData = await slotsRes.json();
    if (slotsData.success) {
      renderAdminSlotsTable(slotsData.data);
    }

  } catch (err) {
    console.error('Error loading admin data', err);
  }
}

function renderAdminKPIs(stats) {
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

  setTxt('kpi-revenue', `₹${stats.totalRevenue}`);
  setTxt('kpi-revenue-split', `Paid: ₹${stats.paidRevenue || 0} • Pending: ₹${stats.pendingRevenue || 0}`);
  setTxt('kpi-total-orders', stats.totalOrders);
  setTxt('kpi-active-orders', stats.activeOrders);
  setTxt('kpi-rating', `${stats.avgRating} / 5`);
  setTxt('kpi-feedback-count', `Based on ${stats.totalFeedback} reviews`);

  // Popular items bars
  const popContainer = document.getElementById('popular-items-container');
  if (popContainer && stats.popularItems) {
    const maxCount = stats.popularItems.length > 0 ? stats.popularItems[0].count : 1;
    popContainer.innerHTML = stats.popularItems.map(item => {
      const pct = Math.round((item.count / maxCount) * 100);
      return `
        <div class="bar-row">
          <div class="bar-labels">
            <span><strong>${item.name}</strong></span>
            <span>${item.count} portions sold</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('') || '<p style="color: var(--text-muted);">No sales data yet.</p>';
  }

  // Status breakdown
  const statusContainer = document.getElementById('status-distribution-container');
  if (statusContainer && stats.statusCounts) {
    statusContainer.innerHTML = Object.entries(stats.statusCounts).map(([status, count]) => `
      <div class="status-stat-box">
        <span class="status-stat-label">${status}</span>
        <span class="status-stat-count">${count}</span>
      </div>
    `).join('');
  }
}

function renderAdminSlotsTable(slots) {
  const container = document.getElementById('admin-slots-table-container');
  if (!container) return;

  container.innerHTML = `
    <table class="slot-capacity-table">
      <thead>
        <tr>
          <th>Pickup Time Slot</th>
          <th>Capacity</th>
          <th>Active Booked</th>
          <th>Remaining Spots</th>
          <th>Slot Status</th>
        </tr>
      </thead>
      <tbody>
        ${slots.map(s => `
          <tr>
            <td><strong>${s.slot}</strong></td>
            <td>${s.capacity}</td>
            <td>${s.booked}</td>
            <td>${s.remaining}</td>
            <td>
              ${s.remaining > 0 ? '<span class="stock-tag in-stock">Available</span>' : '<span class="stock-tag out-stock">FULL</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAdminMenuTable(items) {
  const tbody = document.getElementById('admin-menu-tbody');
  if (!tbody) return;

  tbody.innerHTML = items.map(item => {
    const icon = getFoodIcon(item.image, item.category);
    return `
      <tr>
        <td>
          <div class="item-name-cell">
            <span class="item-table-icon">${icon}</span>
            <div class="item-table-meta">
              <strong>${item.name}</strong>
              <span>${item.prepTime || '8 mins'} • ${item.badge || 'Standard'}</span>
            </div>
          </div>
        </td>
        <td><span class="chip" style="font-size: 0.75rem;">${item.category}</span></td>
        <td><strong>₹${item.price}</strong></td>
        <td>
          <input type="number" value="${item.stock}" min="0" style="width: 60px; background: var(--bg-surface); color: #fff; border: 1px solid var(--border-card); padding: 4px 6px; border-radius: 4px;" onchange="updateStockQuick('${item.id}', this.value)">
        </td>
        <td>
          ${item.stock <= 0 ? '<span class="stock-tag out-stock">Sold Out</span>' : '<span class="stock-tag in-stock">Available</span>'}
        </td>
        <td>
          <label class="switch">
            <input type="checkbox" ${item.isAvailable && item.stock > 0 ? 'checked' : ''} onchange="toggleAvailability('${item.id}', this.checked)">
            <span class="slider"></span>
          </label>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group">
            <button class="btn btn-outline btn-sm" onclick="openEditMenuModal('${item.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteMenuItem('${item.id}', '${item.name}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminMenuTable() {
  const q = document.getElementById('admin-menu-search').value.toLowerCase();
  const rows = document.querySelectorAll('#admin-menu-tbody tr');
  rows.forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function toggleAvailability(id, isAvailable) {
  try {
    await apiFetch(`/api/menu/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable })
    });
    showToast('Menu item availability updated', 'info');
    loadMenu();
  } catch (err) {
    showToast('Failed to toggle availability', 'error');
  }
}

async function updateStockQuick(id, newStock) {
  try {
    await apiFetch(`/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: Number(newStock) })
    });
    showToast('Stock quantity updated', 'success');
    loadMenu();
    loadAdminData();
  } catch (err) {
    showToast('Failed to update stock', 'error');
  }
}

async function deleteMenuItem(id, name) {
  if (!confirm(`Are you sure you want to remove "${name}" from the mess menu?`)) return;
  try {
    const res = await apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Removed "${name}" from menu`, 'info');
      loadMenu();
      loadAdminData();
    }
  } catch (err) {
    showToast('Failed to delete item', 'error');
  }
}

// Menu Add/Edit Modal
function openAddMenuModal() {
  document.getElementById('menu-item-id').value = '';
  document.getElementById('menu-modal-title').innerText = 'Add New Menu Item';
  document.getElementById('menu-form').reset();
  document.getElementById('menu-modal-overlay').classList.add('active');
}

function openEditMenuModal(id) {
  const item = state.menuItems.find(i => i.id === id);
  if (!item) return;

  document.getElementById('menu-item-id').value = item.id;
  document.getElementById('menu-modal-title').innerText = 'Edit Menu Item';
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-category').value = item.category;
  document.getElementById('item-price').value = item.price;
  document.getElementById('item-stock').value = item.stock;
  document.getElementById('item-preptime').value = item.prepTime || '8 mins';
  document.getElementById('item-badge').value = item.badge || '';
  document.getElementById('item-desc').value = item.description || '';

  document.getElementById('menu-modal-overlay').classList.add('active');
}

function closeMenuModal() {
  document.getElementById('menu-modal-overlay').classList.remove('active');
}

async function handleMenuFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('menu-item-id').value;
  const payload = {
    name: document.getElementById('item-name').value,
    category: document.getElementById('item-category').value,
    price: Number(document.getElementById('item-price').value),
    stock: Number(document.getElementById('item-stock').value),
    prepTime: document.getElementById('item-preptime').value,
    badge: document.getElementById('item-badge').value,
    description: document.getElementById('item-desc').value
  };

  try {
    let res;
    if (id) {
      res = await apiFetch(`/api/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiFetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (data.success) {
      showToast(id ? 'Menu item updated' : 'Menu item added', 'success');
      closeMenuModal();
      loadMenu();
      loadAdminData();
    } else {
      showToast(data.message || 'Error saving item', 'error');
    }
  } catch (err) {
    showToast('Failed to save menu item', 'error');
  }
}

function renderAdminFeedback(feedback) {
  const container = document.getElementById('admin-feedback-container');
  const countBadge = document.getElementById('admin-feedback-total');
  if (!container) return;

  if (countBadge) countBadge.innerText = `${feedback.length} Reviews`;

  if (feedback.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No feedback submitted yet.</p>';
    return;
  }

  container.innerHTML = feedback.map(fb => `
    <div class="fb-card">
      <div class="fb-card-top">
        <span class="fb-student-title">${fb.studentName}</span>
        <span class="fb-stars-display">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</span>
      </div>
      <p class="fb-comment-text">"${fb.comment || 'Great experience!'}"</p>
      <div class="fb-meta-bottom">
        <span>Token: <strong>#${fb.orderToken}</strong></span>
        <span>${new Date(fb.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// 10. TOAST NOTIFICATIONS HELPER
// ==========================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    error: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span>${icons[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ==========================================================================
// 11. AI VOICE ASSISTANT ENGINE (Web Speech API + Natural Speech Synthesis)
// ==========================================================================

const voiceState = {
  recognition: null,
  isListening: false,
  isSupported: false,
  speechFeedback: true,
  isPaused: false
};

function initVoiceAssistant() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not available in this browser. Fallback simulation enabled.');
    voiceState.isSupported = false;
    return;
  }

  try {
    voiceState.recognition = new SpeechRecognition();
    voiceState.recognition.continuous = false;
    voiceState.recognition.interimResults = true;
    voiceState.recognition.lang = 'en-IN'; // Optimized for Indian English & bilingual terms like Dosa, Pav, etc.
    voiceState.isSupported = true;

    voiceState.recognition.onstart = () => {
      voiceState.isListening = true;
      voiceState.isPaused = false;
      updateVoiceAssistantUIState('listening');
    };

    voiceState.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const displayTranscript = finalTranscript || interimTranscript;
      const transcriptBox = document.getElementById('vac-transcript-box');
      if (transcriptBox && displayTranscript) {
        transcriptBox.innerText = `"${displayTranscript}"`;
        transcriptBox.classList.add('has-speech');
      }

      if (finalTranscript) {
        processVoiceCommand(finalTranscript.trim());
      }
    };

    voiceState.recognition.onerror = (event) => {
      console.warn('Voice recognition event:', event.error);
      if (event.error === 'no-speech') {
        const transcriptBox = document.getElementById('vac-transcript-box');
        if (transcriptBox) transcriptBox.innerText = '"No speech detected. Tap sample chip or speak clearly."';
      } else if (event.error === 'not-allowed') {
        showToast('Microphone access blocked. Click any suggestion chip below to test!', 'error');
      }
      updateVoiceAssistantUIState('idle');
    };

    voiceState.recognition.onend = () => {
      voiceState.isListening = false;
      const overlay = document.getElementById('voice-assistant-overlay');
      if (overlay && overlay.classList.contains('active') && !voiceState.isPaused) {
        updateVoiceAssistantUIState('idle');
      }
    };
  } catch (err) {
    console.warn('Error setting up SpeechRecognition:', err);
    voiceState.isSupported = false;
  }
}

function openVoiceAssistantModal() {
  const overlay = document.getElementById('voice-assistant-overlay');
  if (!overlay) return;

  overlay.classList.add('active');
  updateVoiceAssistantUIState('listening');

  const transcriptBox = document.getElementById('vac-transcript-box');
  if (transcriptBox) {
    transcriptBox.innerText = '"Say \'Add 2 Masala Dosa\' or \'Show Beverages\'..."';
    transcriptBox.classList.remove('has-speech');
  }

  // Start speech recognition if supported
  if (voiceState.isSupported && voiceState.recognition) {
    try {
      voiceState.recognition.start();
    } catch (e) {
      // Already running
    }
  } else {
    const statusText = document.getElementById('vac-status-text');
    if (statusText) statusText.innerText = 'Voice Assistant Ready (Tap a command)';
  }
}

function closeVoiceAssistantModal() {
  const overlay = document.getElementById('voice-assistant-overlay');
  if (!overlay) return;

  overlay.classList.remove('active');
  if (voiceState.recognition && voiceState.isListening) {
    try {
      voiceState.recognition.stop();
    } catch (e) {}
  }
  voiceState.isListening = false;
}

function handleVoiceOverlayClick(e) {
  if (e.target.id === 'voice-assistant-overlay') {
    closeVoiceAssistantModal();
  }
}

function toggleSpeechRecording() {
  const btnIcon = document.getElementById('vac-mic-btn-icon');
  const toggleBtn = document.getElementById('vac-mic-toggle-btn');

  if (voiceState.isListening) {
    voiceState.isPaused = true;
    if (voiceState.recognition) {
      try { voiceState.recognition.stop(); } catch (e) {}
    }
    voiceState.isListening = false;
    updateVoiceAssistantUIState('idle');
    if (btnIcon) btnIcon.innerText = '▶️ Resume Listening';
    if (toggleBtn) toggleBtn.classList.add('resume-mode');
  } else {
    voiceState.isPaused = false;
    updateVoiceAssistantUIState('listening');
    if (btnIcon) btnIcon.innerText = '⏹️ Pause Listening';
    if (toggleBtn) toggleBtn.classList.remove('resume-mode');

    if (voiceState.isSupported && voiceState.recognition) {
      try { voiceState.recognition.start(); } catch (e) {}
    }
  }
}

function toggleVoiceSpeechFeedback() {
  voiceState.speechFeedback = !voiceState.speechFeedback;
  const icon = document.getElementById('vac-mute-icon');
  if (icon) {
    icon.innerText = voiceState.speechFeedback ? '🔊' : '🔇';
  }
  showToast(`Voice assistant speech reply ${voiceState.speechFeedback ? 'Enabled' : 'Muted'}`, 'info');
}

function updateVoiceAssistantUIState(uiState) {
  const orb = document.getElementById('vac-orb');
  const statusText = document.getElementById('vac-status-text');

  if (uiState === 'listening') {
    if (orb) {
      orb.classList.add('listening');
      orb.classList.remove('processing');
    }
    if (statusText) statusText.innerText = 'Listening... Speak now 🎙️';
  } else if (uiState === 'processing') {
    if (orb) {
      orb.classList.remove('listening');
      orb.classList.add('processing');
    }
    if (statusText) statusText.innerText = 'Processing command... ✨';
  } else {
    if (orb) {
      orb.classList.remove('listening');
      orb.classList.remove('processing');
    }
    if (statusText) statusText.innerText = 'Tap mic or click a suggestion below';
  }
}

function speakVoiceResponse(text) {
  if (!voiceState.speechFeedback || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis warning:', err);
  }
}

function executeSimulatedVoiceCommand(commandText) {
  const transcriptBox = document.getElementById('vac-transcript-box');
  if (transcriptBox) {
    transcriptBox.innerText = `"${commandText}"`;
    transcriptBox.classList.add('has-speech');
  }

  processVoiceCommand(commandText);
}

function processVoiceCommand(rawTranscript) {
  const transcript = rawTranscript.toLowerCase().trim();
  updateVoiceAssistantUIState('processing');

  // 1. Check for Cart Actions
  if (transcript.includes('open cart') || transcript.includes('view cart') || transcript.includes('show cart') || transcript.includes('cart dikhao')) {
    openCartDrawer();
    speakVoiceResponse('Opening your cart.');
    finishVoiceCommand(`Opened Cart (${state.cart.length} items)`);
    return;
  }

  if (transcript.includes('close cart')) {
    closeCartDrawer();
    speakVoiceResponse('Closing cart.');
    finishVoiceCommand('Closed Cart');
    return;
  }

  if (transcript.includes('clear cart') || transcript.includes('empty cart') || transcript.includes('delete cart')) {
    state.cart = [];
    saveCart();
    updateCartUI();
    renderMenu();
    speakVoiceResponse('Your cart has been cleared.');
    finishVoiceCommand('Cart Cleared');
    return;
  }

  if (transcript.includes('checkout') || transcript.includes('place order')) {
    openCartDrawer();
    openCheckoutModal();
    speakVoiceResponse('Opening checkout form.');
    finishVoiceCommand('Opening Checkout Modal');
    return;
  }

  // 2. Check for View Navigation
  if (transcript.includes('menu') || transcript.includes('food')) {
    switchView('student');
    speakVoiceResponse('Showing food menu.');
    finishVoiceCommand('Navigated to Menu');
    return;
  }

  if (transcript.includes('track') || transcript.includes('status')) {
    const tokenMatch = transcript.match(/(?:yr-?)?(\d{4})/i);
    switchView('tracking');
    if (tokenMatch) {
      const fullToken = 'YR-' + tokenMatch[1];
      const trackInput = document.getElementById('tracking-token-input');
      if (trackInput) trackInput.value = fullToken;
      lookupOrderByToken(fullToken);
      speakVoiceResponse(`Tracking order token ${fullToken}.`);
      finishVoiceCommand(`Tracking Token #${fullToken}`);
    } else {
      speakVoiceResponse('Opening live order tracker.');
      finishVoiceCommand('Navigated to Live Tracker');
    }
    return;
  }

  if (transcript.includes('review') || transcript.includes('feedback') || transcript.includes('rating')) {
    switchView('feedback');
    speakVoiceResponse('Viewing ratings and reviews.');
    finishVoiceCommand('Navigated to Reviews');
    return;
  }

  // 3. Check for Category Filter
  if (transcript.includes('breakfast') || transcript.includes('nashta')) {
    switchView('student');
    filterByCategory('Breakfast');
    speakVoiceResponse('Showing breakfast specials.');
    finishVoiceCommand('Filtered: Breakfast Specials');
    return;
  }

  if ((transcript.includes('snack') || transcript.includes('chaat')) && !transcript.includes('add')) {
    switchView('student');
    filterByCategory('Snacks');
    speakVoiceResponse('Showing delicious snacks.');
    finishVoiceCommand('Filtered: Snacks');
    return;
  }

  if (transcript.includes('meal') || transcript.includes('thali') && !transcript.includes('add') || transcript.includes('lunch') || transcript.includes('dinner')) {
    switchView('student');
    filterByCategory('Meals');
    speakVoiceResponse('Showing meals and thali dishes.');
    finishVoiceCommand('Filtered: Meals & Thali');
    return;
  }

  if ((transcript.includes('beverage') || transcript.includes('drink')) && !transcript.includes('add')) {
    switchView('student');
    filterByCategory('Beverages');
    speakVoiceResponse('Showing beverages and drinks.');
    finishVoiceCommand('Filtered: Beverages');
    return;
  }

  if (transcript.includes('dessert') || transcript.includes('sweet') || transcript.includes('mithai') || transcript.includes('ice cream')) {
    switchView('student');
    filterByCategory('Desserts');
    speakVoiceResponse('Showing desserts.');
    finishVoiceCommand('Filtered: Desserts');
    return;
  }

  if (transcript.includes('all') || transcript.includes('full menu') || transcript.includes('everything')) {
    switchView('student');
    filterByCategory('All');
    clearSearch();
    speakVoiceResponse('Showing all menu items.');
    finishVoiceCommand('Filtered: All Items');
    return;
  }

  // 4. Check for Adding Items ("Add 2 Masala Dosa", "Add Vada Pav", "Ek Chai add karo")
  let quantity = 1;
  const numMap = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
  };

  for (const [word, val] of Object.entries(numMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(transcript)) {
      quantity = val;
      break;
    }
  }

  // Search through available menu items
  let matchedItem = null;
  let bestScore = 0;

  for (const item of state.menuItems) {
    const itemNameLower = item.name.toLowerCase();
    if (transcript.includes(itemNameLower)) {
      matchedItem = item;
      bestScore = itemNameLower.length;
      break;
    }
    const words = itemNameLower.split(' ');
    for (const w of words) {
      if (w.length > 2 && transcript.includes(w)) {
        if (w.length > bestScore) {
          bestScore = w.length;
          matchedItem = item;
        }
      }
    }
  }

  if (matchedItem) {
    switchView('student');
    if (!matchedItem.isAvailable || matchedItem.stock <= 0) {
      speakVoiceResponse(`Sorry, ${matchedItem.name} is currently sold out.`);
      finishVoiceCommand(`Sold Out: ${matchedItem.name}`);
      return;
    }

    addToCart(matchedItem.id);
    if (quantity > 1) {
      for (let q = 1; q < quantity; q++) {
        updateCartQuantity(matchedItem.id, 1);
      }
    }

    speakVoiceResponse(`Added ${quantity > 1 ? quantity + ' ' : ''}${matchedItem.name} to your cart.`);
    finishVoiceCommand(`✅ Added ${quantity}× ${matchedItem.name} to Cart`);
    showToast(`Added ${quantity}× ${matchedItem.name} to Cart via Voice 🎙️`, 'success');
    return;
  }

  // 5. Default Fallback: Treat as Search
  switchView('student');
  const cleanSearch = transcript.replace(/search|find|show|look for|dhundo/gi, '').trim();
  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.value = cleanSearch;
    handleMenuSearch();
  }
  speakVoiceResponse(`Searching for ${cleanSearch}.`);
  finishVoiceCommand(`🔍 Searched: "${cleanSearch}"`);
}

function finishVoiceCommand(statusMessage) {
  const statusText = document.getElementById('vac-status-text');
  const orb = document.getElementById('vac-orb');
  if (statusText) statusText.innerText = statusMessage;
  if (orb) {
    orb.classList.remove('listening');
    orb.classList.add('processing');
  }

  setTimeout(() => {
    closeVoiceAssistantModal();
  }, 1700);
}
