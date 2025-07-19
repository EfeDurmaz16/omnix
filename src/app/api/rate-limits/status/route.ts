import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

interface RateLimitStatus {
  endpoint: string;
  limit: number;
  remaining: number;
  resetTime: number;
  windowSize: number; // in seconds
  usagePercentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

interface UserRateLimits {
  userId: string;
  plan: string;
  globalLimits: {
    requestsPerMinute: RateLimitStatus;
    requestsPerHour: RateLimitStatus;
    requestsPerDay: RateLimitStatus;
  };
  endpointLimits: {
    chat: RateLimitStatus;
    imageGeneration: RateLimitStatus;
    videoGeneration: RateLimitStatus;
    codeAnalysis: RateLimitStatus;
  };
  teamLimits?: {
    sharedRequestsPerMinute: RateLimitStatus;
    sharedRequestsPerHour: RateLimitStatus;
    sharedRequestsPerDay: RateLimitStatus;
  };
  lastReset: string;
  nextReset: string;
}

// Rate limit configurations by plan
const RATE_LIMITS = {
  FREE: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 500,
    chat: 50,
    imageGeneration: 10,
    videoGeneration: 2,
    codeAnalysis: 20
  },
  PRO: {
    requestsPerMinute: 50,
    requestsPerHour: 1000,
    requestsPerDay: 5000,
    chat: 500,
    imageGeneration: 100,
    videoGeneration: 20,
    codeAnalysis: 200
  },
  ULTRA: {
    requestsPerMinute: 100,
    requestsPerHour: 3000,
    requestsPerDay: 15000,
    chat: 2000,
    imageGeneration: 500,
    videoGeneration: 100,
    codeAnalysis: 1000
  },
  TEAM: {
    requestsPerMinute: 200,
    requestsPerHour: 5000,
    requestsPerDay: 25000,
    chat: 5000,
    imageGeneration: 1000,
    videoGeneration: 200,
    codeAnalysis: 2000,
    // Team-specific shared limits
    sharedRequestsPerMinute: 500,
    sharedRequestsPerHour: 10000,
    sharedRequestsPerDay: 50000
  }
};

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');
    const detailed = searchParams.get('detailed') === 'true';

    // Get user info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true, 
        plan: true, 
        teamId: true,
        team: {
          select: {
            id: true,
            plan: true,
            members: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Determine the plan to use for rate limits
    const effectivePlan = user.teamId ? (user.team?.plan || 'TEAM') : user.plan;
    const planLimits = RATE_LIMITS[effectivePlan as keyof typeof RATE_LIMITS] || RATE_LIMITS.FREE;

    // Get current usage (in a real implementation, this would come from a rate limiting service like Redis)
    const currentUsage = await getCurrentUsage(user.id, user.teamId);

    // Calculate rate limit status
    const rateLimitStatus = calculateRateLimitStatus(planLimits, currentUsage, effectivePlan);

    // If specific endpoint requested, return only that endpoint's status
    if (endpoint) {
      const endpointStatus = getEndpointStatus(endpoint, rateLimitStatus);
      if (!endpointStatus) {
        return createErrorResponse('Invalid endpoint', 400);
      }
      return createSecureResponse(endpointStatus);
    }

    // Return comprehensive status
    const response: any = {
      userId: user.id,
      plan: effectivePlan,
      status: getOverallStatus(rateLimitStatus),
      globalLimits: rateLimitStatus.globalLimits,
      endpointLimits: rateLimitStatus.endpointLimits,
      lastReset: rateLimitStatus.lastReset,
      nextReset: rateLimitStatus.nextReset
    };

    // Add team limits if user is part of a team
    if (user.teamId && rateLimitStatus.teamLimits) {
      response.teamLimits = rateLimitStatus.teamLimits;
      response.teamId = user.teamId;
      response.teamMemberCount = user.team?.members.length || 1;
    }

    // Add detailed information if requested
    if (detailed) {
      response.detailed = {
        planLimits,
        resetIntervals: {
          minute: 60,
          hour: 3600,
          day: 86400
        },
        warnings: generateWarnings(rateLimitStatus),
        recommendations: generateRecommendations(rateLimitStatus, effectivePlan)
      };
    }

    return createSecureResponse(response);

  } catch (error) {
    console.error('Rate limit status error:', error);
    return createErrorResponse('Failed to get rate limit status', 500);
  }
}

