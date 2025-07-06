import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { userPlans } from '@/app/api/user/plan/route';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    // Validate plan
    const validPlans = ['FREE', 'PRO', 'ULTRA', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` }, 
        { status: 400 }
      );
    }

    // Update user plan directly for testing
    const userPlan = {
      plan: plan as 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE',
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      updatedAt: new Date()
    };

    userPlans.set(userId, userPlan);

    console.log('🧪 Test plan update:', { userId, plan });

    return NextResponse.json({
      success: true,
      message: `Plan updated to ${plan} for testing`,
      data: userPlan
    });

  } catch (error) {
    console.error('❌ Test plan update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update plan for testing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}