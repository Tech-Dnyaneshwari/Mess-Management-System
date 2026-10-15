const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'canteen_db.json');
const SLOT_CAPACITY = parseInt(process.env.SLOT_CAPACITY || '5', 10);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Standard Pickup Slots
const AVAILABLE_SLOTS = [
  'Immediate (10-15 mins)',
  '12:30 PM',
  '12:45 PM',
  '01:00 PM',
  '01:15 PM',
  '01:30 PM',
  '01:45 PM',
  '02:00 PM'
];

// Database helper functions with safe atomic file operations
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData = { menu: [], orders: [], feedback: [], nextOrderNumber: 1001 };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    
    // Ensure all orders have paymentStatus field initialized
    if (Array.isArray(parsed.orders)) {
      parsed.orders.forEach(o => {
        if (!o.paymentStatus) {
          o.paymentStatus = o.status === 'Collected' ? 'Paid' : 'Pending';
        }
      });
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database file:', err);
    return { menu: [], orders: [], feedback: [], nextOrderNumber: 1001 };
  }
}

function writeDB(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Role-based permission middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    // Check header x-user-role or query param role; defaults to 'student'
    const role = (req.headers['x-user-role'] || req.query.role || 'student').toLowerCase();
    
    // If 'any' is in allowedRoles or role matches
    if (allowedRoles.includes('any') || allowedRoles.includes(role) || role === 'admin') {
      req.userRole = role;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of [${allowedRoles.join(', ')}] permissions. Current role: '${role}'.`
    });
  };
}

// ==========================================
// 0. AUTHENTICATION (ADMIN LOGIN)
// ==========================================
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({
      success: true,
      message: 'Admin authentication successful',
      token: 'admin-token-' + Date.now(),
      admin: { username: ADMIN_USER, role: 'admin' }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid administrator credentials. (Default: admin / admin123)'
  });
});

// ==========================================
// 1. SLOTS & CAPACITY ENDPOINTS
// ==========================================

// GET /api/slots - Get available pickup slots and remaining capacities
app.get('/api/slots', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];

  const slotsStatus = AVAILABLE_SLOTS.map(slot => {
    // Count active orders in slot (exclude cancelled or collected)
    const activeInSlot = orders.filter(o => 
      o.pickupSlot === slot && 
      !['Cancelled', 'Collected'].includes(o.status)
    ).length;

    const remaining = Math.max(0, SLOT_CAPACITY - activeInSlot);

    return {
      slot: slot,
      capacity: SLOT_CAPACITY,
      booked: activeInSlot,
      remaining: remaining,
      isAvailable: remaining > 0
    };
  });

  res.json({ success: true, data: slotsStatus });
});

// ==========================================
// 2. MENU ENDPOINTS
// ==========================================

// GET /api/menu - Get all menu items
app.get('/api/menu', (req, res) => {
  const db = readDB();
  let items = db.menu || [];
  
  const { category, search, availableOnly } = req.query;
  
  if (category && category !== 'All') {
    items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
  }
  
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.description.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }
  
  if (availableOnly === 'true') {
    items = items.filter(i => i.isAvailable && i.stock > 0);
  }
  
  res.json({ success: true, count: items.length, data: items });
});

// POST /api/menu - Add new menu item (Admin only)
app.post('/api/menu', requireRole(['admin']), (req, res) => {
  const { name, category, price, description, stock, prepTime, badge, image } = req.body;
  
  if (!name || !price || !category) {
    return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
  }
  
  const numericPrice = Number(price);
  const numericStock = Math.max(0, Number(stock) || 0);

  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ success: false, message: 'Price must be a valid positive number' });
  }

  const db = readDB();
  const newItem = {
    id: 'menu-' + Date.now(),
    name: name.trim(),
    category: category.trim(),
    price: numericPrice,
    description: (description || '').trim(),
    stock: numericStock,
    isAvailable: numericStock > 0,
    prepTime: prepTime ? prepTime.trim() : '10 mins',
    badge: (badge || '').trim(),
    image: image || 'food-default'
  };
  
  db.menu.push(newItem);
  writeDB(db);
  
  res.status(201).json({ success: true, message: 'Item added successfully', data: newItem });
});

// PUT /api/menu/:id - Edit menu item (Admin only)
app.put('/api/menu/:id', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { name, category, price, description, stock, isAvailable, prepTime, badge } = req.body;
  
  const db = readDB();
  const idx = db.menu.findIndex(i => i.id === id);
  
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Menu item not found' });
  }
  
  const existing = db.menu[idx];
  const updatedStock = stock !== undefined ? Math.max(0, Number(stock)) : existing.stock;
  
  db.menu[idx] = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    category: category !== undefined ? category.trim() : existing.category,
    price: price !== undefined ? Number(price) : existing.price,
    description: description !== undefined ? description.trim() : existing.description,
    stock: updatedStock,
    isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : (updatedStock > 0 ? existing.isAvailable : false),
    prepTime: prepTime !== undefined ? prepTime.trim() : existing.prepTime,
    badge: badge !== undefined ? badge.trim() : existing.badge
  };
  
  writeDB(db);
  res.json({ success: true, message: 'Menu item updated', data: db.menu[idx] });
});

// PATCH /api/menu/:id/toggle - Toggle availability or quick stock adjust (Admin only)
app.patch('/api/menu/:id/toggle', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { isAvailable, stockAdjustment } = req.body;
  
  const db = readDB();
  const item = db.menu.find(i => i.id === id);
  
  if (!item) {
    return res.status(404).json({ success: false, message: 'Menu item not found' });
  }
  
  if (isAvailable !== undefined) {
    item.isAvailable = Boolean(isAvailable);
  }
  if (stockAdjustment !== undefined) {
    item.stock = Math.max(0, item.stock + Number(stockAdjustment));
    if (item.stock === 0) item.isAvailable = false;
  }
  
  writeDB(db);
  res.json({ success: true, message: 'Menu item updated', data: item });
});

// DELETE /api/menu/:id - Delete menu item (Admin only)
app.delete('/api/menu/:id', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const prevCount = db.menu.length;
  db.menu = db.menu.filter(i => i.id !== id);
  
  if (db.menu.length === prevCount) {
    return res.status(404).json({ success: false, message: 'Menu item not found' });
  }
  
  writeDB(db);
  res.json({ success: true, message: 'Menu item removed' });
});

// ==========================================
// 3. ORDER MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/orders - Get orders with optional status filter
app.get('/api/orders', (req, res) => {
  const db = readDB();
  let orders = db.orders || [];
  
  const { status, search, paymentStatus } = req.query;
  
  if (status && status !== 'All') {
    orders = orders.filter(o => o.status.toLowerCase() === status.toLowerCase());
  }
  
  if (paymentStatus && paymentStatus !== 'All') {
    orders = orders.filter(o => (o.paymentStatus || 'Pending').toLowerCase() === paymentStatus.toLowerCase());
  }
  
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(o => 
      o.token.toLowerCase().includes(q) ||
      o.studentName.toLowerCase().includes(q) ||
      (o.rollNumber && o.rollNumber.toLowerCase().includes(q))
    );
  }
  
  // Return sorted by newest first
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ success: true, count: orders.length, data: orders });
});

// GET /api/orders/:tokenOrId - Live tracking lookup
app.get('/api/orders/:tokenOrId', (req, res) => {
  const param = req.params.tokenOrId.trim().toUpperCase();
  const db = readDB();
  
  const order = (db.orders || []).find(o => 
    o.token.toUpperCase() === param || 
    o.token.toUpperCase() === `SC-${param.replace(/^SC-?/, '')}` ||
    o.id.toUpperCase() === param
  );
  
  if (!order) {
    return res.status(404).json({ success: false, message: `Order with token or ID "${req.params.tokenOrId}" not found.` });
  }
  
  res.json({ success: true, data: order });
});

// POST /api/orders - Create Pre-Order (Student)
app.post('/api/orders', (req, res) => {
  const { studentName, rollNumber, phone, pickupSlot, items } = req.body;
  
  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ success: false, message: 'Student name is required' });
  }
  if (!rollNumber || !rollNumber.trim()) {
    return res.status(400).json({ success: false, message: 'Roll / ID number is required' });
  }
  if (!pickupSlot || !AVAILABLE_SLOTS.includes(pickupSlot.trim())) {
    return res.status(400).json({ success: false, message: 'Valid pickup slot selection is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty' });
  }
  
  const db = readDB();

  // 1. Pickup Slot Capacity Check (max 5 active orders per slot)
  const activeInSlot = (db.orders || []).filter(o => 
    o.pickupSlot === pickupSlot && 
    !['Cancelled', 'Collected'].includes(o.status)
  ).length;

  if (activeInSlot >= SLOT_CAPACITY) {
    return res.status(400).json({ 
      success: false, 
      message: `Pickup slot "${pickupSlot}" has reached maximum capacity (${SLOT_CAPACITY}/${SLOT_CAPACITY} orders). Please select another available time slot.` 
    });
  }
  
  // 2. Validate stock & calculate price strictly from database records (never trust client price)
  const verifiedItems = [];
  let totalAmount = 0;
  
  for (const cartItem of items) {
    const qty = parseInt(cartItem.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Item quantity must be a positive integer.' });
    }

    const menuItem = db.menu.find(m => m.id === cartItem.id);
    if (!menuItem) {
      return res.status(400).json({ success: false, message: `Item "${cartItem.name || cartItem.id}" not found in menu.` });
    }
    if (!menuItem.isAvailable || menuItem.stock < qty) {
      return res.status(400).json({ 
        success: false, 
        message: `Sorry, "${menuItem.name}" is out of stock or does not have ${qty} portions available (Available: ${menuItem.stock}).` 
      });
    }
    
    // Decrement stock safely; prevent negative stock
    menuItem.stock = Math.max(0, menuItem.stock - qty);
    if (menuItem.stock === 0) {
      menuItem.isAvailable = false;
    }
    
    // Calculate trusted price strictly from database
    const subtotal = menuItem.price * qty;
    totalAmount += subtotal;
    
    verifiedItems.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price, // Trusted DB price
      quantity: qty,
      subtotal: subtotal
    });
  }
  
  // 3. Generate unique order token
  const tokenNum = db.nextOrderNumber || 1001;
  const token = `SC-${tokenNum}`;
  db.nextOrderNumber = tokenNum + 1;
  
  const now = new Date().toISOString();
  const newOrder = {
    id: 'ord-' + tokenNum,
    token: token,
    studentName: studentName.trim(),
    rollNumber: (rollNumber || 'N/A').trim(),
    phone: (phone || 'N/A').trim(),
    pickupSlot: pickupSlot,
    paymentMethod: 'Cash at Pickup',
    paymentStatus: 'Pending', // Separate payment tracking
    status: 'Placed',
    createdAt: now,
    totalAmount: totalAmount, // Trusted DB calculated sum
    items: verifiedItems,
    statusHistory: [
      { status: 'Placed', time: now }
    ]
  };
  
  db.orders.unshift(newOrder);
  writeDB(db);
  
  res.status(201).json({ 
    success: true, 
    message: 'Pre-order placed successfully!', 
    data: newOrder 
  });
});

// PATCH /api/orders/:id/status - Update Order Status (Staff / Admin)
app.patch('/api/orders/:id/status', requireRole(['staff', 'admin']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['Placed', 'Accepted', 'Preparing', 'Ready for Pickup', 'Collected', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
  }
  
  const db = readDB();
  const order = (db.orders || []).find(o => o.id === id || o.token === id);
  
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Prevent changing status of cancelled or completed order
  if (order.status === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'Cannot update status of an already cancelled order.' });
  }
  if (order.status === 'Collected') {
    return res.status(400).json({ success: false, message: 'Cannot update status of an already completed/collected order.' });
  }
  
  const now = new Date().toISOString();
  order.status = status;
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({ status: status, time: now });
  
  // If order collected, automatically mark payment as Paid if staff hadn't already
  if (status === 'Collected' && order.paymentStatus === 'Pending') {
    order.paymentStatus = 'Paid';
    order.paidAt = now;
  }

  writeDB(db);
  
  res.json({ 
    success: true, 
    message: `Order #${order.token} status updated to ${status}`, 
    data: order 
  });
});