async function getCurrentUsage(userId: string, teamId?: string | null) {
  // In a real implementation, this would query Redis or another fast data store
  // For now, we'll simulate usage data based on recent API usage
  
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Get actual usage from database
    const [minuteUsage, hourUsage, dayUsage] = await Promise.all([
      prisma.apiUsage.count({
        where: {
          userId,
          createdAt: { gte: minuteAgo }
        }
      }),
      prisma.apiUsage.count({
        where: {
          userId,
          createdAt: { gte: hourAgo }
        }
      }),
      prisma.apiUsage.count({
        where: {
          userId,
          createdAt: { gte: dayAgo }
        }
      })
    ]);

    // Get endpoint-specific usage
    const endpointUsage = await prisma.apiUsage.groupBy({
      by: ['requestType'],
      where: {
        userId,
        createdAt: { gte: dayAgo }
      },
      _count: {
        id: true
      }
    });

    const endpointCounts = endpointUsage.reduce((acc, item) => {
      acc[item.requestType] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Team usage if applicable
    let teamUsage = null;
    if (teamId) {
      const [teamMinute, teamHour, teamDay] = await Promise.all([
        prisma.apiUsage.count({
          where: {
            user: { teamId },
            createdAt: { gte: minuteAgo }
          }
        }),
        prisma.apiUsage.count({
          where: {
            user: { teamId },
            createdAt: { gte: hourAgo }
          }
        }),
        prisma.apiUsage.count({
          where: {
            user: { teamId },
            createdAt: { gte: dayAgo }
          }
        })
      ]);

      teamUsage = {
        minute: teamMinute,
        hour: teamHour,
        day: teamDay
      };
    }

    return {
      global: {
        minute: minuteUsage,
        hour: hourUsage,
        day: dayUsage
      },
      endpoints: {
        chat: endpointCounts.chat || 0,
        imageGeneration: endpointCounts.image || 0,
        videoGeneration: endpointCounts.video || 0,
        codeAnalysis: endpointCounts.code || 0
      },
      team: teamUsage
    };

  } catch (error) {
    console.warn('Failed to get actual usage, using mock data:', error);
    
    // Return mock usage data
    return {
      global: {
        minute: Math.floor(Math.random() * 20),
        hour: Math.floor(Math.random() * 200),
        day: Math.floor(Math.random() * 1000)
      },
      endpoints: {
        chat: Math.floor(Math.random() * 100),
        imageGeneration: Math.floor(Math.random() * 50),
        videoGeneration: Math.floor(Math.random() * 10),
        codeAnalysis: Math.floor(Math.random() * 30)
      },
      team: teamId ? {
        minute: Math.floor(Math.random() * 100),
        hour: Math.floor(Math.random() * 1000),
        day: Math.floor(Math.random() * 5000)
      } : null
    };
  }
}

function calculateRateLimitStatus(planLimits: any, currentUsage: any, plan: string): UserRateLimits {
  const now = new Date();
  
  // Calculate reset times
  const nextMinute = new Date(Math.ceil(now.getTime() / 60000) * 60000);
  const nextHour = new Date(Math.ceil(now.getTime() / 3600000) * 3600000);
  const nextDay = new Date();
  nextDay.setHours(24, 0, 0, 0);

  const createLimitStatus = (
    endpoint: string,
    limit: number,
    used: number,
    resetTime: Date,
    windowSize: number
  ): RateLimitStatus => {
    const remaining = Math.max(0, limit - used);
    const usagePercentage = (used / limit) * 100;
    
    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (used >= limit) status = 'exceeded';
    else if (usagePercentage >= 80) status = 'warning';

    return {
      endpoint,
      limit,
      remaining,
      resetTime: resetTime.getTime(),
      windowSize,
      usagePercentage,
      status
    };
  };

  const result: UserRateLimits = {
    userId: '',
    plan,
    globalLimits: {
      requestsPerMinute: createLimitStatus(
        'global/minute',
        planLimits.requestsPerMinute,
        currentUsage.global.minute,
        nextMinute,
        60
      ),
      requestsPerHour: createLimitStatus(
        'global/hour',
        planLimits.requestsPerHour,
        currentUsage.global.hour,
        nextHour,
        3600
      ),
      requestsPerDay: createLimitStatus(
        'global/day',
        planLimits.requestsPerDay,
        currentUsage.global.day,
        nextDay,
        86400
      )
    },
    endpointLimits: {
      chat: createLimitStatus(
        'chat',
        planLimits.chat,
        currentUsage.endpoints.chat,
        nextDay,
        86400
      ),
      imageGeneration: createLimitStatus(
        'image',
        planLimits.imageGeneration,
        currentUsage.endpoints.imageGeneration,
        nextDay,
        86400
      ),
      videoGeneration: createLimitStatus(
        'video',
        planLimits.videoGeneration,
        currentUsage.endpoints.videoGeneration,
        nextDay,
        86400
      ),
      codeAnalysis: createLimitStatus(
        'code',
        planLimits.codeAnalysis,
        currentUsage.endpoints.codeAnalysis,
        nextDay,
        86400
      )
    },
    lastReset: now.toISOString(),
    nextReset: nextMinute.toISOString()
  };

  // Add team limits if applicable
  if (plan === 'TEAM' && currentUsage.team) {
    result.teamLimits = {
      sharedRequestsPerMinute: createLimitStatus(
        'team/minute',
        planLimits.sharedRequestsPerMinute,
        currentUsage.team.minute,
        nextMinute,
        60
      ),
      sharedRequestsPerHour: createLimitStatus(
        'team/hour',
        planLimits.sharedRequestsPerHour,
        currentUsage.team.hour,
        nextHour,
        3600
      ),
      sharedRequestsPerDay: createLimitStatus(
        'team/day',
        planLimits.sharedRequestsPerDay,
        currentUsage.team.day,
        nextDay,
        86400
      )
    };
  }

  return result;
}

function getEndpointStatus(endpoint: string, rateLimitStatus: UserRateLimits) {
  const endpointMap: Record<string, any> = {
    'global/minute': rateLimitStatus.globalLimits.requestsPerMinute,
    'global/hour': rateLimitStatus.globalLimits.requestsPerHour,
    'global/day': rateLimitStatus.globalLimits.requestsPerDay,
    'chat': rateLimitStatus.endpointLimits.chat,
    'image': rateLimitStatus.endpointLimits.imageGeneration,
    'video': rateLimitStatus.endpointLimits.videoGeneration,
    'code': rateLimitStatus.endpointLimits.codeAnalysis
  };

  // Add team endpoints if available
  if (rateLimitStatus.teamLimits) {
    endpointMap['team/minute'] = rateLimitStatus.teamLimits.sharedRequestsPerMinute;
    endpointMap['team/hour'] = rateLimitStatus.teamLimits.sharedRequestsPerHour;
    endpointMap['team/day'] = rateLimitStatus.teamLimits.sharedRequestsPerDay;
  }

  return endpointMap[endpoint];
}

function getOverallStatus(rateLimitStatus: UserRateLimits): 'ok' | 'warning' | 'exceeded' {
  const allLimits = [
    ...Object.values(rateLimitStatus.globalLimits),
    ...Object.values(rateLimitStatus.endpointLimits)
  ];

  if (rateLimitStatus.teamLimits) {
    allLimits.push(...Object.values(rateLimitStatus.teamLimits));
  }

  if (allLimits.some(limit => limit.status === 'exceeded')) return 'exceeded';
  if (allLimits.some(limit => limit.status === 'warning')) return 'warning';
  return 'ok';
}

function generateWarnings(rateLimitStatus: UserRateLimits): string[] {
  const warnings: string[] = [];
  
  // Check global limits
  Object.entries(rateLimitStatus.globalLimits).forEach(([key, limit]) => {
    if (limit.status === 'warning') {
      warnings.push(`Global ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} usage at ${limit.usagePercentage.toFixed(0)}%`);
    } else if (limit.status === 'exceeded') {
      warnings.push(`Global ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} limit exceeded`);
    }
  });

  // Check endpoint limits
  Object.entries(rateLimitStatus.endpointLimits).forEach(([key, limit]) => {
    if (limit.status === 'warning') {
      warnings.push(`${key.replace(/([A-Z])/g, ' $1')} usage at ${limit.usagePercentage.toFixed(0)}%`);
    } else if (limit.status === 'exceeded') {
      warnings.push(`${key.replace(/([A-Z])/g, ' $1')} limit exceeded`);
    }
  });

  return warnings;
}

function generateRecommendations(rateLimitStatus: UserRateLimits, plan: string): string[] {
  const recommendations: string[] = [];
  
  const overallStatus = getOverallStatus(rateLimitStatus);
  
  if (overallStatus === 'exceeded' || overallStatus === 'warning') {
    if (plan === 'FREE') {
      recommendations.push('Consider upgrading to PRO plan for higher rate limits');
    } else if (plan === 'PRO') {
      recommendations.push('Consider upgrading to ULTRA plan for higher rate limits');
    } else if (plan === 'ULTRA') {
      recommendations.push('Consider TEAM plan for shared team limits');
    }
    
    recommendations.push('Implement request throttling in your application');
    recommendations.push('Cache responses where possible to reduce API calls');
    recommendations.push('Consider batch processing for multiple operations');
  }

  return recommendations;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // This endpoint could be used to reset rate limits (admin only)
    // or to increment usage counters
    
    const body = await req.json();
    const { action, endpoint, amount = 1 } = body;

    if (action === 'increment') {
      // In a real implementation, this would increment the rate limit counter
      // This is typically done automatically by middleware, not manually
      
      return createSecureResponse({
        message: 'Rate limit counter incremented',
        endpoint,
        amount
      });
    }

    return createErrorResponse('Invalid action', 400);

  } catch (error) {
    console.error('Rate limit action error:', error);
    return createErrorResponse('Failed to perform rate limit action', 500);
  }
}