import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      console.error('❌ Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('🪝 Stripe webhook received:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log('🔕 Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout completed:', session.id);
  
  const clerkUserId = session.metadata?.clerkUserId;
  if (!clerkUserId) {
    console.error('❌ No clerk user ID in session metadata');
    return;
  }

  if (session.mode === 'subscription') {
    // Handle subscription purchase
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await updateUserPlan(clerkUserId, subscription);
  } else if (session.mode === 'payment') {
    // Handle one-time credit purchase
    await handleCreditPurchase(clerkUserId, session);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🆕 Subscription created:', subscription.id);
  
  const clerkUserId = subscription.metadata?.clerkUserId;
  if (clerkUserId) {
    await updateUserPlan(clerkUserId, subscription);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  
  const clerkUserId = subscription.metadata?.clerkUserId;
  if (clerkUserId) {
    await updateUserPlan(clerkUserId, subscription);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);
  
  const clerkUserId = subscription.metadata?.clerkUserId;
  if (clerkUserId) {
    // Downgrade user to free plan
    await updateUserPlan(clerkUserId, null);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Payment succeeded for invoice:', invoice.id);
  
  // You can add additional logic here for successful payments
  // such as sending confirmation emails, updating analytics, etc.
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💸 Payment failed for invoice:', invoice.id);
  
  // Handle failed payments - notify user, retry logic, etc.
}

async function updateUserPlan(clerkUserId: string, subscription: Stripe.Subscription | null) {
  try {
    let planName = 'FREE';
    let subscriptionData = null;

    if (!subscription) {
      console.log('📉 Downgrading user to free plan:', clerkUserId);
      planName = 'FREE';
    } else {
      // Determine plan based on price ID
      const priceId = subscription.items.data[0]?.price.id;
      
      console.log('🔍 Processing price ID:', priceId);
      
      // Map real Stripe price IDs to plan names (updated to match new structure)
      const priceToPlanMap: Record<string, string> = {
        // Monthly plans
        'price_1Rf0s4GfQ4XRggGYSB9ExPB6': 'PRO', 
        'price_1Rf0s5GfQ4XRggGYAmoZRtmz': 'ULTRA',
        'price_1Rf0s5GfQ4XRggGYNWPGsCZ7': 'TEAM', // Enterprise price ID now maps to TEAM
        // Annual plans
        'price_1Rf0s4GfQ4XRggGYyjhDkBNw': 'PRO',
        'price_1Rf0s5GfQ4XRggGY5Q7ueU19': 'ULTRA',
        'price_1Rf0s6GfQ4XRggGYm1of3Nci': 'TEAM',
      };
      
      planName = priceToPlanMap[priceId] || 'FREE';
      
      console.log('📋 Mapped price ID to plan:', { priceId, planName });
      
      subscriptionData = {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
      };
    }
    
    console.log('📈 Updating user plan:', clerkUserId, 'to', planName);
    
    // Update user plan using PrismaStripeCreditManager
    try {
      const { prismaStripeCreditManager } = await import('@/lib/credits/PrismaStripeCreditManager');
      
      // Ensure user exists in database first
      const userResult = await prismaStripeCreditManager.ensureUserExists(clerkUserId);
      if (!userResult.success) {
        console.error('❌ Failed to ensure user exists:', userResult.error);
        return;
      }
      
      // Update plan with database transaction
      const result = await prismaStripeCreditManager.updateUserPlan(
        clerkUserId,
        planName as any,
        subscriptionData
      );
      
      if (result.success) {
        console.log('✅ User plan updated successfully via database:', {
          clerkUserId,
          planName,
          newBalance: result.newBalance
        });
      } else {
        console.error('❌ Failed to update user plan:', result.error);
      }

    } catch (dbError) {
      console.error('❌ Failed to update user plan in database:', dbError);
    }
    
  } catch (error) {
    console.error('❌ Failed to update user plan:', error);
  }
}

// Credit updates are now handled by PrismaStripeCreditManager.updateUserPlan()

async function handleCreditPurchase(clerkUserId: string, session: Stripe.Checkout.Session) {
  try {
    console.log('💳 Processing credit purchase for user:', clerkUserId);
    console.log('💳 Session data:', { 
      id: session.id, 
      mode: session.mode,
      payment_status: session.payment_status,
      metadata: session.metadata 
    });
    
    // Get price ID from line items (more reliable than metadata)
    let priceId = session.metadata?.priceId;
    
    // Fallback: get price ID from line items if not in metadata
    if (!priceId && session.line_items) {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        priceId = lineItems.data[0]?.price?.id;
        console.log('💳 Retrieved price ID from line items:', priceId);
      } catch (error) {
        console.error('❌ Failed to retrieve line items:', error);
      }
    }
    
    let creditAmount = 0;
    
    // Map real Stripe price IDs to credit amounts (including bonuses) - UPDATED PRICING
    const priceToCreditsMap: Record<string, number> = {
      // Using NEW Stripe price IDs with sustainable video generation pricing
      'price_1RlsVjGfQ4XRggGY74J3FMmC': 100,    // $9 starter pack (100 credits)
      'price_1RlsW2GfQ4XRggGYPaNV5jGR': 350,    // $29 popular pack (300 credits + 50 bonus)
      'price_1RlsWZGfQ4XRggGYCstPDYua': 1000,   // $69 power pack (800 credits + 200 bonus)
      'price_1RlsWpGfQ4XRggGYRqadeGWD': 2500,   // $149 enterprise pack (2000 credits + 500 bonus)
    };
    
    creditAmount = priceToCreditsMap[priceId!] || 0;
    
    if (creditAmount > 0) {
      console.log('💳 Credit purchase confirmed:', {
        userId: clerkUserId,
        priceId,
        creditAmount,
        sessionId: session.id
      });
      
      // Add credits to database using the PrismaStripeCreditManager
      try {
        const { prismaStripeCreditManager } = await import('@/lib/credits/PrismaStripeCreditManager');
        
        // Ensure user exists in database first
        const userResult = await prismaStripeCreditManager.ensureUserExists(clerkUserId);
        if (!userResult.success) {
          console.error('❌ Failed to ensure user exists:', userResult.error);
          return;
        }
        
        // Add credits with full transaction record
        const result = await prismaStripeCreditManager.handleStripeCreditPurchase(
          clerkUserId,
          priceId!,
          session.id
        );
        
        if (result.success) {
          console.log('✅ Credits successfully added via Stripe webhook:', {
            userId: clerkUserId,
            amount: creditAmount,
            newBalance: result.newBalance,
            transactionId: result.transactionId,
            sessionId: session.id
          });
        } else {
          console.error('❌ Failed to add credits via PrismaStripeCreditManager:', result.error);
        }
        
      } catch (dbError) {
        console.error('❌ Failed to add credits to database:', dbError);
        // Still mark webhook as successful to avoid retries
      }
      
      // Log successful processing
      console.log('✅ Credit purchase webhook processed successfully');
      
    } else {
      console.error('❌ Unknown price ID for credit purchase:', {
        priceId,
        availablePriceIds: Object.keys(priceToCreditsMap),
        sessionId: session.id
      });
      
      // Don't fail the webhook for unknown price IDs, just log the error
      // The client-side fallback will handle credit addition
    }
    
  } catch (error) {
    console.error('❌ Failed to process credit purchase:', error);
    // Don't throw error - let webhook succeed even if processing fails
    // Client-side will handle credit addition as fallback
  }
} 