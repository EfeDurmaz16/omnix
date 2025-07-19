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

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get overview metrics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: startDate
        }
      }
    });

    // Get revenue data (mock for now, implement with actual billing data)
    const totalRevenue = 45750; // You'll need to calculate from actual billing
    
    // Get credits usage
    const creditsUsage = await prisma.creditTransaction.aggregate({
      where: {
        type: 'USAGE',
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        amount: true
      }
    });

    // Get plan distribution
    const planDistribution = await prisma.user.groupBy({
      by: ['plan'],
      _count: {
        plan: true
      }
    });

    const formattedPlanDistribution = planDistribution.map(p => ({
      plan: p.plan,
      users: p._count.plan,
      revenue: getPlanRevenue(p.plan, p._count.plan), // Mock calculation
      percentage: (p._count.plan / totalUsers) * 100
    }));

    // Get model usage (you'll need to track this in your system)
    const modelUsage = [
      { model: 'gpt-4o', requests: 15420, credits: 308400, percentage: 28.5 },
      { model: 'claude-3-5-sonnet-20241022', requests: 12350, credits: 247000, percentage: 22.8 },
      { model: 'gpt-4o-mini', requests: 8900, credits: 89000, percentage: 16.4 },
      { model: 'gemini-1.5-pro', requests: 6780, credits: 135600, percentage: 12.5 },
      { model: 'dall-e-3', requests: 4230, credits: 169200, percentage: 7.8 }
    ];

    // Get top users by usage
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        plan: true,
        credits: true
      },
      orderBy: {
        credits: 'desc'
      },
      take: 5
    });

    const topUsersWithUsage = await Promise.all(
      topUsers.map(async (user) => {
        const usage = await prisma.creditTransaction.aggregate({
          where: {
            userId: user.clerkId, // Use clerkId for transactions
            type: 'USAGE',
            createdAt: {
              gte: startDate
            }
          },
          _sum: {
            amount: true
          },
          _count: {
            id: true
          }
        });

        return {
          ...user,
          creditsUsed: Math.abs(usage._sum.amount || 0),
          requests: usage._count.id
        };
      })
    );

    const analytics = {
      overview: {
        totalUsers,
        activeUsers,
        totalRevenue,
        totalCreditsUsed: Math.abs(creditsUsage._sum.amount || 0),
        averageSessionTime: 24.5, // Mock data
        conversionRate: activeUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
      },
      userGrowth: getUserGrowthData(timeRange), // Mock implementation
      planDistribution: formattedPlanDistribution,
      modelUsage,
      revenueMetrics: getRevenueMetrics(timeRange), // Mock implementation
      topUsers: topUsersWithUsage
    };

    return createSecureResponse(analytics);

  } catch (error) {
    console.error('Admin analytics error:', error);
    return createErrorResponse('Failed to fetch analytics', 500);
  }
}

function getPlanRevenue(plan: string, userCount: number): number {
  const planPrices = {
    'FREE': 0,
    'PRO': 20,
    'ULTRA': 50,
    'TEAM': 100
  };
  return (planPrices[plan as keyof typeof planPrices] || 0) * userCount;
}

function getUserGrowthData(timeRange: string) {
  // Mock implementation - replace with actual data
  return [
    { period: 'Week 1', newUsers: 45, churn: 3, growth: 93.3 },
    { period: 'Week 2', newUsers: 52, churn: 5, growth: 90.4 },
    { period: 'Week 3', newUsers: 38, churn: 7, growth: 81.6 },
    { period: 'Week 4', newUsers: 61, churn: 4, growth: 93.4 }
  ];
}

function getRevenueMetrics(timeRange: string) {
  // Mock implementation - replace with actual billing data
  return [
    { period: 'Jan', revenue: 12400, growth: 15.2 },
    { period: 'Feb', revenue: 14800, growth: 19.4 },
    { period: 'Mar', revenue: 16200, growth: 9.5 },
    { period: 'Apr', revenue: 18750, growth: 15.7 }
  ];
}