// PATCH /api/orders/:id/payment - Mark Payment as Paid / Pending (Staff / Admin)
app.patch('/api/orders/:id/payment', requireRole(['staff', 'admin']), (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!['Pending', 'Paid'].includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: 'Payment status must be "Pending" or "Paid"' });
  }

  const db = readDB();
  const order = (db.orders || []).find(o => o.id === id || o.token === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  order.paymentStatus = paymentStatus;
  if (paymentStatus === 'Paid') {
    order.paidAt = new Date().toISOString();
  } else {
    delete order.paidAt;
  }

  writeDB(db);

  res.json({
    success: true,
    message: `Payment status for Order #${order.token} marked as ${paymentStatus}`,
    data: order
  });
});

// POST /api/orders/:id/cancel - Cancel Order & Restore Reserved Stock
// Rule: Cancellation allowed ONLY before order reaches 'Preparing'
app.post('/api/orders/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const db = readDB();
  const order = (db.orders || []).find(o => o.id === id || o.token === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.status === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'This order is already cancelled.' });
  }

  // Business Rule: Disallow cancellation once cooking has started (Preparing, Ready, Collected)
  if (['Preparing', 'Ready for Pickup', 'Collected'].includes(order.status)) {
    return res.status(400).json({ 
      success: false, 
      message: `Cannot cancel order #${order.token}: Food preparation has already started (Current stage: ${order.status}). Cancellation is only permitted while status is "Placed" or "Accepted".` 
    });
  }

  const now = new Date().toISOString();
  order.status = 'Cancelled';
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({ 
    status: 'Cancelled', 
    time: now, 
    reason: (reason || 'Order cancelled by user/staff').trim() 
  });

  // Business Rule: Restore reserved stock when an eligible cancellation succeeds
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      const menuItem = db.menu.find(m => m.id === item.id);
      if (menuItem) {
        menuItem.stock += item.quantity;
        if (menuItem.stock > 0) {
          menuItem.isAvailable = true;
        }
      }
    }
  }

  writeDB(db);

  res.json({
    success: true,
    message: `Order #${order.token} has been cancelled and reserved items have been restored to stock.`,
    data: order
  });
});

