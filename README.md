# Mess Management System
> Demonstrable, Production-Ready College Pre-Ordering & Mess Management System

---

## 🏛️ Project Architecture (100% Aligned with Presentation Slide 10)

```
                       ┌──────────────┐
                       │   STUDENT    │
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │  MOBILE APP  │
                       └──────┬───────┘
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼───────┐       ┌──────▼───────┐       ┌──────▼───────┐
│ MENU & PRICE │       │  PRE-ORDER   │       │   FEEDBACK   │
│     (₹)      │       │(Cart & Slot) │       │   & RATING   │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              │
                     ┌────────▼────────┐
                     │ORDER MANAGEMENT │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │    DATABASE     │
                     │ (canteen_db)    │
                     └────────┬────────┘
             ┌────────────────┴────────────────┐
             │                                 │
    ┌────────▼─────────┐              ┌────────▼────────┐
    │  CANTEEN STAFF   │              │ ADMIN DASHBOARD │
    │    DASHBOARD     │              └────────┬────────┘
    └────────┬─────────┘                       │
             │                        ┌────────▼────────┐
    ┌────────▼─────────┐              │    REPORTS /    │
    │  PREPARE ORDER   │              │    ANALYTICS    │
    └────────┬─────────┘              └─────────────────┘
             │
    ┌────────▼─────────┐
    │   ORDER STATUS   │ ───────────────┐
    └──────────────────┘                │ (Live Sync)
                                        │
                               ┌────────▼────────┐
                               │   STUDENT APP   │
                               │  (Live Tracker) │
                               └─────────────────┘
```

---

## 🛡️ Business Rules Implemented

| Rule | Implementation Details |
| :--- | :--- |
| **Trusted Price Calculation** | Order totals are calculated **strictly from trusted database records** in `server.js`. Any prices sent by the client are ignored. |
| **Negative Stock Prevention** | Stock is verified before checkout and decremented safely (`Math.max(0, stock - qty)`). Items with 0 stock are automatically marked as out of stock. |
| **Pickup Slot Capacity Checks** | Fixed capacity limit (default: 5 orders per slot via `SLOT_CAPACITY`). The API rejects orders when a slot is full, and the UI displays real-time remaining slot counts. |
| **Separate Payment Status** | Orders initialize with `paymentStatus: "Pending"` under Cash-at-Pickup. Canteen staff can independently verify and mark orders as `"Paid"`. |
| **Eligible Order Cancellation** | Orders can be cancelled **only before food preparation starts** (status `Placed` or `Accepted`). Once status reaches `Preparing`, cancellation is rejected. |
| **Automatic Stock Restoration** | When an eligible cancellation succeeds, all reserved item quantities are **automatically restored back to menu stock**. |
| **Role-Based Access Control** | Endpoints enforce role headers (`x-user-role`). Admin endpoints (menu CRUD) require `admin`, kitchen operations require `staff` or `admin`, and student features are open. |

---

## 🚀 Key Modules & Features

### 1. 📱 Student Experience (Mobile & Web App)
- **Menu & Price (₹)**: Categorized canteen items with real-time stock levels, preparation times, and instant search.
- **Pre-Order (Cart & Slot Selection)**: Dynamic cart slide-over with item quantity steppers, subtotal & grand total calculation, and slot selection with capacity hints (*e.g., "12:30 PM (3 spots left)"*).
- **Cash at Pickup Checkout**: Zero-hassle checkout generating a persistent unique token (e.g. `#SC-1005`).
- **Live Order Tracker (5-Stage Visual Stepper)**:
  $$\text{1. Placed} \longrightarrow \text{2. Accepted} \longrightarrow \text{3. Preparing} \longrightarrow \text{4. Ready for Pickup} \longrightarrow \text{5. Collected}$$
  with live polling sync every 4 seconds.
- **Order Cancellation**: Student can cancel their order if it hasn't reached `Preparing`.
- **Feedback & Rating**: Rate completed meals (1–5 stars) with comments upon collection.

### 2. 👨‍🍳 Canteen Kitchen Staff Dashboard
- **Live Kitchen Queue**: Real-time incoming pre-orders sorted chronologically.
- **Prepare Order Pipeline**: Quick action buttons advancing the preparation workflow:
  - `Accept Order 👍`
  - `Start Preparing 🍳`
  - `Mark Ready for Pickup 🔔`
  - `Hand Over & Collected 🎉`
