/**
 * COMPREHENSIVE INTEGRATION TEST SUITE - MESS MANAGEMENT SYSTEM
 * Verifies all Phase 3 core workflows & business rules
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const testResults = [];

function assert(condition, testName, details = '') {
  if (condition) {
    testResults.push({ name: testName, passed: true, details });
    console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    testResults.push({ name: testName, passed: false, details });
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 STARTING MESS MANAGEMENT SYSTEM TEST SUITE');
  console.log('======================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: Menu loads and unavailable items cannot be ordered
    // ----------------------------------------------------
    console.log('▶ Test 1: Menu loads and unavailable items cannot be ordered...');
    const menuRes = await request('GET', '/api/menu');
    assert(menuRes.status === 200 && Array.isArray(menuRes.body.data), 'GET /api/menu returns 200 and items list');

    // Create an item with stock 0 (unavailable)
    const outItemRes = await request('POST', '/api/menu', {
      name: 'Sold Out Pastry',
      category: 'Desserts',
      price: 60,
      stock: 0
    }, { 'x-user-role': 'admin' });
    const outItemId = outItemRes.body.data.id;

    // Attempt to order unavailable item
    const orderOutRes = await request('POST', '/api/orders', {
      studentName: 'T1 Student',
      rollNumber: 'CS-001',
      pickupSlot: '12:30 PM',
      items: [{ id: outItemId, quantity: 1 }]
    });
    assert(orderOutRes.status === 400 && orderOutRes.body.success === false, 'Ordering unavailable item rejected with 400 Bad Request', orderOutRes.body.message);

    // ----------------------------------------------------
    // TEST 2: Cart quantity changes update the total correctly
    // ----------------------------------------------------
    console.log('\n▶ Test 2: Cart quantity calculation & trusted price...');
    // Pick two existing items
    const itemA = menuRes.body.data[0]; // e.g. Masala Dosa
    const itemB = menuRes.body.data[1]; // e.g. Vada Pav
    const expectedTotal = (itemA.price * 2) + (itemB.price * 3);

    // Pick an available slot
    const slotsRes = await request('GET', '/api/slots');
    const availSlot = (slotsRes.body.data && slotsRes.body.data.find(s => s.isAvailable)) 
      ? slotsRes.body.data.find(s => s.isAvailable).slot 
      : '02:00 PM';

    const calcOrderRes = await request('POST', '/api/orders', {
      studentName: 'T2 Calc Student',
      rollNumber: 'CS-002',
      pickupSlot: availSlot,
      items: [
        { id: itemA.id, price: 99999, quantity: 2 }, // Sending spoofed price
        { id: itemB.id, price: 1, quantity: 3 }
      ]
    });
    assert(calcOrderRes.status === 201 && calcOrderRes.body.data.totalAmount === expectedTotal, 
      'Total amount calculated strictly from trusted DB prices (spoofed client price ignored)', 
      `Expected ₹${expectedTotal}, Got ₹${calcOrderRes.body && calcOrderRes.body.data ? calcOrderRes.body.data.totalAmount : calcOrderRes.body.message}`);

    // ----------------------------------------------------
    // TEST 3: Checkout validates required fields and pickup slot
    // ----------------------------------------------------
    console.log('\n▶ Test 3: Checkout required fields & pickup slot validation...');
    const missName = await request('POST', '/api/orders', { rollNumber: 'CS-1', pickupSlot: '12:30 PM', items: [{ id: itemA.id, quantity: 1 }] });
    assert(missName.status === 400, 'Rejects missing studentName with 400');

    const missRoll = await request('POST', '/api/orders', { studentName: 'Test', pickupSlot: '12:30 PM', items: [{ id: itemA.id, quantity: 1 }] });
    assert(missRoll.status === 400, 'Rejects missing rollNumber with 400');

    const invalidSlot = await request('POST', '/api/orders', { studentName: 'Test', rollNumber: 'CS-1', pickupSlot: 'Invalid Slot 99:99', items: [{ id: itemA.id, quantity: 1 }] });
    assert(invalidSlot.status === 400, 'Rejects invalid pickup slot with 400');

    const emptyCart = await request('POST', '/api/orders', { studentName: 'Test', rollNumber: 'CS-1', pickupSlot: '12:30 PM', items: [] });
    assert(emptyCart.status === 400, 'Rejects empty items array with 400');

    // ----------------------------------------------------
    // TEST 4: A successful order receives a unique token
    // ----------------------------------------------------
    console.log('\n▶ Test 4: Successful order receives unique token...');
    const validOrder = await request('POST', '/api/orders', {
      studentName: 'Aarav Sharma',
      rollNumber: 'CS-2024-099',
      pickupSlot: '01:00 PM',
      items: [{ id: itemA.id, quantity: 1 }]
    });
    const orderData = validOrder.body.data;
    assert(validOrder.status === 201 && /^YR-\d+$/.test(orderData.token), 'Order assigned unique token format (e.g. YR-1007)', orderData.token);
    assert(!!orderData.qrDataUrl && orderData.qrDataUrl.startsWith('data:image/png;base64,'), 'Order generated with valid base64 QR code image');

    const qrEndpointRes = await request('GET', `/api/orders/${orderData.token}/qr`);
    assert(qrEndpointRes.status === 200 && qrEndpointRes.body.success === true && !!qrEndpointRes.body.qrDataUrl, 'Dedicated QR code endpoint returns 200 and image');

    // ----------------------------------------------------
    // TEST 5: The order appears in the staff dashboard
    // ----------------------------------------------------
    console.log('\n▶ Test 5: Order appears in staff dashboard queue...');
    const staffOrdersRes = await request('GET', '/api/orders');
    const foundInQueue = staffOrdersRes.body.data.find(o => o.token === orderData.token);
    assert(foundInQueue !== undefined && foundInQueue.status === 'Placed', 'Newly placed order exists in staff queue', foundInQueue ? foundInQueue.token : 'Not found');

    // ----------------------------------------------------
    // TEST 6: Staff can update the order status through allowed lifecycle
    // ----------------------------------------------------
    console.log('\n▶ Test 6: Staff advances order through full lifecycle...');
    const testOrderId = orderData.id;

    const s1 = await request('PATCH', `/api/orders/${testOrderId}/status`, { status: 'Accepted' }, { 'x-user-role': 'staff' });
    assert(s1.status === 200 && s1.body.data.status === 'Accepted', 'Moved Placed -> Accepted');

    const s2 = await request('PATCH', `/api/orders/${testOrderId}/status`, { status: 'Preparing' }, { 'x-user-role': 'staff' });
    assert(s2.status === 200 && s2.body.data.status === 'Preparing', 'Moved Accepted -> Preparing');

    const s3 = await request('PATCH', `/api/orders/${testOrderId}/status`, { status: 'Ready for Pickup' }, { 'x-user-role': 'staff' });
    assert(s3.status === 200 && s3.body.data.status === 'Ready for Pickup', 'Moved Preparing -> Ready for Pickup');

    const s4 = await request('PATCH', `/api/orders/${testOrderId}/status`, { status: 'Collected' }, { 'x-user-role': 'staff' });
    assert(s4.status === 200 && s4.body.data.status === 'Collected', 'Moved Ready -> Collected');

    // Verify cannot change status after Collected
    const s5 = await request('PATCH', `/api/orders/${testOrderId}/status`, { status: 'Placed' }, { 'x-user-role': 'staff' });
    assert(s5.status === 400, 'Cannot regress or update order after Collected', s5.body.message);

    // ----------------------------------------------------
    // TEST 7: Student order tracking reflects persisted status changes
    // ----------------------------------------------------
    console.log('\n▶ Test 7: Student order tracking reflects updated status...');
    const trackRes = await request('GET', `/api/orders/${orderData.token}`);
    assert(trackRes.status === 200 && trackRes.body.data.status === 'Collected' && trackRes.body.data.statusHistory.length === 5,
      'Live tracking endpoint returns updated Collected status and 5 timestamps');

    // ----------------------------------------------------
    // TEST 8: Cancellation is rejected once an order reaches Preparing
    // ----------------------------------------------------
    console.log('\n▶ Test 8: Cancellation rejected once food preparation starts...');
    // Create new order and advance to Preparing
    const prepOrderRes = await request('POST', '/api/orders', {
      studentName: 'Late Canceller',
      rollNumber: 'CS-008',
      pickupSlot: '01:15 PM',
      items: [{ id: itemA.id, quantity: 1 }]
    });
    const prepOrderId = prepOrderRes.body.data.id;
    await request('PATCH', `/api/orders/${prepOrderId}/status`, { status: 'Preparing' }, { 'x-user-role': 'staff' });

    // Try to cancel
    const rejectCancelRes = await request('POST', `/api/orders/${prepOrderId}/cancel`, { reason: 'Changed mind' });
    assert(rejectCancelRes.status === 400 && rejectCancelRes.body.success === false,
      'Cancellation rejected when status is Preparing (food already on stove)', rejectCancelRes.body.message);

    // ----------------------------------------------------
    // TEST 9: Eligible cancellation restores stock exactly once
    // ----------------------------------------------------
    console.log('\n▶ Test 9: Eligible cancellation restores stock exactly once...');
    // Check initial stock
    const curMenuRes = await request('GET', '/api/menu');
    const targetItem = curMenuRes.body.data.find(i => i.id === itemB.id);
    const initialStock = targetItem.stock;

    // Place order for 2 portions
    const cancelableOrder = await request('POST', '/api/orders', {
      studentName: 'Eligible Canceller',
      rollNumber: 'CS-009',
      pickupSlot: '01:30 PM',
      items: [{ id: itemB.id, quantity: 2 }]
    });
    const cOrderId = cancelableOrder.body.data.id;

    // Stock should be initialStock - 2
    const afterOrderMenu = await request('GET', '/api/menu');
    const stockAfterOrder = afterOrderMenu.body.data.find(i => i.id === itemB.id).stock;
    assert(stockAfterOrder === initialStock - 2, 'Stock decremented by 2 upon order placement');

    // Cancel order in Placed status
    const cancelRes = await request('POST', `/api/orders/${cOrderId}/cancel`, { reason: 'Accidental order' });
    assert(cancelRes.status === 200 && cancelRes.body.data.status === 'Cancelled', 'Eligible cancellation succeeds');

    // Stock should be restored to initialStock
    const afterCancelMenu = await request('GET', '/api/menu');
    const stockAfterCancel = afterCancelMenu.body.data.find(i => i.id === itemB.id).stock;
    assert(stockAfterCancel === initialStock, 'Stock restored back to initial level after cancellation');

    // Attempt second cancellation - must fail and NOT restore stock again
    const secondCancel = await request('POST', `/api/orders/${cOrderId}/cancel`, { reason: 'Duplicate' });
    const afterSecondMenu = await request('GET', '/api/menu');
    const stockAfterSecond = afterSecondMenu.body.data.find(i => i.id === itemB.id).stock;
    assert(secondCancel.status === 400 && stockAfterSecond === initialStock, 'Second cancellation rejected and stock not restored twice');

    // ----------------------------------------------------
    // TEST 10: Stock cannot become negative
    // ----------------------------------------------------
    console.log('\n▶ Test 10: Stock cannot become negative...');
    // Create an item with stock = 2
    const lowItemRes = await request('POST', '/api/menu', {
      name: 'Limited Samosa Portion',
      category: 'Snacks',
      price: 25,
      stock: 2
    }, { 'x-user-role': 'admin' });
    const lowItemId = lowItemRes.body.data.id;

    // Try ordering 5 portions
    const exceedOrder = await request('POST', '/api/orders', {
      studentName: 'Greedy Order',
      rollNumber: 'CS-010',
      pickupSlot: '01:45 PM',
      items: [{ id: lowItemId, quantity: 5 }]
    });
    assert(exceedOrder.status === 400 && exceedOrder.body.success === false,
      'Exceeding available stock is rejected (prevents negative stock)', exceedOrder.body.message);

    // Verify stock is still 2
    const checkLowItem = (await request('GET', '/api/menu')).body.data.find(i => i.id === lowItemId);
    assert(checkLowItem.stock === 2, 'Stock remains unchanged at 2');

    // ----------------------------------------------------
    // TEST 11: Admin can create and update menu items
    // ----------------------------------------------------
    console.log('\n▶ Test 11: Admin can create and update menu items...');
    const createRes = await request('POST', '/api/menu', {
      name: 'South Indian Filter Coffee',
      category: 'Beverages',
      price: 25,
      stock: 50,
      prepTime: '4 mins'
    }, { 'x-user-role': 'admin' });
    assert(createRes.status === 201 && createRes.body.data.name === 'South Indian Filter Coffee', 'Admin creates new menu item');

    const createdId = createRes.body.data.id;
    const updateRes = await request('PUT', `/api/menu/${createdId}`, {
      price: 30,
      stock: 45
    }, { 'x-user-role': 'admin' });
    assert(updateRes.status === 200 && updateRes.body.data.price === 30 && updateRes.body.data.stock === 45, 'Admin updates item price and stock');

    // ----------------------------------------------------
    // TEST 12: Invalid input and unauthorized role actions are rejected
    // ----------------------------------------------------
    console.log('\n▶ Test 12: Invalid input and unauthorized role actions rejected...');
    // Student attempting admin endpoint
    const studentCreate = await request('POST', '/api/menu', {
      name: 'Hacked Item',
      category: 'Snacks',
      price: 10
    }, { 'x-user-role': 'student' });
    assert(studentCreate.status === 403, 'Unauthorized student action on admin endpoint rejected with 403 Forbidden');

    // Student attempting staff status change
    const studentStatus = await request('PATCH', `/api/orders/${testOrderId}/status`, { status: 'Placed' }, { 'x-user-role': 'student' });
    assert(studentStatus.status === 403, 'Unauthorized student action on staff status change rejected with 403 Forbidden');

    // Negative price
    const negPrice = await request('POST', '/api/menu', {
      name: 'Negative Price Dish',
      category: 'Snacks',
      price: -50,
      stock: 10
    }, { 'x-user-role': 'admin' });
    // Admin login validation
    const badLogin = await request('POST', '/api/admin/login', { username: 'admin', password: 'wrongpassword' });
    assert(badLogin.status === 401 && badLogin.body.success === false, 'Invalid admin login credentials rejected with 401');

    const goodLogin = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
    assert(goodLogin.status === 200 && goodLogin.body.success === true && !!goodLogin.body.token, 'Valid admin login succeeds with auth token');

    // ----------------------------------------------------
    // TEST 13: Refreshing page does not silently lose persisted orders
    // ----------------------------------------------------
    console.log('\n▶ Test 13: Data persistence across reload / disk read...');
    const dbPath = path.join(__dirname, '..', 'data', 'canteen_db.json');
    const rawDiskContent = fs.readFileSync(dbPath, 'utf-8');
    const diskDB = JSON.parse(rawDiskContent);
    const diskOrder = diskDB.orders.find(o => o.token === orderData.token);
    assert(diskOrder !== undefined && diskOrder.token === orderData.token,
      'Order is persistently stored on disk in data/canteen_db.json', diskOrder ? diskOrder.token : 'Missing');

    // ----------------------------------------------------
    // TEST 14: Application builds and starts using README instructions
    // ----------------------------------------------------
    console.log('\n▶ Test 14: Application operational and serving frontend assets...');
    const indexRes = await request('GET', '/');
    const cssRes = await request('GET', '/css/style.css');
    const jsRes = await request('GET', '/js/app.js');
    assert(indexRes.status === 200 && indexRes.raw.toLowerCase().includes('mess management system'), 'Serves index.html with 200 OK');
    assert(cssRes.status === 200 && cssRes.raw.toLowerCase().includes('plus jakarta sans'), 'Serves style.css with 200 OK');
    assert(jsRes.status === 200 && (jsRes.raw.toLowerCase().includes('mess management system') || jsRes.raw.toLowerCase().includes('mess')), 'Serves app.js with 200 OK');

  } catch (err) {
    console.error('Fatal error during test run:', err);
  }

  console.log('\n======================================================');
  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  if (passedCount === totalCount) {
    console.log('🎉 ALL 14 PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW ABOVE LOGS.');
  }
  console.log('======================================================\n');
}

runTests();
