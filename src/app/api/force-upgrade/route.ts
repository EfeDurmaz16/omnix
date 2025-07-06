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

    console.log('🚨 FORCE UPGRADING USER TO ULTRA:', userId);

    // Force update in database with ULTRA credits (5000)
    const updatedUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        plan: Plan.ULTRA,
        credits: 5000 // ULTRA plan base credits
      },
      create: {
        clerkId: userId,
        email: `${userId}@upgrade.com`,
        plan: Plan.ULTRA,
        credits: 5000 // ULTRA plan base credits
      }
    });

    // Also update memory store
    const { userPlans } = await import('@/app/api/user/plan/route');
    userPlans.set(userId, {
      plan: 'ULTRA',
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });

    console.log('✅ FORCE UPGRADE COMPLETE - DATABASE:', updatedUser.plan);
    console.log('✅ FORCE UPGRADE COMPLETE - MEMORY: ULTRA');

    return NextResponse.json({
      success: true,
      message: 'ULTRA UPGRADE FORCED SUCCESSFULLY',
      data: {
        plan: updatedUser.plan,
        updatedAt: updatedUser.updatedAt,
        memoryUpdated: true,
        databaseUpdated: true
      }
    });

  } catch (error) {
    console.error('❌ Force upgrade error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to force upgrade',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}