- **Payment Verification**: Dedicated button to mark Cash Received (`Paid 💵`).
- **Staff Cancellation**: Allows staff to cancel orders in early stages and restore stock.

### 3. 📊 Admin Dashboard & Reports / Analytics
- **Executive KPIs**: Real-time cards for Today's Revenue (split into Paid vs Pending Cash), Total Orders, Active Queue, and Average Rating.
- **Reports & Analytics**: Visual bar charts for **Most Popular Canteen Items** and **Order Status Distribution**.
- **Menu & Inventory Management**: Add new dishes, edit prices, adjust stock quantities on the fly, and toggle item availability on/off.
- **Customer Reviews Feed**: Complete history of student ratings and comments.

---

## 💻 How to Run the Project Locally

### 1. Prerequisites
- **Node.js**: v18+ (verified on Node.js v24.14.1)
- **npm**: v9+ (verified on npm 11.11.0 via `npm.cmd`)

### 2. Launch the Application

```powershell
# Open terminal in project root:
cd "d:\Mess Management System"

# Install dependencies (only express and cors)
npm.cmd install

# Start the application server
npm.cmd start
# (or: node server.js)

# Access the system in your web browser:
# http://localhost:3000
```

---

## 📡 REST API Reference

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/slots` | Public | List pickup slots with capacity, booked, and remaining counts |
| `GET` | `/api/menu` | Public | List all menu items (filterable by category/search) |
| `POST` | `/api/menu` | `admin` | Add a new menu item |
| `PUT` | `/api/menu/:id` | `admin` | Update menu item details and stock |
| `PATCH`| `/api/menu/:id/toggle` | `admin` | Toggle availability or adjust stock |
| `DELETE`| `/api/menu/:id` | `admin` | Remove a menu item |
| `GET` | `/api/orders` | Public / Staff | Retrieve all orders (newest first) |
| `GET` | `/api/orders/:token` | Public | Lookup order by token for live tracking |
| `POST` | `/api/orders` | Public | Create pre-order with slot capacity & stock decrement |
| `PATCH`| `/api/orders/:id/status`| `staff`, `admin` | Advance status (`Placed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Collected`) |
| `PATCH`| `/api/orders/:id/payment`| `staff`, `admin` | Mark payment as `Paid` or `Pending` |
| `POST` | `/api/orders/:id/cancel`| Public / Staff | Cancel order before `Preparing` and restore stock |
| `GET` | `/api/stats` | `admin` | Analytics summary, revenue breakdown, and popular items |
| `POST` | `/api/feedback` | Public | Submit student rating & review on collected orders |
| `GET` | `/api/feedback` | Public / Admin | Retrieve student reviews list |

---

## 🎬 College Demo Workflow (For Tomorrow's Presentation)

1. **Student Pre-Order**:
   - Open `http://localhost:3000`
   - Select items from menu ➔ Open cart ➔ Click *Proceed to Checkout*
   - Pick time slot `12:45 PM` ➔ Submit order ➔ Receive unique token `#SC-XXXX`
2. **Cancellation & Stock Restoration (Demonstrating Business Rules)**:
   - On the Live Tracker, click *Cancel Order ✕*
   - Observe order marked as `Cancelled` and note that stock in menu is restored!
3. **Staff Preparation Workflow**:
   - Place a fresh order ➔ Switch to the **Kitchen Staff** tab in the navigation
   - Click **Accept Order** ➔ Click **Start Preparing** ➔ Click **Mark Cash Received (Paid)** ➔ Click **Mark Ready for Pickup**
4. **Live Synchronization**:
   - Switch back to **Live Tracker** ➔ Observe the 5-stage stepper automatically updated to `Ready` with `Payment: Paid ✅`!
5. **Collection & Review**:
   - In Staff Kiosk, click **Hand Over & Collected**
   - In Live Tracker, submit a 5-star rating and comment
6. **Admin Analytics**:
   - Switch to **Admin Portal** ➔ View updated revenue, top-selling items chart, and customer review.
