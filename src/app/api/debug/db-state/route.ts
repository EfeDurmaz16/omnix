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

    // Get current user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    // Get all users for debugging
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        plan: true,
        credits: true,
        updatedAt: true
      }
    });

    return createSecureResponse({
      success: true,
      data: {
        currentUser: user,
        allUsers: allUsers,
        userCount: allUsers.length
      }
    });

  } catch (error) {
    console.error('❌ Database state check error:', error);
    return createErrorResponse(
      'Failed to check database state',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}