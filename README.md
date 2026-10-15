# Smart Canteen & Mess Management System
> Production-Ready College Pre-Ordering, Kitchen Pipeline Automation & Autonomous Voice AI Copilot (Yulu AI)

[![Tests Status](https://img.shields.io/badge/Tests-34%2F34%20PASSED-brightgreen.svg)](tests/run_tests.js)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](package.json)

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Actual Technology Stack](#-actual-technology-stack)
3. [System Architecture](#-system-architecture)
4. [Enforced Business Rules](#-enforced-business-rules)
5. [Key Modules & Features](#-key-modules--features)
6. [Prerequisites & Environment Variables](#-prerequisites--environment-variables)
7. [Database Setup](#-database-setup)
8. [Installation & Startup Commands](#-installation--startup-commands)
9. [Running Automated Tests](#-running-automated-tests)
10. [REST API Reference](#-rest-api-reference)
11. [Current System Limitations](#-current-system-limitations)
12. [College CEP Submission Dossier](#-college-cep-submission-dossier)

---

## 🏛️ Project Overview
The **Smart Canteen & Mess Management System** is a full-stack web application engineered to solve peak-hour cafeteria bottlenecks in higher education institutions and corporate environments. During short 15–30 minute college breaks, physical ordering counters suffer from severe crowding, untracked cash exchanges, delayed food preparation, and meal collection chaos.

This platform introduces an asynchronous, slot-throttled pre-ordering workflow where students schedule their meals across capacity-governed pickup slots (default: 5 orders/slot), receive verified alphanumeric tokens (`#YR-XXXX`) with scannable base64 QR code vouchers, and track real-time preparation through a 5-stage kitchen pipeline (`Placed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready for Pickup` ➔ `Collected`).

Additionally, the project integrates **Yulu AI**, an in-browser voice assistant and autonomous ordering copilot that performs budget reasoning (under ₹50, ₹100, ₹150), rush meal identification (<5 mins prep), and post-workout nutritional breakdowns (~24g protein) with 1-shot voice ordering.

---

## 💻 Actual Technology Stack

The project intentionally avoids heavy frontend frameworks and third-party SaaS dependencies to remain lightweight, verifiable, and zero-configuration:

| Layer | Technology / Library | Purpose in Project |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+) | Server-side execution and event loop |
| **HTTP Web Server** | Express.js (`v4.21.2`) | RESTful API routing, static file serving, role middleware |
| **Cross-Origin Security** | CORS (`v2.8.5`) | Cross-origin request security |
| **QR Code Engine** | `qrcode` (`v1.5.4`) | Server-side base64 PNG QR code voucher generation |
| **Database Tier** | File-based Atomic JSON (`data/canteen_db.json`) | Persistent single-source-of-truth document database |
| **Frontend Structure** | Semantic HTML5 | Component layout, accessibility, and SEO structure |
| **Styling & Design** | Vanilla CSS3 (Custom Design System) | Glassmorphism UI, glowing neon tokens, responsive grid, dynamic cursor |
| **Frontend Logic** | Vanilla ES6+ JavaScript | State management, live polling (4s), DOM updates, audio synthesis |
| **Voice AI / Speech** | W3C Web Speech API (`SpeechRecognition` / `speechSynthesis`) | Voice command processing and audio feedback in Yulu AI |
| **Audio Synthesis** | HTML5 Web Audio API | Synthesized sound chimes for orders, mic toggle, and status alerts |
| **Testing Harness** | Native Node.js HTTP Assertion Suite (`tests/run_tests.js`) | Automated end-to-end integration testing (34 assertions) |

---

## 📐 System Architecture

```
                       ┌──────────────┐
                       │   STUDENT    │
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │  BROWSER SPA │ ◄────────► [ YULU AI VOICE COPILOT ]
                       └──────┬───────┘            (Budget, Speed, Fitness Reasoning)
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
                     │ REST API SERVER │
                     │   (server.js)   │
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
    │  (5-Stage Queue) │                       │
    └────────┬─────────┘              ┌────────▼────────┐
             │                        │    REPORTS /    │
    ┌────────▼─────────┐              │    ANALYTICS    │
    │  PREPARE ORDER   │              └─────────────────┘
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │   ORDER STATUS   │ ───────────────┐
    └──────────────────┘                │ (Live Sync Polling)
                                        │
                               ┌────────▼────────┐
                               │   STUDENT APP   │
                               │  (Live Tracker) │
                               └─────────────────┘
```

---

## 🛡️ Enforced Business Rules

| Business Rule | Implementation Details in `server.js` |
| :--- | :--- |
| **Trusted Price Calculation** | Order totals are calculated **strictly from trusted database prices**. Any prices passed by client payloads are ignored to prevent tampering. |
| **Pickup Slot Capacity Checks** | Each pickup slot enforces a fixed capacity (`SLOT_CAPACITY = 5`). If a slot is full, orders are rejected with HTTP 400 and remaining counts update in the UI. |
| **Negative Stock Prevention** | Inventory stock is verified before checkout. Quantities are safely decremented (`Math.max(0, stock - qty)`). Items with 0 stock are marked Sold Out. |
| **Conditional Cancellation** | Orders can be cancelled by students or staff **only before food preparation starts** (status `Placed` or `Accepted`). Once status reaches `Preparing`, cancellation is rejected. |
| **Atomic Stock Restoration** | When an eligible cancellation succeeds, all reserved food item quantities are **automatically restored back to menu stock**. |
| **Separate Payment Status** | Orders initialize with `paymentStatus: "Pending"`. Canteen counter staff independently verify cash/UPI payment and mark orders as `"Paid"`. |
| **Role-Based Access Control** | Endpoints enforce role headers (`x-user-role`). Admin endpoints require `admin`, kitchen operations require `staff` or `admin`, student endpoints are public. |

---

## 🚀 Key Modules & Features

### 1. 📱 Student Pre-Ordering & Tracking Module
* **Meal of the Moment Live Clock:** Automatically greets students and highlights morning breakfast, lunch thali, or evening snacks based on real-time campus hours.
* **Menu Browsing & Search:** Categorized dishes with preparation times, stock status badges (*● In Stock*, *● Few Left*, *● Sold Out*), and dish tags (*Bestseller*, *Chef Special*).
* **Slide-Over Cart Drawer:** Real-time subtotal computation, quantity steppers, pickup slot selection with remaining quota hints (*e.g., "12:45 PM (4 spots left)"*), and 1-click checkout.
* **Digital Token & QR Voucher:** Displays token `#YR-XXXX`, pickup slot, and base64 scannable QR code voucher for physical counter collection.
* **Live 5-Stage Stepper Tracker:** Real-time visual pipeline (`Placed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready for Pickup` ➔ `Collected`) with millisecond timestamps and background polling.
* **Student Feedback:** Rate collected meals (1–5 stars) with comments upon completion.

### 2. 👨‍🍳 Canteen Kitchen Staff Kiosk
* **Live Incoming Queue:** Real-time queue sorted chronologically with student name, roll number, items, and slot.
* **Preparation Pipeline Buttons:** Advances orders through allowed stages (`Accept Order 👍` ➔ `Start Preparing 🍳` ➔ `Mark Ready for Pickup 🔔` ➔ `Hand Over & Collected 🎉`).
* **Payment Recording:** Dedicated button to mark physical Cash or UPI received (`Paid 💵`).
* **Staff Cancellation:** Allows kitchen staff to cancel duplicate/invalid orders and restore inventory.

### 3. 📊 Admin Dashboard & Business Intelligence
* **Executive Metric Cards:** Today's Revenue (divided into Paid vs Pending Cash), Total Orders, Active Kitchen Queue, and Average Student Rating.
* **Visual Analytics Charts:** Dynamic CSS bar charts for **Most Popular Canteen Items** and **Order Status Distribution**.
* **Menu & Inventory Management:** Add new dishes, edit prices, adjust stock quantities on the fly, and toggle item availability.
* **Student Reviews Feed:** Complete history of student reviews with star ratings and comments.

### 4. 🤖 Yulu AI Autonomous Ordering Copilot
* **Glassmorphic Floating Dock & Audio Orb:** Responsive floating interface at bottom-right of screen featuring pulsating reactive states (`idle`, `listening`, `processing`).
* **Speech Synthesis & Recognition:** In-browser Web Speech API for voice interactions and speech synthesis replies.
* **Conversational Reasoning Engine:**
  * **Budget Reasoning:** Formulates combos under ₹50, ₹100, or ₹150 (*e.g. Masala Dosa + Cold Coffee with Ice Cream for exactly ₹100*).
  * **Speed Express:** Identifies dishes ready in under 5 minutes (*Vada Pav*, *Samosa Pav*, *Chai*) for students late for lectures.
  * **Fitness & Gym Diet:** Explains ~24g protein breakdown in *Paneer Butter Masala Thali* and low-calorie options (*Sweet Lime Soda*, 110 kcal).
  * **Contextual Suggestions:** Recommends dishes based on current time of day.
  * **Mess FAQs:** Answers questions about operational hours, payment methods, and cancellation rules.
* **1-Click Smart Action Cards:** Injects actionable interactive cards directly into the AI chat feed (`.yulu-smart-action-card`) enabling students to execute 1-shot autonomous checkout with one tap.

---

## ⚙️ Prerequisites & Environment Variables

### Prerequisites
* **Node.js**: v18.0.0 or higher (tested on Node.js v24.14.1)
* **npm**: v9.0.0 or higher (tested on npm 11.11.0)
* **Web Browser**: Google Chrome, Microsoft Edge, or Safari (required for Web Speech API audio synthesis and recognition)

### Environment Variables
The application works out-of-the-box with zero configuration using sensible defaults. The following optional environment variables can be set:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port on which Express server listens |
| `SLOT_CAPACITY` | `5` | Maximum number of concurrent orders allowed per pickup slot |
| `ADMIN_USER` | `admin` | Username for administrative portal authentication |
| `ADMIN_PASS` | `admin123` | Password for administrative portal authentication |

---

## 🗄️ Database Setup

The database requires **no external database server installation** (such as MySQL or MongoDB). It operates on a local, self-contained JSON document database located at:
```text
data/canteen_db.json
```

### Automatic Initialization
When `server.js` boots for the first time, if `data/canteen_db.json` is missing or empty, it automatically initializes the database file with default collections:
* `menu`: Pre-loaded with 12 popular canteen dishes (Dosa, Vada Pav, Samosa Pav, Paneer Thali, Biryani, Maggi, Cold Coffee, Masala Chai, Sweet Lime Soda, Gulab Jamun, etc.).
* `slots`: 8 standard pickup slots (`Immediate`, `12:30 PM` through `02:00 PM`).
* `orders`: Array storing active and archived student orders with QR codes and timestamps.
* `feedback`: Array storing student star ratings and reviews.
* `nextOrderNumber`: Sequential counter starting at `1001`.

All file reads and writes use safe synchronous methods with automatic directory creation (`fs.mkdirSync` and `fs.writeFileSync`).

---

## 🚀 Installation & Startup Commands

### 1. Clone or Open Project
```powershell
cd "d:\Mess Management System"
```

### 2. Install Dependencies
```powershell
npm install
```
*(Dependencies installed: `express`, `cors`, `qrcode`)*

### 3. Start the Server
```powershell
npm start
# or: node server.js
```

### 4. Access the Application
Open your web browser and navigate to:
```text
http://localhost:3000
```

---

## 🧪 Running Automated Tests

The repository contains a standalone, comprehensive integration test suite verifying all 14 core business workflows and security constraints:

```powershell
npm test
# or: node tests/run_tests.js
```

### Actual Test Execution Output
```text
======================================================
🚀 STARTING MESS MANAGEMENT SYSTEM TEST SUITE
======================================================

▶ Test 1: Menu loads and unavailable items cannot be ordered...
  ✅ PASS: GET /api/menu returns 200 and items list 
  ✅ PASS: Ordering unavailable item rejected with 400 Bad Request

▶ Test 2: Cart quantity calculation & trusted price...
  ✅ PASS: Total amount calculated strictly from trusted DB prices (spoofed client price ignored)

▶ Test 3: Checkout required fields & pickup slot validation...
  ✅ PASS: Rejects missing studentName with 400 
  ✅ PASS: Rejects missing rollNumber with 400 
  ✅ PASS: Rejects invalid pickup slot with 400 
  ✅ PASS: Rejects empty items array with 400 

▶ Test 4: Successful order receives unique token...
  ✅ PASS: Order assigned unique token format (e.g. YR-1007)
  ✅ PASS: Order generated with valid base64 QR code image 
  ✅ PASS: Dedicated QR code endpoint returns 200 and image 

▶ Test 5: Order appears in staff dashboard queue...
  ✅ PASS: Newly placed order exists in staff queue

▶ Test 6: Staff advances order through full lifecycle...
  ✅ PASS: Moved Placed -> Accepted 
  ✅ PASS: Moved Accepted -> Preparing 
  ✅ PASS: Moved Preparing -> Ready for Pickup 
  ✅ PASS: Moved Ready -> Collected 
  ✅ PASS: Cannot regress or update order after Collected

▶ Test 7: Student order tracking reflects updated status...
  ✅ PASS: Live tracking endpoint returns updated Collected status and 5 timestamps 

▶ Test 8: Cancellation rejected once food preparation starts...
  ✅ PASS: Cancellation rejected when status is Preparing (food already on stove)

▶ Test 9: Eligible cancellation restores stock exactly once...
  ✅ PASS: Stock decremented by 2 upon order placement 
  ✅ PASS: Eligible cancellation succeeds 
  ✅ PASS: Stock restored back to initial level after cancellation 
  ✅ PASS: Second cancellation rejected and stock not restored twice 

▶ Test 10: Stock cannot become negative...
  ✅ PASS: Exceeding available stock is rejected (prevents negative stock)
  ✅ PASS: Stock remains unchanged at 2 

▶ Test 11: Admin can create and update menu items...
  ✅ PASS: Admin creates new menu item 
  ✅ PASS: Admin updates item price and stock 

▶ Test 12: Invalid input and unauthorized role actions rejected...
  ✅ PASS: Unauthorized student action on admin endpoint rejected with 403 Forbidden 
  ✅ PASS: Unauthorized student action on staff status change rejected with 403 Forbidden 
  ✅ PASS: Invalid admin login credentials rejected with 401 
  ✅ PASS: Valid admin login succeeds with auth token 

▶ Test 13: Data persistence across reload / disk read...
  ✅ PASS: Order is persistently stored on disk in data/canteen_db.json

▶ Test 14: Application operational and serving frontend assets...
  ✅ PASS: Serves index.html with 200 OK 
  ✅ PASS: Serves style.css with 200 OK 
  ✅ PASS: Serves app.js with 200 OK 

======================================================
📊 TEST SUITE SUMMARY: 34 / 34 PASSED
🎉 ALL 14 PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!
======================================================
```

---

## 📡 REST API Reference

| HTTP Method | Route | Access Role | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/login` | Public | `{ username, password }` | Authenticates administrator; issues session token |
| `GET` | `/api/slots` | Public | *None* | List pickup slots with capacity, booked, and remaining counts |
| `GET` | `/api/menu` | Public | *None* | List all menu items (filterable by category/search) |
| `POST` | `/api/menu` | `admin` | `{ name, category, price, stock, prepTime, badge }` | Add a new menu item |
| `PUT` | `/api/menu/:id` | `admin` | `{ price, stock, isAvailable, ... }` | Update menu item details and stock |
| `PATCH`| `/api/menu/:id/toggle` | `admin` | *None* | Toggle item between available and sold out |
| `DELETE`| `/api/menu/:id` | `admin` | *None* | Remove a menu item |
| `GET` | `/api/orders` | Public / `staff` | *None* | Retrieve all orders (newest first) |
| `GET` | `/api/orders/:token` | Public | *None* | Lookup active order details & 5-stage history by token |
| `GET` | `/api/orders/:token/qr` | Public | *None* | Dedicated endpoint returning base64 PNG QR code |
| `POST` | `/api/orders` | Public | `{ studentName, rollNumber, phone, pickupSlot, items }` | Create pre-order with slot check & stock decrement |
| `PATCH`| `/api/orders/:id/status`| `staff`, `admin` | `{ status: "Accepted" \| "Preparing" \| ... }` | Advance order status through strictly enforced lifecycle |
| `PATCH`| `/api/orders/:id/payment`| `staff`, `admin` | `{ paymentStatus: "Paid" \| "Pending" }` | Mark payment as Paid or Pending |
| `POST` | `/api/orders/:id/cancel`| Public / `staff` | `{ reason: string }` | Cancel order before `Preparing` and restore stock |
| `GET` | `/api/stats` | `admin` | *None* | Analytics summary, revenue breakdown, and popular items |
| `POST` | `/api/feedback` | Public | `{ orderToken, studentName, rating, comment }` | Submit student star rating & review on collected orders |
| `GET` | `/api/feedback` | Public | *None* | Retrieve student reviews and calculate average rating |

---

## ⚠️ Current System Limitations

1. **File-Based JSON Storage:** Data is stored in `data/canteen_db.json`. While atomic file writing is implemented, high-concurrency environments with hundreds of concurrent writes require migration to PostgreSQL or MongoDB.
2. **Browser Web Speech API Dependency:** Yulu AI voice synthesis and recognition rely on the W3C Web Speech API standard supported in Chromium browsers (Chrome/Edge/Brave).
3. **Cash / Counter UPI Payments:** Payment recording operates as a counter-verified dual-status flag (`Pending` / `Paid`) rather than an automated online payment gateway (Razorpay/Stripe).
4. **Single-Node Process:** The backend runs as a single Node.js process without distributed Redis cache synchronization.

---

## 📑 College CEP Submission Dossier

For complete academic project documentation, consult the comprehensive submission dossier:
* 📄 **Complete Academic Submission Report:** [docs/CEP_SUBMISSION_REPORT.md](docs/CEP_SUBMISSION_REPORT.md)
  * Project Abstract & Problem Statement
  * System Architecture & ER Diagrams
  * Complete Module Documentation
  * Exact Test Case Logs (34/34 Passed)
  * 2-Minute Presentation Script for Faculty Evaluation
  * Foolproof Live Demonstration Sequence

---

*Smart Canteen & Mess Management System — Built for College Engineering Capstone Submission.*