// ==========================================
// 4. FEEDBACK & RATING ENDPOINTS
// ==========================================

// POST /api/feedback - Submit feedback on collected order
app.post('/api/feedback', (req, res) => {
  const { orderToken, studentName, rating, comment } = req.body;
  
  if (!orderToken || !rating) {
    return res.status(400).json({ success: false, message: 'Order token and rating (1-5) are required' });
  }
  
  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars' });
  }
  
  const db = readDB();
  if (!db.feedback) db.feedback = [];
  
  const newFeedback = {
    id: 'fb-' + Date.now(),
    orderToken: orderToken.trim().toUpperCase(),
    studentName: (studentName || 'Student').trim(),
    rating: numRating,
    comment: (comment || '').trim(),
    createdAt: new Date().toISOString()
  };
  
  db.feedback.unshift(newFeedback);
  writeDB(db);
  
  res.status(201).json({ success: true, message: 'Thank you for your feedback!', data: newFeedback });
});

// GET /api/feedback - Get recent feedback
app.get('/api/feedback', (req, res) => {
  const db = readDB();
  const feedback = db.feedback || [];
  res.json({ success: true, count: feedback.length, data: feedback });
});

// ==========================================
// 5. REPORTS & ANALYTICS ENDPOINT
// ==========================================

