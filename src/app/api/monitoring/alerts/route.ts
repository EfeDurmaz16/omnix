import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

interface Alert {
  id: string;
  type: 'CREDIT_LOW' | 'USAGE_HIGH' | 'PAYMENT_FAILED' | 'PLAN_EXPIRY' | 'RATE_LIMIT' | 'SYSTEM_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  userId?: string;
  teamId?: string;
  isRead: boolean;
  metadata?: any;
  createdAt: Date;
  expiresAt?: Date;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');

    // Get user info to check for team membership
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, teamId: true, role: true }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Mock alerts data (in a real implementation, this would come from a database)
    const mockAlerts: Alert[] = [
      {
        id: 'alert_1',
        type: 'CREDIT_LOW',
        severity: 'MEDIUM',
        title: 'Credits Running Low',
        message: 'You have only 500 credits remaining. Consider purchasing more to avoid service interruption.',
        userId: user.id,
        isRead: false,
        metadata: { creditsRemaining: 500, threshold: 1000 },
        createdAt: new Date('2024-01-20T10:30:00Z')
      },
      {
        id: 'alert_2',
        type: 'USAGE_HIGH',
        severity: 'HIGH',
        title: 'Unusual Usage Spike',
        message: 'Your usage has increased 300% compared to last week. Review your applications for potential issues.',
        userId: user.id,
        isRead: false,
        metadata: { currentUsage: 2500, previousUsage: 625, increase: 300 },
        createdAt: new Date('2024-01-20T09:15:00Z')
      },
      {
        id: 'alert_3',
        type: 'PAYMENT_FAILED',
        severity: 'CRITICAL',
        title: 'Payment Failed',
        message: 'Your payment method was declined. Please update your payment information to continue service.',
        userId: user.id,
        isRead: true,
        metadata: { amount: 100.00, paymentMethod: 'card_***4242' },
        createdAt: new Date('2024-01-19T14:22:00Z')
      },
      {
        id: 'alert_4',
        type: 'PLAN_EXPIRY',
        severity: 'MEDIUM',
        title: 'Plan Renewal Reminder',
        message: 'Your TEAM plan will renew in 3 days. Next charge: $90.00 (10% discount applied).',
        userId: user.id,
        isRead: true,
        metadata: { daysUntilRenewal: 3, amount: 90.00, discount: 10 },
        createdAt: new Date('2024-01-18T08:00:00Z')
      },
      {
        id: 'alert_5',
        type: 'RATE_LIMIT',
        severity: 'LOW',
        title: 'Rate Limit Approached',
        message: 'You\'ve used 80% of your hourly rate limit. Consider implementing request throttling.',
        userId: user.id,
        isRead: false,
        metadata: { currentRequests: 800, limit: 1000, timeWindow: 'hour' },
        createdAt: new Date('2024-01-20T11:45:00Z')
      }
    ];

    // Filter alerts based on query parameters
    let filteredAlerts = mockAlerts;

    if (unreadOnly) {
      filteredAlerts = filteredAlerts.filter(alert => !alert.isRead);
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }

    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    // Sort by creation date (newest first) and limit
    filteredAlerts = filteredAlerts
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    // Get unread count
    const unreadCount = mockAlerts.filter(alert => !alert.isRead).length;

    return createSecureResponse({
      alerts: filteredAlerts.map(alert => ({
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        expiresAt: alert.expiresAt?.toISOString()
      })),
      total: filteredAlerts.length,
      unreadCount,
      pagination: {
        limit,
        hasMore: mockAlerts.length > limit
      }
    });

  } catch (error) {
    console.error('Alerts fetch error:', error);
    return createErrorResponse('Failed to fetch alerts', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await req.json();
    const { alertIds, action } = body;

    if (!alertIds || !Array.isArray(alertIds) || !action) {
      return createErrorResponse('Invalid request body', 400);
    }

    // Validate action
    if (!['mark_read', 'mark_unread', 'dismiss'].includes(action)) {
      return createErrorResponse('Invalid action', 400);
    }

    // In a real implementation, this would update the database
    console.log(`Performing action ${action} on alerts:`, alertIds);

    // Mock response
    const updatedCount = alertIds.length;

    return createSecureResponse({
      message: `Successfully ${action.replace('_', ' ')} ${updatedCount} alert(s)`,
      updatedCount,
      action
    });

  } catch (error) {
    console.error('Alert action error:', error);
    return createErrorResponse('Failed to update alerts', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await req.json();
    const { preferences } = body;

    if (!preferences) {
      return createErrorResponse('Preferences are required', 400);
    }

    // Validate preferences structure
    const validTypes = ['CREDIT_LOW', 'USAGE_HIGH', 'PAYMENT_FAILED', 'PLAN_EXPIRY', 'RATE_LIMIT', 'SYSTEM_ERROR'];
    const validChannels = ['email', 'push', 'dashboard'];

    for (const [type, settings] of Object.entries(preferences)) {
      if (!validTypes.includes(type)) {
        return createErrorResponse(`Invalid alert type: ${type}`, 400);
      }
      
      if (typeof settings !== 'object' || !settings.enabled === undefined) {
        return createErrorResponse(`Invalid settings for ${type}`, 400);
      }
    }

    // In a real implementation, this would save to the database
    console.log('Saving alert preferences:', preferences);

    return createSecureResponse({
      message: 'Alert preferences updated successfully',
      preferences
    });

  } catch (error) {
    console.error('Alert preferences update error:', error);
    return createErrorResponse('Failed to update alert preferences', 500);
  }
}