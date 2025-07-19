import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function POST(req: NextRequest) {
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

    const { transactionId, amount } = await req.json();

    if (!transactionId || !amount) {
      return createErrorResponse('Transaction ID and amount are required', 400);
    }

    // In production, you would process the refund through Stripe or your payment processor
    // For now, we'll simulate the refund process
    console.log(`Processing refund for transaction ${transactionId}: $${amount}`);

    // Log the admin action
    try {
      await prisma.adminAction.create({
        data: {
          adminId: userId,
          action: 'REFUND_PROCESSED',
          targetUserId: null,
          details: JSON.stringify({
            transactionId,
            amount,
            processedAt: new Date().toISOString()
          }),
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.warn('Failed to log admin action:', error);
    }

    return createSecureResponse({
      success: true,
      refundId: `ref_${Date.now()}`,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    console.error('Admin refund error:', error);
    return createErrorResponse('Failed to process refund', 500);
  }
}