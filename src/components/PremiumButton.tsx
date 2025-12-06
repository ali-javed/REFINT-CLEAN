'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Session } from '@supabase/supabase-js';

interface PremiumButtonProps {
  session: Session | null;
}

export default function PremiumButton({ session }: PremiumButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[PremiumButton] Session:', { exists: !!session, email: session?.user.email });

  const handlePremiumClick = async () => {
    if (!session) {
      setError('Please sign in first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[PremiumButton] Creating checkout session...');
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
        }),
      });

      console.log('[PremiumButton] Response status:', response.status);
      console.log('[PremiumButton] Response headers:', Object.fromEntries(response.headers));
      
      const responseText = await response.text();
      console.log('[PremiumButton] Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[PremiumButton] Failed to parse JSON:', parseErr);
        throw new Error(`Invalid response format: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      console.log('[PremiumButton] Checkout session created:', data.sessionId, 'url:', data.url);

      // Prefer direct URL redirect (Stripe.js redirectToCheckout deprecated)
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Fallback to legacy redirectToCheckout if available
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      console.log('[PremiumButton] Redirecting via Stripe.js fallback...');
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      console.error('[PremiumButton] Premium checkout error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    console.log('[PremiumButton] No session, not rendering');
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Go Premium</p>
          <p className="text-xs text-amber-700">Unlimited reference analysis for $0.99</p>
        </div>
      </div>
      <button
        onClick={handlePremiumClick}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-amber-600 text-white text-sm font-semibold px-4 py-2 hover:bg-amber-700 disabled:opacity-60 whitespace-nowrap"
      >
        {loading ? 'Processing…' : 'Upgrade'}
      </button>
      {error && (
        <p className="absolute top-full left-0 mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
