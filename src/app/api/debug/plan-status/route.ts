import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function GET(request: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(request);
    if (authResult) {
      return authResult;
    }
    
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
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

    return createSecureResponse({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('❌ Debug plan status error:', error);
    return createErrorResponse(
      'Failed to debug plan status',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}