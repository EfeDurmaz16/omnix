import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Manual fix endpoint for immediate plan updates when webhooks fail
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await request.json();
    
    console.log('🔧 MANUAL FIX - Forcing plan update for user:', userId, 'to plan:', plan);

    // Validate plan
    const validPlans = ['FREE', 'PRO', 'ULTRA', 'ENTERPRISE'];
    if (!validPlans.includes(plan.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planName = plan.toUpperCase();

    // Set appropriate credits based on plan
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
      // Update in database
      const { prisma } = await import('@/lib/db');
      
      const updatedUser = await prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          plan: planName as any,
          credits: credits
        },
        create: {
          clerkId: userId,
          email: `${userId}@manual-fix.com`,
          plan: planName as any,
          credits: credits
        }
      });

      console.log('✅ MANUAL FIX - Database updated:', { plan: updatedUser.plan, credits: updatedUser.credits });

      // Also update memory store
      const { userPlans } = await import('@/app/api/user/plan/route');
      userPlans.set(userId, {
        plan: planName as 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE',
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });

      console.log('✅ MANUAL FIX - Memory store updated');

      return NextResponse.json({
        success: true,
        message: `Plan manually updated to ${planName} with ${credits} credits`,
        data: {
          plan: updatedUser.plan,
          credits: updatedUser.credits,
          updatedAt: updatedUser.updatedAt
        }
      });

    } catch (dbError) {
      console.error('❌ MANUAL FIX - Database error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update database',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ MANUAL FIX - Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Manual fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}