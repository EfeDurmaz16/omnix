import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This endpoint simulates a Stripe webhook for testing in development
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, sessionMode = 'subscription' } = await request.json();

    console.log('🧪 TEST WEBHOOK - Simulating Stripe webhook:', { userId, priceId, sessionMode });

    // Map price IDs to plans (same as in webhook)
    const priceToPlanMap: Record<string, string> = {
      // Monthly plans
      'price_1Rf0s3GfQ4XRggGYLyPcWhKs': 'PRO',
      'price_1Rf0s4GfQ4XRggGYSB9ExPB6': 'PRO', 
      'price_1Rf0s5GfQ4XRggGYAmoZRtmz': 'ULTRA',
      'price_1Rf0s5GfQ4XRggGYNWPGsCZ7': 'ENTERPRISE',
      // Annual plans
      'price_1Rf0s4GfQ4XRggGYQGzx0EUS': 'PRO',
      'price_1Rf0s4GfQ4XRggGYyjhDkBNw': 'PRO',
      'price_1Rf0s5GfQ4XRggGY5Q7ueU19': 'ULTRA',
      'price_1Rf0s6GfQ4XRggGYm1of3Nci': 'ENTERPRISE',
    };

    const planName = priceToPlanMap[priceId] || 'FREE';

    if (sessionMode === 'subscription') {
      console.log('🧪 TEST WEBHOOK - Simulating subscription for plan:', planName);

      // Simulate calling the plan update API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/user/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId, // Custom header for webhook auth
        },
        body: JSON.stringify({
          plan: planName,
          stripeCustomerId: 'test_customer_' + Date.now(),
          stripeSubscriptionId: 'test_sub_' + Date.now(),
          subscriptionStatus: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ TEST WEBHOOK - Plan updated successfully');
        
        // Also update credits
        const { prisma } = await import('@/lib/db');
        let credits = 1500; // Default FREE credits
        switch (planName) {
          case 'PRO':
            credits = 3000;
            break;
          case 'ULTRA':
            credits = 5000;
            break;
          case 'ENTERPRISE':
            credits = 10000;
            break;
        }
        
        try {
          await prisma.user.update({
            where: { clerkId: userId },
            data: { credits: credits }
          });
          console.log('✅ TEST WEBHOOK - Credits updated');
        } catch (error) {
          console.error('❌ TEST WEBHOOK - Failed to update credits:', error);
        }

        return NextResponse.json({
          success: true,
          message: `Test webhook successful - plan updated to ${planName}`,
          data: { plan: planName, credits }
        });
      } else {
        throw new Error(result.error || 'Plan update failed');
      }
    } else {
      return NextResponse.json({
        success: true,
        message: 'Test webhook for credits - not implemented'
      });
    }

  } catch (error) {
    console.error('❌ TEST WEBHOOK - Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}