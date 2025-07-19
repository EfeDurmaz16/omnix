import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

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

    const { credits, reason } = await req.json();
    
    if (typeof credits !== 'number' || credits < 0) {
      return createErrorResponse('Invalid credits amount', 400);
    }

    // Get current user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { credits: true, clerkId: true }
    });

    if (!targetUser) {
      return createErrorResponse('User not found', 404);
    }

    const oldCredits = targetUser.credits;

    // Update user credits
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { 
        credits: credits,
        updatedAt: new Date()
      }
    });

    // Create credit transaction record
    const creditDifference = credits - oldCredits;
    if (creditDifference !== 0) {
      await prisma.creditTransaction.create({
        data: {
          userId: targetUser.clerkId,
          type: creditDifference > 0 ? 'BONUS' : 'ADJUSTMENT', // Use existing enum values
          amount: creditDifference > 0 ? creditDifference : -Math.abs(creditDifference),
          description: reason || `Admin ${creditDifference > 0 ? 'granted' : 'deducted'} credits`,
          createdAt: new Date()
        }
      });
    }

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: adminUserId,
        action: 'CREDITS_UPDATE',
        targetUserId: params.userId,
        details: JSON.stringify({
          oldCredits,
          newCredits: credits,
          difference: creditDifference,
          reason
        }),
        createdAt: new Date()
      }
    }).catch(() => {
      // Ignore if AdminAction table doesn't exist yet
    });

    return createSecureResponse({ 
      user: updatedUser,
      creditDifference,
      message: 'Credits updated successfully'
    });

  } catch (error) {
    console.error('Admin credits update error:', error);
    return createErrorResponse('Failed to update credits', 500);
  }
}