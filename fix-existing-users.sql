-- Fix existing users by creating missing profiles and plans
-- Run this after running fresh-schema.sql

-- Create profiles for existing auth users that don't have profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Create user_plans for existing auth users that don't have plans
INSERT INTO public.user_plans (user_id, plan_type, monthly_limit, monthly_used)
SELECT 
  au.id,
  'free',
  3,
  0
FROM auth.users au
LEFT JOIN public.user_plans up ON up.user_id = au.id
WHERE up.user_id IS NULL;

-- Verify
SELECT 'Profiles created:' as info, COUNT(*) FROM public.profiles;
SELECT 'User plans created:' as info, COUNT(*) FROM public.user_plans;
