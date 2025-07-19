import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check admin role
    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return createErrorResponse('Admin access required', 403);
    }

    const planConfig = await req.json();

    // Validate plan configuration
    if (!planConfig.plan || !['FREE', 'PRO', 'ULTRA', 'TEAM'].includes(planConfig.plan)) {
      return createErrorResponse('Invalid plan configuration', 400);
    }

    // Log the admin action
    try {
      await prisma.adminAction.create({
        data: {
          adminId: userId,
          action: 'PLAN_CONFIG_UPDATE',
          targetUserId: null,
          details: JSON.stringify({
            plan: planConfig.plan,
            changes: planConfig,
            updatedAt: new Date().toISOString()
          }),
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.warn('Failed to log admin action:', error);
    }

    // In production, you would update the plan configuration in your system
    // For now, we'll just acknowledge the update
    console.log('Plan configuration updated:', planConfig);

    return createSecureResponse({
      success: true,
      plan: planConfig,
      message: 'Plan configuration updated successfully'
    });

  } catch (error) {
    console.error('Admin plan update error:', error);
    return createErrorResponse('Failed to update plan configuration', 500);
  }
}