import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';
import { Plan as UserPlan } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: adminUserId } = await auth();
    if (!adminUserId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check admin role
    const adminUser = await prisma.user.findUnique({
      where: { clerkId: adminUserId },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return createErrorResponse('Admin access required', 403);
    }

    const { plan } = await req.json();
    
    if (!['FREE', 'PRO', 'ULTRA', 'TEAM'].includes(plan)) {
      return createErrorResponse('Invalid plan', 400);
    }

    // Update user plan
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { 
        plan: plan as UserPlan,
        updatedAt: new Date()
      }
    });

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: adminUserId,
        action: 'PLAN_UPDATE',
        targetUserId: params.userId,
        details: JSON.stringify({
          oldPlan: updatedUser.plan,
          newPlan: plan
        }),
        createdAt: new Date()
      }
    }).catch(() => {
      // Ignore if AdminAction table doesn't exist yet
    });

    return createSecureResponse({ 
      user: updatedUser,
      message: 'Plan updated successfully'
    });

  } catch (error) {
    console.error('Admin plan update error:', error);
    return createErrorResponse('Failed to update plan', 500);
  }
}