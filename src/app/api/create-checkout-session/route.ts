import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Ensure env vars load even if Next.js fails to hydrate .env.local in dev
dotenv.config({ path: '.env.local' });

// Force Node runtime so server-side secrets load from .env.local
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    console.log('[create-checkout-session] Request received');
    console.log('[create-checkout-session] STRIPE_SECRET_KEY exists:', !!stripeKey);
    console.log('[create-checkout-session] STRIPE env keys:', Object.keys(process.env).filter((k) => k.toLowerCase().includes('stripe')));
    if (stripeKey) {
      console.log('[create-checkout-session] STRIPE_SECRET_KEY prefix:', stripeKey.slice(0, 8));
    }
    
    if (!stripeKey) {
      console.error('[create-checkout-session] STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey, {
      // Use a supported API version
      apiVersion: '2023-10-16',
    });
    
    const { userId, email } = await request.json();
    console.log('[create-checkout-session] Body:', { userId, email });

    if (!userId || !email) {
      console.warn('[create-checkout-session] Missing userId or email');
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    console.log('[create-checkout-session] Creating Stripe session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Premium Subscription',
              description: 'Unlock unlimited reference analysis',
            },
            unit_amount: 99, // $0.99 in cents
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}`,
      metadata: {
        userId,
      },
    });

    console.log('[create-checkout-session] Session created:', session.id);
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('[create-checkout-session] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
