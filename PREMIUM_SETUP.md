# Premium Subscription Setup Guide

## Overview
The app now includes a Stripe-based premium subscription feature for $0.99. Authenticated users will see an "Upgrade" button that opens a Stripe checkout.

## Setup Steps

### 1. Supabase Database Setup
Run the migration to create the `user_subscriptions` table:

```sql
-- Go to Supabase SQL Editor and run: migrations/001_create_user_subscriptions.sql
```

Or manually create the table:
```sql
create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  stripe_session_id text not null,
  status text not null default 'active',
  subscription_type text default 'premium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role can insert/update subscriptions"
  on public.user_subscriptions for all
  using (true);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
```

### 2. Environment Variables
Verify these are in `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=https://refint-clean.vercel.app
```

### 3. Stripe Webhook Configuration
Configure Stripe webhook in your Stripe Dashboard:
1. Go to Developers > Webhooks
2. Create a new endpoint pointing to: `{YOUR_SITE_URL}/api/webhooks/stripe`
3. Select events: `checkout.session.completed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Components & APIs

**Components:**
- `src/components/PremiumButton.tsx` - Displays upgrade button to logged-in users

**API Routes:**
- `POST /api/create-checkout-session` - Creates Stripe checkout session
- `POST /api/webhooks/stripe` - Handles successful payment webhook
- `GET /api/check-subscription` - Checks if user has active premium subscription

**Database:**
- `user_subscriptions` table - Stores subscription status

## Features

✨ **Premium Button**
- Only shows to authenticated users
- Located at the top of the home page
- Accepts Stripe card payments ($0.99)
- Redirects to Stripe checkout on click

🔐 **Subscription Status**
- Tracked in database after successful payment
- Can be checked via `/api/check-subscription`
- RLS policies prevent users viewing others' subscriptions

🔔 **Webhook Handling**
- Automatically updates subscription status on successful payment
- Signature verification for security

## Testing Stripe Locally

Use Stripe's test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Any future expiry date
- Any CVC

## Next Steps

To enforce premium features, modify components to check subscription status:

```typescript
const { data: subscription } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single();

if (subscription?.status === 'active') {
  // Show premium features
}
```
