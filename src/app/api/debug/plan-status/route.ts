import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check all possible sources of plan information
    const debugInfo = {
      userId,
      sources: {
        database: null as any,
        memory: null as any,
        localStorage_hint: 'Check localStorage in browser for plan info'
      }
    };

    // Check database
    try {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId }
      });
      debugInfo.sources.database = dbUser ? {
        plan: dbUser.plan,
        credits: dbUser.credits,
        updatedAt: dbUser.updatedAt
      } : 'NOT_FOUND';
    } catch (dbError) {
      debugInfo.sources.database = `ERROR: ${dbError}`;
    }

    // Check memory store
    try {
      const { userPlans } = await import('@/app/api/user/plan/route');
      const memoryPlan = userPlans.get(userId);
      debugInfo.sources.memory = memoryPlan || 'NOT_FOUND';
    } catch (memError) {
      debugInfo.sources.memory = `ERROR: ${memError}`;
    }

    console.log('🔍 PLAN DEBUG INFO:', JSON.stringify(debugInfo, null, 2));

    return NextResponse.json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('❌ Debug plan status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug plan status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}