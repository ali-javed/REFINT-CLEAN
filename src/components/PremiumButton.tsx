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

  const handlePremiumClick = async () => {
    if (!session) {
      setError('Please sign in first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      console.error('Premium checkout error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
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
