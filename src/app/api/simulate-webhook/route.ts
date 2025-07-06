import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Plan } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, plan = 'ULTRA' } = body;

    console.log('🧪 Simulating webhook for checkout session:', sessionId);
    console.log('👤 User ID:', userId);
    console.log('📋 Plan to set:', plan);

    // Direct plan update using database
    try {
      // Validate plan
      const validPlans = ['FREE', 'PRO', 'ULTRA', 'ENTERPRISE'];
      if (!validPlans.includes(plan)) {
        throw new Error(`Invalid plan: ${plan}`);
      }

      try {
        // Try to update user in database first
        const updatedUser = await prisma.user.upsert({
          where: { clerkId: userId },
          update: {
            plan: plan as Plan
          },
          create: {
            clerkId: userId,
            email: 'simulated@example.com',
            plan: plan as Plan
          }
        });

        console.log('✅ Simulated webhook completed successfully - DATABASE update');
        console.log('📋 Updated plan data:', { userId, plan: updatedUser.plan });
        
        return NextResponse.json({
          success: true,
          message: `Successfully upgraded plan to ${plan} in database`,
          data: {
            plan: updatedUser.plan,
            subscriptionStatus: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            updatedAt: updatedUser.updatedAt
          }
        });

      } catch (dbError) {
        console.error('❌ Database error in simulation, falling back to memory:', dbError);
        
        // Fallback to in-memory store
        const { userPlans } = await import('@/app/api/user/plan/route');
        
        const userPlan = {
          plan: plan as 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE',
          stripeCustomerId: 'simulated_customer',
          stripeSubscriptionId: 'simulated_subscription',
          subscriptionStatus: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };

        userPlans.set(userId, userPlan);
        
        console.log('✅ Simulated webhook completed successfully - MEMORY fallback');
        console.log('📋 Updated plan data:', { userId, plan: userPlan.plan });
        
        return NextResponse.json({
          success: true,
          message: `Successfully upgraded plan to ${plan} in memory (DB unavailable)`,
          data: {
            plan: userPlan.plan,
            subscriptionStatus: userPlan.subscriptionStatus,
            currentPeriodEnd: userPlan.currentPeriodEnd,
            updatedAt: userPlan.updatedAt
          }
        });
      }

    } catch (error) {
      console.error('❌ Simulated webhook failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to simulate webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Simulate webhook error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to simulate webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}