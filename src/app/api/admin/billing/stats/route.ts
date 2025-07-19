import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function GET(req: NextRequest) {
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

    // Mock billing stats - replace with actual data from your payment processor
    const stats = {
      totalRevenue: 45750.00,
      monthlyRevenue: 18750.00,
      pendingAmount: 2100.00,
      refundedAmount: 890.00,
      totalTransactions: 342,
      failedTransactions: 15,
      averageTransactionValue: 133.77,
      conversionRate: 95.6
    };

    return createSecureResponse({ stats });

  } catch (error) {
    console.error('Admin billing stats error:', error);
    return createErrorResponse('Failed to fetch billing stats', 500);
  }
}