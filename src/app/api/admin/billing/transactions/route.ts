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

    // For now, return mock data since we don't have actual billing transactions
    // In production, you'd fetch from Stripe or your payment processor
    const mockTransactions = [
      {
        id: 'txn_1',
        userId: 'user_1',
        userEmail: 'john@company.com',
        userName: 'John Smith',
        type: 'SUBSCRIPTION',
        amount: 100.00,
        currency: 'USD',
        status: 'COMPLETED',
        stripePaymentId: 'pi_1234567890',
        stripeCustomerId: 'cus_1234567890',
        planId: 'TEAM',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      },
      {
        id: 'txn_2',
        userId: 'user_2',
        userEmail: 'sarah@startup.io',
        userName: 'Sarah Johnson',
        type: 'CREDIT_PURCHASE',
        amount: 50.00,
        currency: 'USD',
        status: 'COMPLETED',
        stripePaymentId: 'pi_0987654321',
        creditsGranted: 2500,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      },
      {
        id: 'txn_3',
        userId: 'user_3',
        userEmail: 'mike@agency.com',
        userName: 'Mike Chen',
        type: 'SUBSCRIPTION',
        amount: 20.00,
        currency: 'USD',
        status: 'FAILED',
        stripePaymentId: 'pi_failed123',
        planId: 'PRO',
        createdAt: new Date().toISOString(),
        failureReason: 'Insufficient funds'
      }
    ];

    return createSecureResponse({
      transactions: mockTransactions,
      total: mockTransactions.length
    });

  } catch (error) {
    console.error('Admin billing transactions error:', error);
    return createErrorResponse('Failed to fetch transactions', 500);
  }
}