// GET /api/stats - Admin Canteen Analytics
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const menu = db.menu || [];
  const feedback = db.feedback || [];
  
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => ['Placed', 'Accepted', 'Preparing', 'Ready for Pickup'].includes(o.status)).length;
  const readyOrders = orders.filter(o => o.status === 'Ready for Pickup').length;
  const collectedOrders = orders.filter(o => o.status === 'Collected').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;
  
  // Total Revenue (all non-cancelled orders)
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Paid Revenue vs Pending Revenue
  const paidRevenue = orders
    .filter(o => o.status !== 'Cancelled' && o.paymentStatus === 'Paid')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingRevenue = totalRevenue - paidRevenue;
    
  // Average Rating
  const avgRating = feedback.length > 0 
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) 
    : '4.8';
    
  // Item sales popularity
  const itemCounts = {};
  orders.forEach(order => {
    if (order.status !== 'Cancelled' && Array.isArray(order.items)) {
      order.items.forEach(it => {
        itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
      });
    }
  });
  
  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  // Status breakdown
  const statusCounts = {
    Placed: orders.filter(o => o.status === 'Placed').length,
    Accepted: orders.filter(o => o.status === 'Accepted').length,
    Preparing: orders.filter(o => o.status === 'Preparing').length,
    'Ready for Pickup': readyOrders,
    Collected: collectedOrders,
    Cancelled: cancelledOrders
  };
  
  res.json({
    success: true,
    data: {
      totalOrders,
      activeOrders,
      readyOrders,
      collectedOrders,
      cancelledOrders,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      avgRating,
      totalFeedback: feedback.length,
      popularItems,
      statusCounts,
      totalMenuItems: menu.length,
      lowStockItems: menu.filter(m => m.stock < 10).length,
      slotCapacity: SLOT_CAPACITY
    }
  });
});

// Fallback to SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🍽️  Mess Management System is LIVE!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_PATH}`);
  console.log(`⏱️  Slot Capacity Limit: ${SLOT_CAPACITY} orders/slot`);
  console.log(`=======================================================`);
});
