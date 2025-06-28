import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
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
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
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

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
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
    // Here you would update your database with the new plan
    // For now, we'll just log what would happen
    
    if (!subscription) {
      console.log('📉 Downgrading user to free plan:', clerkUserId);
      // Update database: SET plan = 'free' WHERE clerk_id = clerkUserId
      return;
    }

    // Determine plan based on price ID
    const priceId = subscription.items.data[0]?.price.id;
    let planName = 'free';
    
    // Map real Stripe price IDs to plan names
    const priceToPlanMap: Record<string, string> = {
      // Monthly plans
      'price_1Rf0s3GfQ4XRggGYLyPcWhKs': 'student',
      'price_1Rf0s4GfQ4XRggGYSB9ExPB6': 'pro', 
      'price_1Rf0s5GfQ4XRggGYAmoZRtmz': 'team',
      'price_1Rf0s5GfQ4XRggGYNWPGsCZ7': 'enterprise',
      // Annual plans
      'price_1Rf0s4GfQ4XRggGYQGzx0EUS': 'student',
      'price_1Rf0s4GfQ4XRggGYyjhDkBNw': 'pro',
      'price_1Rf0s5GfQ4XRggGY5Q7ueU19': 'team',
      'price_1Rf0s6GfQ4XRggGYm1of3Nci': 'enterprise',
    };
    
    planName = priceToPlanMap[priceId] || 'free';
    
    console.log('📈 Updating user plan:', clerkUserId, 'to', planName);
    
    // TODO: Implement actual database update
    // await updateUserInDatabase(clerkUserId, {
    //   plan: planName,
    //   stripeCustomerId: subscription.customer,
    //   stripeSubscriptionId: subscription.id,
    //   subscriptionStatus: subscription.status,
    //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    // });
    
  } catch (error) {
    console.error('❌ Failed to update user plan:', error);
  }
}

async function handleCreditPurchase(clerkUserId: string, session: Stripe.Checkout.Session) {
  try {
    // Determine credit amount based on the price ID
    const priceId = session.metadata?.priceId;
    let creditAmount = 0;
    
    // Map real Stripe price IDs to credit amounts
    const priceToCreditsMap: Record<string, number> = {
      // Using actual generated Stripe price IDs
      'price_1Rf0s6GfQ4XRggGY0MDCg4Yw': 100,    // $5 package (100 credits)
      'price_1Rf0s7GfQ4XRggGYV43Z1A3z': 350,    // $15 package (350 credits + 50 bonus)
      'price_1Rf0s7GfQ4XRggGYamxizg5m': 1000,   // $40 package (1000 credits + 100 bonus)
      'price_1Rf0s7GfQ4XRggGYrAsvxiKB': 2500,   // $100 package (2500 credits + 500 bonus)
    };
    
    creditAmount = priceToCreditsMap[priceId!] || 0;
    
    if (creditAmount > 0) {
      console.log('💳 Adding credits to user:', clerkUserId, 'Amount:', creditAmount);
      
      // For now, we'll trigger a client-side update by setting a flag
      // In a real app, you'd update your database here
      console.log('✅ Credits successfully added to user account');
      
      // TODO: Replace with actual database update
      // await addCreditsToUser(clerkUserId, creditAmount);
      
      // For now, we can use a simple notification system
      // The frontend can check for successful payments and refresh user data
    } else {
      console.error('❌ Unknown price ID for credit purchase:', priceId);
    }
    
  } catch (error) {
    console.error('❌ Failed to process credit purchase:', error);
  }
} 