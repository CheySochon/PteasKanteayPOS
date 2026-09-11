# 🍽️ POS Restaurant & Inventory Management System (ផ្ទះកន្ត្រាយ POS)

A modern, full-stack Point of Sale (POS), Kitchen Display System (KDS), QR Ordering, and Real-time Inventory Analytics system built for restaurant management and academic thesis presentation.

---

## 📐 Architecture & Technology Stack

```mermaid
graph TD
    ClientWeb["Frontend Web (Next.js 16 + React 19)"]
    ClientQR["QR Code Customer Mobile View"]
    APIServer["Express.js API + Socket.IO Server"]
    DB[(PostgreSQL Database)]

    ClientWeb -->|HTTP / REST API| APIServer
    ClientWeb <-->|Real-time WebSockets| APIServer
    ClientQR -->|HTTP / QR API| APIServer
    APIServer <-->|Prisma ORM 7 + PG Adapter| DB
```

### **Tech Stack**
- **Frontend (`/web`):** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Chart.js, jsPDF.
- **Backend (`/api`):** Express 5, Node.js, TypeScript, Socket.IO (WebSockets), Prisma ORM 7, PostgreSQL adapter (`@prisma/adapter-pg`).
- **Database:** PostgreSQL (Cloud or Local).
- **Payment & QR:** KHQR (Bakong Payment SDK), Dynamic QR Code generation.
- **Localization:** Full Khmer (`km`) & English (`en`) dual language support.

---

## ✨ Key System Features

1. 🛒 **POS Cashier Terminal**
   - Dine-In, Takeaway, and Table Selection.
   - Real-time Item Search, Quick Category Filters, Cart Management.
   - Bill Splitting, Itemized Discount, VAT & Service Fee calculation.
   - KHQR Bakong Payment integration with QR popup.
   - Instant Receipt / Kitchen Slip Printing.

2. 🍳 **Kitchen Display System (KDS)**
   - Real-time order dispatch via Socket.IO WebSockets.
   - Status flow: `Pending` ➔ `Preparing` ➔ `Ready` ➔ `Served`.
   - Audio / Visual order notification badges.

3. 📦 **Inventory & Stock Audit Management**
   - Stock level tracking with Low Stock and Out-of-Stock alerts.
   - Stock movement audit ledger (`Restock`, `Sale`, `Damage`, `Return`, `Adjustment`).
   - Purchase Order (PO) and Supplier Management.
   - Auto-category detection for beverage and food items.

4. 📊 **Analytics & Reports Dashboard**
   - Real-time Revenue Trend (Hourly, Daily, Monthly).
   - Top Categories Distribution chart.
   - Dynamic Item Performance matrix (`Best Seller`, `Trending`, `High Margin`, `Stable`).
   - Official PDF Report Export with Manager Signature & Stamp layout.
   - Export CSV for Excel auditing.

5. 📱 **QR Table Self-Ordering**
   - Customers scan table QR code to view live digital menu.
   - Direct order placement to Kitchen with real-time status tracker.

---

## 🚀 Installation & Local Setup Guide

### 📋 Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: Local database or cloud URL (e.g. Neon.tech, Supabase, Render PostgreSQL)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/ThesisPosManagerment.git
cd ThesisPosManagerment/pos-newflow
```

---

### Step 2: Configure & Start API Backend (`/api`)

1. **Navigate to API directory:**
   ```bash
   cd api
   npm install
   ```

2. **Create Environment Variables File (`api/.env`):**
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/pos_db?schema=public"
   JWT_SECRET="super_secret_jwt_key_pos_2026"
   CLIENT_URL="http://localhost:3000"
   ```

3. **Run Prisma Migrations & Generate Client:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Start API Server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm run build
   npm run start
   ```
   *API will run at:* `http://localhost:4000`

---

### Step 3: Configure & Start Web Frontend (`/web`)

1. **Navigate to Web directory:**
   ```bash
   cd ../web
   npm install
   ```

2. **Create Environment Variables File (`web/.env.local`):**
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:4000/api"
   NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
   ```

3. **Start Web Frontend:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm run start
   ```
   *Web app will run at:* `http://localhost:3000`

---

## 📖 User Operating Guide (របៀបប្រើប្រាស់ប្រព័ន្ធ)

### 1. 🛒 POS Cashier Workflow (សម្រាប់បុគ្គលិកគិតលុយ)
- ចូលទៅកាន់ `/pos`
- ជ្រើសរើសតុ (Dine-In Table) ឬជ្រើសរើស **Takeaway**
- ជ្រើសរើសមុខម្ហូបចូលក្នុង Cart -> កំណត់បញ្ចុះតម្លៃ (Discount) ឬចំណាំ (Notes)
- ចុច **"Send to Kitchen"** ដើម្បីបញ្ជូនទៅចុងភៅ ឬ **"Pay Now"** ដើម្បីចេញវិក្កយបត្រ / បាញ់ KHQR។

### 2. 🍳 Kitchen Staff Workflow (សម្រាប់ចុងភៅ)
- ចូលទៅកាន់ `/kitchen` (KDS)
- នៅពេលមាន Order ថ្មី វានឹងលោតសំឡេង និងលេចឡើងក្នុងកាត `Pending`
- ចុច **"Start Preparing"** (កំពុងធ្វើ) ➔ **"Mark Ready"** (ធ្វើរួចរាល់) ➔ **"Served"** (ជូនភ្ញៀវរួច)។

### 3. 📦 Inventory Manager Workflow (សម្រាប់អ្នកគ្រប់គ្រងស្តុក)
- ចូលទៅកាន់ `/admin/inventory`
- បន្ថែមស្តុកថ្មីតាមរយៈ **"Add Stock Items"**
- កែសម្រួលស្តុកតាមរយៈ **"Adjust Stock"** (`Restock`, `Damage`, `Adjustment`)
- មើលប្រវត្តិផ្លាស់ប្តូរស្តុកក្នុង **"Stock Movements"** ឬទាញយករបាយការណ៍ CSV / PDF។

### 4. 📊 Manager / Admin Reports Workflow (សម្រាប់ម្ចាស់ហាង)
- ចូលទៅកាន់ `/admin/reports`
- មើល Revenue Trend, Top Selling Categories, និង **Item Performance**
- ជ្រើសរើសចន្លោះពេលរបាយការណ៍ (Day, Month, Year)
- ចុច **"Print / PDF"** ដើម្បីបោះពុម្ពរបាយការណ៍ផ្លូវការដែលមានកន្លែងចុះហត្ថលេខា និងត្រាហាង។

---

## 🌐 Production Deployment Summary

### **Option A: Free Cloud Hosting (Recommended for Thesis Presentation)**
- **Database:** [Neon.tech](https://neon.tech) / [Supabase.com](https://supabase.com) (Free PostgreSQL)
- **API Server:** [Render.com](https://render.com) (Web Service, Root: `pos-newflow/api`)
- **Web App:** [Vercel.com](https://vercel.com) (Next.js, Root: `pos-newflow/web`)

### **Option B: VPS / On-Premise (Recommended for Real Restaurant)**
- **Server:** Ubuntu 22.04 / 24.04 LTS
- **Process Manager:** PM2 (`pm2 start dist/server.js --name pos-api`, `pm2 start npm --name pos-web -- start`)
- **Reverse Proxy:** Nginx with WebSockets support & Certbot SSL HTTPS.

---

## 📄 License & Credits
Developed as a graduation thesis project for Restaurant POS & Inventory Management System.
