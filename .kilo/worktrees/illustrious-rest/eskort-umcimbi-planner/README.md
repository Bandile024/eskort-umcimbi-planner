# Eskort Umcimbi Planner

A Next.js 14 + TypeScript frontend for the **Eskort Umcimbi Planner** — a 7-step braai planning experience that helps South Africans plan the perfect braai for any occasion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Fonts | Bebas Neue (display) + Inter (body) via Google Fonts |

---

## Prerequisites

Make sure you have the following installed:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** v9+ (comes with Node) or **yarn**

Check your versions:
```bash
node --version
npm --version
```

---

## Getting Started

### 1. Navigate to the project folder

```bash
cd eskort-umcimbi-planner
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build for Production

```bash
npm run build
npm run start
```

---

## Project Structure

```
eskort-umcimbi-planner/
├── app/
│   ├── layout.tsx                  # Root layout (Navbar + AuthProvider + fonts)
│   ├── page.tsx                    # Home Page
│   ├── globals.css                 # Global styles + Tailwind directives
│   ├── event-details/
│   │   └── page.tsx                # Event Details
│   ├── calculating/
│   │   └── page.tsx                # Loading screen
│   ├── recommended-packages/
│   │   └── page.tsx                # Recommended packages
│   ├── build-my-braai/
│   │   └── page.tsx                # Build My Own Braai
│   ├── build-my-braai/products/
│   │   └── page.tsx                # Product selection page
│   ├── basket-summary/
│   │   └── page.tsx                # Basket Summary
│   ├── checkout/
│   │   └── page.tsx                # Checkout (saves orders to Supabase)
│   ├── order-confirmation/
│   │   └── page.tsx                # Order Confirmed
│   ├── share/
│   │   └── page.tsx                # Share to the Crew
│   ├── login/
│   │   └── page.tsx                # Customer sign in
│   ├── signup/
│   │   └── page.tsx                # Customer sign up
│   ├── forgot-password/
│   │   └── page.tsx                # Forgot password
│   ├── reset-password/
│   │   └── page.tsx                # Reset password page
│   ├── account/
│   │   ├── page.tsx                # Customer account dashboard
│   │   ├── account-client.tsx      # Client component
│   │   └── orders/
│   │       ├── page.tsx            # Customer orders list
│   │       ├── orders-client.tsx   # Client component
│   │       └── [id]/
│   │           ├── page.tsx        # Order detail (server)
│   │           └── order-detail-client.tsx  # Client component
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx            # Admin login
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Admin dashboard (server)
│   │   │   └── dashboard-client.tsx # Client component
│   │   └── orders/
│   │       ├── page.tsx            # Admin orders list (server)
│   │       ├── orders-client.tsx   # Client component
│   │       └── [id]/
│   │           ├── page.tsx        # Order detail (server)
│   │           └── order-detail-client.tsx # Client component
│   ├── api/
│   │   ├── orders/
│   │   │   └── route.ts            # Create order
│   │   ├── account/
│   │   │   └── orders/
│   │   │       ├── route.ts        # Get customer orders
│   │   │       └── [id]/route.ts   # Get order detail
│   │   ├── admin/
│   │   │   ├── dashboard/route.ts  # Dashboard stats
│   │   │   └── orders/
│   │   │       ├── route.ts        # Admin orders (filter/search/pagination)
│   │   │       └── [id]/route.ts   # Admin order detail/update
│   │   └── auth/
│   │       ├── signin/route.ts     # Sign in
│   │       ├── signup/route.ts     # Sign up
│   │       ├── signout/route.ts    # Sign out
│   │       ├── reset-password/route.ts  # Reset password
│   │       ├── update-password/route.ts # Update password
│   │       └── check-admin/route.ts # Check admin role
├── components/
│   ├── Navbar.tsx
│   ├── StepProgressBar.tsx
│   ├── BudgetTracker.tsx
│   └── QuantityControl.tsx
├── lib/
│   ├── supabase.ts             # Client-side Supabase client
│   ├── supabase-server.ts      # Server-side Supabase client
│   ├── auth-context.tsx        # Auth context provider
│   ├── types.ts                # TypeScript interfaces
│   ├── email.ts                # Email service (Resend)
│   ├── middleware.ts           # Auth middleware logic
│   └── services/
│       └── orderService.ts     # Order service
├── supabase/
│   └── schema.sql              # Database schema + RLS policies
├── public/
├── middleware.ts               # Next.js middleware
├── .env.local.example          # Environment variables template
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── package.json
```

---

## Adding Your Images

The design uses background and product images. Place your images in the `public/images/` folder and they will be served automatically.

### Expected image filenames

| File | Used on |
|---|---|
| `public/images/hero-bg.jpg` | Home page hero background |
| `public/images/crowd-pleaser.jpg` | Recommended Packages card |
| `public/images/value-braai.jpg` | Recommended Packages card |
| `public/images/quick-easy.jpg` | Recommended Packages card |
| `public/images/full-family.jpg` | Recommended Packages card |

Until you add images, the pages use dark-coloured placeholder backgrounds and emoji to represent products — the layout remains fully functional.

---

## User Journey (7 Steps)

| Step | Route | Description |
|---|---|---|
| 01 | `/` | Home page — hero + browse favourites carousel |
| 02 | `/event-details` | Tell us your occasion, guests, budget & braai style |
| 03 | `/calculating` | Animated "Doing the Braai Math" loading screen |
| 04 | `/recommended-packages` | AI-matched braai basket packages |
| 05 | `/build-my-braai` | Build or customise your own braai selection |
| 06 | `/basket-summary` | Review basket contents (Crowd Pleaser view) |
| 07 | `/checkout` | Secure checkout with delivery details + payment |
| — | `/order-confirmation` | Order confirmed + live tracking steps |
| — | `/share` | Share your Umcimbi plan via WhatsApp |

---

## Brand Colours

These are defined as Tailwind tokens in `tailwind.config.ts`:

| Token | Hex | Usage |
|---|---|---|
| `eskort-red` | `#CC0000` | Primary red — CTAs, headings, accents |
| `eskort-yellow` | `#F5A800` | Gold/yellow — prices, highlights, buttons |
| `eskort-black` | `#1A1A1A` | Dark backgrounds |
| `eskort-dark-card` | `#222222` | Card backgrounds |
| `eskort-cream` | `#F5EDD6` | Light page backgrounds |
| `eskort-green` | `#2D7A3A` | Budget tracker, WhatsApp button |

