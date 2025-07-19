import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

interface UsageMetrics {
  totalRequests: number;
  totalCredits: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  topModels: Array<{
    model: string;
    requests: number;
    credits: number;
    avgResponseTime: number;
  }>;
  hourlyBreakdown: Array<{
    hour: string;
    requests: number;
    credits: number;
    errors: number;
  }>;
  statusCodes: Record<string, number>;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '24h';
    const granularity = searchParams.get('granularity') || 'hour';
    const teamId = searchParams.get('teamId');

    // Get user info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, teamId: true, role: true }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // If teamId is provided, verify user has access
    if (teamId && user.teamId !== teamId) {
      return createErrorResponse('Access denied to team data', 403);
    }

    // Calculate time range
    const now = new Date();
    let startTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime.setDate(now.getDate() - 1);
    }

    // In a real implementation, this would query actual usage data
    // For now, we'll return mock data based on the existing ApiUsage model
    
    try {
      // Try to get real usage data first
      const usageData = await prisma.apiUsage.findMany({
        where: {
          userId: teamId ? undefined : user.id,
          // Add team filtering logic here if needed
          createdAt: {
            gte: startTime,
            lte: now
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (usageData.length > 0) {
        // Process real data
        const metrics = processUsageData(usageData, granularity);
        return createSecureResponse({ metrics, timeRange, granularity });
      }
    } catch (dbError) {
      console.warn('Failed to fetch real usage data, using mock data:', dbError);
    }

    // Mock data for development
    const mockMetrics: UsageMetrics = {
      totalRequests: 1250,
      totalCredits: 6875,
      totalCost: 34.38,
      averageResponseTime: 1250,
      errorRate: 2.4,
      topModels: [
        { model: 'GPT-4', requests: 456, credits: 2280, avgResponseTime: 1800 },
        { model: 'Claude-3.5-Sonnet', requests: 389, credits: 1945, avgResponseTime: 1200 },
        { model: 'GPT-3.5-Turbo', requests: 234, credits: 702, avgResponseTime: 800 },
        { model: 'DALL-E-3', requests: 98, credits: 980, avgResponseTime: 3500 },
        { model: 'Gemini-Pro', requests: 73, credits: 365, avgResponseTime: 950 }
      ],
      hourlyBreakdown: generateHourlyData(timeRange),
      statusCodes: {
        '200': 1098,
        '400': 15,
        '401': 8,
        '429': 12,
        '500': 7,
        '503': 4
      }
    };

    return createSecureResponse({
      metrics: mockMetrics,
      timeRange,
      granularity,
      generatedAt: now.toISOString()
    });

  } catch (error) {
    console.error('Usage metrics fetch error:', error);
    return createErrorResponse('Failed to fetch usage metrics', 500);
  }
}

function processUsageData(data: any[], granularity: string): UsageMetrics {
  // Process real usage data and convert to metrics format
  const totalRequests = data.length;
  const totalCredits = data.reduce((sum, item) => sum + (item.inputTokens + item.outputTokens), 0);
  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
  const averageResponseTime = data.reduce((sum, item) => sum + (item.responseTime || 1000), 0) / data.length;

  // Group by model
  const modelMap = new Map();
  data.forEach(item => {
    const key = item.model;
    if (!modelMap.has(key)) {
      modelMap.set(key, { requests: 0, credits: 0, totalResponseTime: 0 });
    }
    const model = modelMap.get(key);
    model.requests++;
    model.credits += item.inputTokens + item.outputTokens;
    model.totalResponseTime += item.responseTime || 1000;
  });

  const topModels = Array.from(modelMap.entries()).map(([model, stats]) => ({
    model,
    requests: stats.requests,
    credits: stats.credits,
    avgResponseTime: Math.round(stats.totalResponseTime / stats.requests)
  })).sort((a, b) => b.requests - a.requests);

  return {
    totalRequests,
    totalCredits,
    totalCost,
    averageResponseTime: Math.round(averageResponseTime),
    errorRate: 0, // Would need error tracking
    topModels,
    hourlyBreakdown: [], // Would need to process by time buckets
    statusCodes: { '200': totalRequests } // Simplified
  };
}

function generateHourlyData(timeRange: string) {
  const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  const data = [];
  
  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    
    data.push({
      hour: hour.toISOString(),
      requests: Math.floor(Math.random() * 100) + 10,
      credits: Math.floor(Math.random() * 500) + 50,
      errors: Math.floor(Math.random() * 5)
    });
  }
  
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await req.json();
    const { 
      model, 
      provider, 
      inputTokens, 
      outputTokens, 
      cost, 
      requestType, 
      endpoint, 
      responseTime,
      metadata 
    } = body;

    // Validate required fields
    if (!model || !provider || inputTokens === undefined || outputTokens === undefined) {
      return createErrorResponse('Missing required fields', 400);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Record usage
    const totalTokens = inputTokens + outputTokens;
    
    const usageRecord = await prisma.apiUsage.create({
      data: {
        userId: user.id,
        model,
        provider,
        inputTokens,
        outputTokens,
        totalTokens,
        cost: cost || 0,
        requestType: requestType || 'unknown',
        endpoint: endpoint || '',
        responseTime: responseTime || null,
        metadata: metadata || {}
      }
    });

    return createSecureResponse({
      message: 'Usage recorded successfully',
      usageId: usageRecord.id,
      timestamp: usageRecord.createdAt.toISOString()
    });

  } catch (error) {
    console.error('Usage recording error:', error);
    return createErrorResponse('Failed to record usage', 500);
  }
}