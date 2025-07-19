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

    // Perform actual health checks
    const now = new Date().toISOString();
    
    // Test database connection
    let dbStatus = 'healthy';
    let dbQueryTime = 0;
    let dbConnections = 0;
    
    try {
      const start = Date.now();
      await prisma.user.count();
      dbQueryTime = Date.now() - start;
      dbConnections = 1; // Simple count for SQLite
    } catch (error) {
      dbStatus = 'down';
      console.error('Database health check failed:', error);
    }

    // Mock system metrics - in production, you'd get these from system monitoring
    const metrics = {
      api: {
        status: 'healthy' as const,
        responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
        uptime: 99.97,
        requestsPerMinute: Math.floor(Math.random() * 1000) + 1000,
        errorRate: Math.random() * 0.5,
        lastCheck: now
      },
      database: {
        status: dbStatus as 'healthy' | 'degraded' | 'down',
        connections: dbConnections,
        maxConnections: 100,
        queryTime: dbQueryTime,
        lastCheck: now
      },
      redis: {
        status: process.env.REDIS_URL ? 'healthy' : 'degraded' as const,
        memory: 512,
        maxMemory: 2048,
        connections: process.env.REDIS_URL ? 23 : 0,
        hitRate: 94.5,
        lastCheck: now
      },
      providers: [
        { 
          name: 'OpenAI', 
          status: 'healthy' as const, 
          responseTime: Math.floor(Math.random() * 1000) + 500,
          lastCheck: now, 
          errorRate: Math.random() * 0.2 
        },
        { 
          name: 'Anthropic', 
          status: 'healthy' as const, 
          responseTime: Math.floor(Math.random() * 1500) + 800,
          lastCheck: now, 
          errorRate: Math.random() * 0.1 
        },
        { 
          name: 'Google Vertex', 
          status: Math.random() > 0.8 ? 'degraded' : 'healthy' as const, 
          responseTime: Math.floor(Math.random() * 2000) + 1000,
          lastCheck: now, 
          errorRate: Math.random() * 1.5 
        },
        { 
          name: 'Replicate', 
          status: 'healthy' as const, 
          responseTime: Math.floor(Math.random() * 1000) + 1500,
          lastCheck: now, 
          errorRate: Math.random() * 0.5 
        }
      ],
      rateLimits: [
        { 
          endpoint: '/api/chat', 
          currentLoad: Math.floor(Math.random() * 800) + 100, 
          limit: 1000, 
          resetTime: new Date(Date.now() + 45000).toISOString() 
        },
        { 
          endpoint: '/api/generate/image', 
          currentLoad: Math.floor(Math.random() * 300) + 50, 
          limit: 500, 
          resetTime: new Date(Date.now() + 32000).toISOString() 
        },
        { 
          endpoint: '/api/generate/video', 
          currentLoad: Math.floor(Math.random() * 50) + 5, 
          limit: 100, 
          resetTime: new Date(Date.now() + 18000).toISOString() 
        }
      ],
      serverMetrics: {
        cpu: Math.random() * 60 + 20, // 20-80%
        memory: Math.random() * 40 + 40, // 40-80%
        disk: Math.random() * 30 + 30, // 30-60%
        network: Math.random() * 40 + 10 // 10-50%
      }
    };

    return createSecureResponse({ metrics });

  } catch (error) {
    console.error('Admin system health error:', error);
    return createErrorResponse('Failed to fetch system health', 500);
  }
}