-- Create user_subscriptions table
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

-- Add RLS policies
alter table public.user_subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role can insert/update subscriptions"
  on public.user_subscriptions for all
  using (true);

-- Create index for faster lookups
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
