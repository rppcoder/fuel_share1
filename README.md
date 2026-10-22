# FuelShare PWA (Supabase Edition)

FuelShare is a mobile-first Progressive Web App (PWA) designed for shared three-wheeler (Tuk-Tuk) management in Sri Lanka. It automates trip tracking, fuel purchases, vehicle repairs, driver contribution calculations, payments, and monthly settlement statements with direct WhatsApp sharing.

---

## Key Features

1. **Exact 2-Decimal Accounting Engine**:
   - Calculates distance (`end_km - start_km`) and contribution (`distance * rate_snapshot`).
   - Rate snapshots are permanently recorded on each trip, ensuring historical statements never change when rates are adjusted.
   - Separate accounting for actual petrol pump purchases and vehicle maintenance vs. calculated driver contributions.
2. **Authoritative Cloud Synchronization (Supabase PostgreSQL)**:
   - Synchronizes trips, fuel records, payments, and settlements across multiple authorized mobile devices and browsers.
   - Row-Level Security (RLS) ensures household data isolation.
3. **Driver Balances & WhatsApp Monthly Statements**:
   - Computes real-time balances: `Confirmed Contributions - Allocated Payments`.
   - Generates pre-formatted WhatsApp statements with valid Sri Lankan phone normalization (`947xxxxxxxx`) and click-to-chat links for review.
4. **PWA Mobile-First Experience**:
   - Installable on Android (via Chrome) and iOS (Safari "Add to Home Screen").
   - Offline draft queue preserves recorded trips when driving in low-reception zones, with one-click syncing upon reconnection.
5. **Private Receipt Storage**:
   - Fuel and repair receipt photos stored in private Supabase Storage buckets, retrieved via secure, time-limited signed URLs.
6. **17-Point Automated QA & Security Verification Suite**:
   - Built-in test runner verifies math, odometer validation, snapshot persistence, RLS policies, and zero-key leakage.

---

## 1. Quick Setup: Connecting Supabase

### Step A: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose an organization, project name (e.g., `fuelshare-tuktuk`), and database password.
3. Select region `Singapore` (closest low-latency region for Sri Lanka).

### Step B: Execute the SQL Schema Migration
1. In your Supabase Dashboard, open **SQL Editor** from the left navigation.
2. Open the file `supabase/migrations/20261022000000_fuelshare_schema.sql` from this repository.
3. Copy the entire contents and paste into the Supabase SQL Editor.
4. Click **Run**. This provisions all 11 tables (`households`, `vehicles`, `drivers`, `trips`, `fuel_purchases`, `expenses`, `payments`, `settlements`, `audit_logs`, etc.), triggers, helper functions, and Row Level Security policies.

### Step C: Configure Supabase Storage for Receipts
The migration automatically provisions the private bucket `fuelshare-receipts`. To verify:
1. In Supabase Dashboard, go to **Storage**.
2. Confirm the `fuelshare-receipts` bucket is present and set to **Private** (public downloads blocked).

### Step D: Connect FuelShare PWA to Your Database
There are two ways to connect:

**Option 1: In the App UI (Immediate, No Restart Needed)**
1. Open the FuelShare PWA in your browser.
2. Click the **Connect Supabase** banner at the top or open **Settings → Supabase Connection**.
3. Paste your **Project URL** and **Anon Key** (found in Supabase Dashboard → *Project Settings* → *API*).
4. Click **Test Connection** to verify all tables, then click **Save & Connect**.

**Option 2: Environment Variables (`.env`)**
Create or edit `.env` in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```

---

## 2. Setting Up the First Administrator

When first provisioning your household:
1. The initial user account registers via Supabase Auth (or the app's initial admin setup).
2. The initial admin is automatically assigned the role `'admin'` in `household_members`.
3. In the app's **Settings** screen, the administrator can:
   - Configure vehicle registration (e.g. `WP AA-5524`) and starting odometer.
   - Add drivers with their names and Sri Lankan WhatsApp numbers (`077xxxxxxx`).
   - Define the per-kilometre contribution rate (default: `Rs. 35.00/km`).

---

## 3. Running Locally

```bash
# 1. Clone repository & install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Open browser at http://localhost:3000
```

---

## 4. Deploying to Vercel or Netlify

### Deploying to Vercel
1. Push your code to GitHub.
2. Import the repository in [vercel.com](https://vercel.com).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: `your-anon-publishable-key`
4. Click **Deploy**.

### Deploying to Netlify
1. Import repository into [netlify.com](https://netlify.com).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add the same environment variables under **Site configuration → Environment variables**.
5. Deploy site.

---

## 5. Android & iOS PWA Installation Guide

### On Android (Chrome / Brave / Edge)
1. Open the deployed application URL in Chrome on your phone.
2. Tap the **Install PWA** button in the top navigation bar or tap Chrome's three dots (`⋮`) menu.
3. Select **"Install app"** or **"Add to Home Screen"**.
4. An icon titled **FuelShare** will appear on your app launcher with full offline caching and standalone display.

### On iPhone / iPad (Safari)
1. Open the URL in Safari.
2. Tap the **Share** button (box with upward arrow) in the Safari bottom bar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right.

---

## 6. Running the Automated QA & Security Suite

The app includes an automated test runner validating the 17 business logic and security specifications:
1. In FuelShare, tap the **Flask icon** in the top bar or navigate to **More → QA Test Runner**.
2. Click **Re-run** to execute all 17 automated tests live in the browser.
3. Verify tests for 32 km @ Rs. 35/km, odometer sequence rejection, rate snapshot immutability, payment allocation, fuel separation, and zero service-role keys.

---

## 7. Known Limitations & Architectural Notes

1. **Authoritative Cloud Source**: The cloud Supabase PostgreSQL database is the single source of truth. Offline drafts are marked with a "Pending Sync" badge until reconnected to avoid silent overwrites.
2. **No Hardware GPS Tracking**: The app relies on driver-recorded odometer readings rather than battery-draining continuous background GPS tracking, which is standard for Sri Lankan Tuk-Tuks.
3. **Private Receipts**: Receipts require an active Supabase authenticated session or generated signed URL to view; they cannot be shared via public static links for privacy.
