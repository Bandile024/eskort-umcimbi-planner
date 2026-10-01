# Eskort Umcimbi Planner

A braai planning application for Eskort that helps customers plan their perfect braai event by calculating the perfect shopping list based on guest count, budget, and preferences.

## Features

- **Event Planning**: Interactive form to gather event details (guest count, budget, date, location)
- **Smart Calculation**: Automatically calculates the perfect Eskort shopping list based on guest count and preferences
- **Budget Tracking**: Real-time budget breakdown with per-person cost estimates
- **Shopping Cart**: Add/remove products with quantity controls
- **Checkout**: Secure payment via PayFast integration
- **Account Management**: Order history, status tracking, delivery details
- **Admin Dashboard**: Order management, status updates, statistics

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL, Auth, Realtime)
- **Payments**: PayFast (South African payment gateway)
- **Styling**: Custom design system with dark theme, CSS variables
- **Deployment**: Vercel (recommended)

## Project Structure

```
eskort-umcimbi-planner/
├── app/
│   ├── api/
│   │   ├── orders/route.ts           # Order creation
│   │   ├── payfast/checkout/route.ts # PayFast checkout initiation
│   │   └── payfast/itn/route.ts      # PayFast ITN webhook
│   ├── account/
│   │   ├── orders/
│   │   │   ├── page.tsx              # Order list
│   │   │   └── [id]/page.tsx         # Order detail
│   ├── admin/
│   │   ├── dashboard/page.tsx        # Admin dashboard
│   │   ├── orders/page.tsx           # Admin order list
│   │   └── login/page.tsx            # Admin login
│   ├── checkout/page.tsx             # Checkout page
│   ├── event-details/page.tsx        # Event planning form
│   ├── page.tsx                      # Landing page
│   └── layout.tsx                    # Root layout
├── components/
│   ├── Navbar.tsx                    # Navigation component
│   ├── StepProgressBar.tsx           # Checkout progress indicator
│   └── ...
├── lib/
│   ├── auth-context.tsx              # Authentication context
│   ├── payfast.ts                    # PayFast integration utilities
    │   ├── middleware.ts             # Next.js middleware (auth, redirects)
    │   ├── supabase.ts               # Supabase client (browser)
    │   ├── supabase-server.ts        # Supabase client (server)
    │   ├── supabase-admin.ts         # Supabase admin client
    │   └── types.ts                  # TypeScript types
├── supabase/
│   └── schema.sql                    # Database schema
├── public/                           # Static assets
└── .env.local.example                # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- PayFast merchant account (for payments)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd eskort-umcimbi-planner

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Fill in your environment variables in .env.local
# See "Environment Variables" section below

# Run database schema in Supabase SQL Editor
# Copy contents of supabase/schema.sql and execute in Supabase SQL Editor

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# PayFast Configuration
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
PAYFAST_SKIP_IP_CHECK=true

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Execute the SQL to create all tables and policies

### PayFast Setup

1. Sign up for a PayFast merchant account at payfast.co.za
2. For sandbox testing: use sandbox.payfast.co.za
3. Create a new integration in the developer dashboard
4. Add your Merchant ID, Merchant Key, and Passphrase to `.env.local`
4. Configure ITN URL: `https://your-domain.com/api/payfast/itn`

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run typecheck # Run TypeScript type checking
```

## Database Schema

The schema includes:
- **profiles** - User profiles with roles (customer, admin)
- **orders** - Customer orders with status tracking
- **order_items** - Individual items within orders
- **order_status_history** - Audit trail of status changes
- **products** - Eskort product catalog

## PayFast Integration

The checkout flow:
1. Customer fills delivery details on `/checkout`
2. Clicks "Place Order" → creates order in DB
3. Server generates PayFast signature & redirects to PayFast
4. Customer pays on PayFast sandbox/live
5. PayFast posts ITN to `/api/payfast/itn`
6. Server validates signature → updates order status
7. Customer redirected back to `/account/orders/[id]`

## Admin Access

- Admin login: `/admin/login`
- Dashboard: `/admin/dashboard`
- Order management: `/admin/orders`
- Only users with `role: 'admin'` in profiles table can access

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t eskort-planner .
docker run -p 3000:3000 --env-file .env.local eskort-planner
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open pull request

## License

Proprietary - Eskort Umcimbi Planner