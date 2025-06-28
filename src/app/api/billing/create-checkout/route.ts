import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { priceId, mode = 'subscription', successUrl, cancelUrl } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    console.log('🛒 Creating Stripe checkout session for user:', user.id);
    console.log('💰 Price ID:', priceId, 'Mode:', mode);

    // Create or get Stripe customer
    let stripeCustomer;
    
    // Try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: user.emailAddresses[0]?.emailAddress,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      // Create new customer
      stripeCustomer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: {
          clerkUserId: user.id,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      mode: mode as 'subscription' | 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
      metadata: {
        clerkUserId: user.id,
        priceId: priceId,
      },
      // Allow customer name updates for tax ID collection
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      // For subscriptions, collect billing address for tax calculation
      ...(mode === 'subscription' && {
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
        allow_promotion_codes: true,
      }),
    });

    console.log('✅ Stripe checkout session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('❌ Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
} 