import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  timestamp: string;
  services: {
    database: ServiceStatus;
    auth: ServiceStatus;
    storage: ServiceStatus;
    ai_providers: {
      openai: ServiceStatus;
      anthropic: ServiceStatus;
      google: ServiceStatus;
    };
  };
  metrics: {
    activeUsers: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
}

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
  uptime: number;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Perform health checks
    const healthData = await performHealthChecks();

    return createSecureResponse(healthData);

  } catch (error) {
    console.error('Health check error:', error);
    return createErrorResponse('Failed to perform health check', 500);
  }
}

async function performHealthChecks(): Promise<SystemHealth> {
  const startTime = Date.now();
  
  // Database health check
  const databaseHealth = await checkDatabaseHealth();
  
  // Auth service health check
  const authHealth = await checkAuthHealth();
  
  // Storage health check
  const storageHealth = await checkStorageHealth();
  
  // AI providers health check
  const aiProvidersHealth = await checkAIProvidersHealth();
  
  // System metrics
  const metrics = await getSystemMetrics();
  
  // Generate alerts based on health status
  const alerts = generateHealthAlerts(databaseHealth, authHealth, storageHealth, aiProvidersHealth, metrics);
  
  // Determine overall system status
  const overallStatus = determineOverallStatus(databaseHealth, authHealth, storageHealth, aiProvidersHealth);
  
  return {
    status: overallStatus,
    uptime: Math.floor((Date.now() - (Date.now() - 86400000)) / 1000), // Mock 24h uptime
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: databaseHealth,
      auth: authHealth,
      storage: storageHealth,
      ai_providers: aiProvidersHealth
    },
    metrics,
    alerts
  };
}

async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Simple database connectivity test
    await prisma.user.findFirst({
      select: { id: true },
      take: 1
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'operational' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString(),
      uptime: 99.9 // Mock uptime percentage
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      uptime: 99.9
    };
  }
}

async function checkAuthHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Mock auth service check
    // In a real implementation, this would test Clerk's API
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'operational',
      responseTime,
      lastChecked: new Date().toISOString(),
      uptime: 99.95
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      uptime: 99.95
    };
  }
}

async function checkStorageHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Mock storage health check
    // In a real implementation, this would test cloud storage connectivity
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'operational',
      responseTime,
      lastChecked: new Date().toISOString(),
      uptime: 99.8
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      uptime: 99.8
    };
  }
}

async function checkAIProvidersHealth(): Promise<{
  openai: ServiceStatus;
  anthropic: ServiceStatus;
  google: ServiceStatus;
}> {
  // Mock AI provider health checks
  // In a real implementation, these would test actual API endpoints
  
  return {
    openai: {
      status: 'operational',
      responseTime: 850,
      lastChecked: new Date().toISOString(),
      uptime: 99.5
    },
    anthropic: {
      status: 'operational',
      responseTime: 720,
      lastChecked: new Date().toISOString(),
      uptime: 99.7
    },
    google: {
      status: 'degraded',
      responseTime: 2100,
      lastChecked: new Date().toISOString(),
      uptime: 98.9
    }
  };
}

async function getSystemMetrics() {
  // Mock system metrics
  // In a real implementation, these would come from actual monitoring tools
  
  return {
    activeUsers: Math.floor(Math.random() * 100) + 50,
    requestsPerMinute: Math.floor(Math.random() * 500) + 100,
    averageResponseTime: Math.floor(Math.random() * 500) + 200,
    errorRate: Math.random() * 2, // 0-2%
    memoryUsage: Math.random() * 30 + 40, // 40-70%
    cpuUsage: Math.random() * 20 + 10 // 10-30%
  };
}

function generateHealthAlerts(
  database: ServiceStatus,
  auth: ServiceStatus,
  storage: ServiceStatus,
  aiProviders: { openai: ServiceStatus; anthropic: ServiceStatus; google: ServiceStatus },
  metrics: any
): Array<{ level: 'info' | 'warning' | 'error'; message: string; timestamp: string }> {
  const alerts = [];
  const now = new Date().toISOString();
  
  // Database alerts
  if (database.status === 'down') {
    alerts.push({
      level: 'error',
      message: 'Database is down - immediate attention required',
      timestamp: now
    });
  } else if (database.status === 'degraded') {
    alerts.push({
      level: 'warning',
      message: `Database response time elevated: ${database.responseTime}ms`,
      timestamp: now
    });
  }
  
  // Auth service alerts
  if (auth.status === 'down') {
    alerts.push({
      level: 'error',
      message: 'Authentication service is down',
      timestamp: now
    });
  }
  
  // AI provider alerts
  if (aiProviders.google.status === 'degraded') {
    alerts.push({
      level: 'warning',
      message: 'Google AI services experiencing degraded performance',
      timestamp: now
    });
  }
  
  // Metrics-based alerts
  if (metrics.errorRate > 1) {
    alerts.push({
      level: 'warning',
      message: `Error rate elevated: ${metrics.errorRate.toFixed(2)}%`,
      timestamp: now
    });
  }
  
  if (metrics.memoryUsage > 80) {
    alerts.push({
      level: 'warning',
      message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
      timestamp: now
    });
  }
  
  if (metrics.cpuUsage > 70) {
    alerts.push({
      level: 'warning',
      message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
      timestamp: now
    });
  }
  
  // Add info alert if everything is healthy
  if (alerts.length === 0) {
    alerts.push({
      level: 'info',
      message: 'All systems operational',
      timestamp: now
    });
  }
  
  return alerts;
}

function determineOverallStatus(
  database: ServiceStatus,
  auth: ServiceStatus,
  storage: ServiceStatus,
  aiProviders: { openai: ServiceStatus; anthropic: ServiceStatus; google: ServiceStatus }
): 'healthy' | 'degraded' | 'down' {
  // Critical services
  if (database.status === 'down' || auth.status === 'down') {
    return 'down';
  }
  
  // Check for any degraded services
  const services = [database, auth, storage, ...Object.values(aiProviders)];
  const hasDownServices = services.some(service => service.status === 'down');
  const hasDegradedServices = services.some(service => service.status === 'degraded');
  
  if (hasDownServices) {
    return 'degraded';
  }
  
  if (hasDegradedServices) {
    return 'degraded';
  }
  
  return 'healthy';
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'force_health_check':
        const healthData = await performHealthChecks();
        return createSecureResponse({
          message: 'Health check completed',
          health: healthData
        });
        
      case 'clear_alerts':
        // In a real implementation, this would clear system alerts
        return createSecureResponse({
          message: 'System alerts cleared'
        });
        
      default:
        return createErrorResponse('Invalid action', 400);
    }

  } catch (error) {
    console.error('Health action error:', error);
    return createErrorResponse('Failed to perform health action', 500);
  }
}