---

## VS Code Recommended Extensions

- **ES7+ React/Redux/React-Native snippets** (`dsznajder.es7-react-js-snippets`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **Auto Import - ES6** (`steoates.autoimport`)

---

## Supabase Integration

This project integrates with [Supabase](https://supabase.com) for authentication, database, and order management.

### Prerequisites

1. A Supabase project — [create one here](https://supabase.com/dashboard) if you don't have one.
2. Access to the Supabase SQL editor for running migrations.
3. (Optional) A Resend account for order notification emails — [resend.com](https://resend.com)

### 1. Get Your Supabase Credentials

From your Supabase project dashboard:

1. Go to **Project Settings → API**
2. Copy the **Project URL** (under "Project API credentials")
3. Copy the **anon/public** key (under "Project API credentials")
4. Go to **Project Settings → Functions** and copy the `service_role` key if you need admin-level access

### 2. Configure Environment Variables

Create a `.env.local` file in the project root (same level as `package.json`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Email Service (Resend) - optional, for order notifications
RESEND_API_KEY=your-resend-api-key-here

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Where to find these values:**

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → "anon/public" |
| `RESEND_API_KEY` | Resend Dashboard → API Keys → "Create API Key" |

### 3. Set Up the Database

Run the provided SQL schema in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Open a new query tab
4. Copy and paste the contents of [`supabase/schema.sql`](supabase/schema.sql)
5. Click **Run** to execute the migration

This creates the following tables:

| Table | Description |
|---|---|
| `profiles` | User profiles (auto-created on signup) |
| `orders` | Customer orders with status tracking |
| `order_items` | Individual line items for each order |
| `order_status_history` | Audit trail of status changes |

### 4. Configure Authentication Settings (Supabase Dashboard)

1. Go to **Authentication → Settings** in your Supabase project
2. Under **Email Confirmation**, you can:
   - **Enable Confirmable** — Users must confirm their email before signing in (recommended)
   - Or disable it for easier local development
3. Under **Redirect URLs**, add `http://localhost:3000` for local development
4. Under **Email Reset**, set the redirect URL to `http://localhost:3000/reset-password`

### 5. Create an Admin User

To access the admin dashboard:

1. Sign up at `/signup` (or via the dashboard)
2. In the Supabase SQL Editor, run:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

You can now log in at `/admin/login` with your admin credentials.

### 6. Set Up Email Notifications (Optional)

If you want order confirmation emails:

1. Sign up at [resend.com](https://resend.com)
2. Create an API key in the Resend Dashboard
3. Add it to `.env.local` as `RESEND_API_KEY=your-key-here`
4. Order notifications are sent automatically to `orders@eskort.co.za` when an order is placed via the `/api/orders` endpoint

### 7. Run the Application

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Authentication Flow

- **Customers** can sign in at `/login` or sign up at `/signup`
- After signing in, customers are redirected to `/account` where they can:
  - View their orders at `/account/orders`
  - View order details at `/account/orders/[id]`
- **Admins** can log in at `/admin/login` and access:
  - `/admin/dashboard` — Overview with stats cards
  - `/admin/orders` — Full order management table
  - `/admin/orders/[id]` — Order detail with status updates

### Row Level Security

All database tables have RLS enabled:

- **Customers** can only view their own orders and order items
- **Admins** can view all orders, order items, and status history
- Order creation requires an authenticated session
- Order status updates are admin-only

---

### Troubleshooting

#### "Database error creating new user"

This error occurs when the profile auto-creation trigger fails. Ensure you have:

1. Run the latest `supabase/schema.sql` from the SQL Editor
2. The schema uses `gen_random_uuid()` (from `pgcrypto`) instead of `uuid_generate_v4()` (from `uuid-ossp`)
3. If you previously ran an older schema, drop existing objects first:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS handle_new_user();
DROP TRIGGER IF EXISTS trigger_order_status_history ON orders;
DROP FUNCTION IF EXISTS create_order_status_history();
DROP TRIGGER IF EXISTS trigger_update_order_status_history ON orders;
DROP FUNCTION IF EXISTS update_order_status_history();
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
DROP FUNCTION IF EXISTS update_orders_updated_at();
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS profiles;
DROP EXTENSION IF EXISTS "uuid-ossp";
```
Then re-run the schema from `supabase/schema.sql`.

---

## Next Steps (Backend)

Items that are still pending (beyond the current Supabase integration):

- [ ] Connect event details form to an API route (`/api/calculate`)
- [ ] Build product catalogue API (`/api/products`)
- [ ] Integrate payment gateway (e.g. PayFast, Peach Payments)

---

## License

Private — Eskort Meat Company. All rights reserved.
