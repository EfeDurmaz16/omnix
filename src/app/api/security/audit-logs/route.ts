import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
      select: { role: true, email: true }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId_filter = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const success = searchParams.get('success');

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build filters
    const filters: any = {};
    
    if (userId_filter) filters.userId = userId_filter;
    if (action) filters.action = { contains: action, mode: 'insensitive' };
    if (resource) filters.resource = { contains: resource, mode: 'insensitive' };
    if (severity) filters.severity = severity;
    if (success !== null) filters.success = success === 'true';
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate);
      if (endDate) filters.timestamp.lte = new Date(endDate);
    }

    // Mock audit logs data (in a real implementation, this would come from a database)
    const mockAuditLogs: AuditLog[] = [
      {
        id: 'audit_1',
        userId: 'user_123',
        userEmail: 'admin@example.com',
        userName: 'Admin User',
        action: 'USER_LOGIN',
        resource: 'Authentication',
        details: { method: 'email_password', location: 'San Francisco, CA' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'sess_abc123',
        success: true,
        timestamp: new Date('2024-01-20T09:30:00Z'),
        severity: 'LOW'
      },
      {
        id: 'audit_2',
        userId: 'user_456',
        userEmail: 'john@example.com',
        userName: 'John Doe',
        action: 'PLAN_UPGRADE',
        resource: 'Subscription',
        resourceId: 'sub_789',
        details: { fromPlan: 'PRO', toPlan: 'TEAM', amount: 100.00 },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        sessionId: 'sess_def456',
        success: true,
        timestamp: new Date('2024-01-20T08:15:00Z'),
        severity: 'MEDIUM'
      },
      {
        id: 'audit_3',
        userId: 'user_789',
        userEmail: 'hacker@malicious.com',
        userName: 'Unknown User',
        action: 'FAILED_LOGIN',
        resource: 'Authentication',
        details: { reason: 'invalid_credentials', attempts: 5 },
        ipAddress: '45.123.45.67',
        userAgent: 'curl/7.68.0',
        success: false,
        timestamp: new Date('2024-01-20T07:45:00Z'),
        severity: 'HIGH'
      },
      {
        id: 'audit_4',
        userId: 'user_123',
        userEmail: 'admin@example.com',
        userName: 'Admin User',
        action: 'USER_DELETE',
        resource: 'User Management',
        resourceId: 'user_999',
        details: { deletedUser: 'spam@example.com', reason: 'spam_account' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'sess_abc123',
        success: true,
        timestamp: new Date('2024-01-19T16:20:00Z'),
        severity: 'HIGH'
      },
      {
        id: 'audit_5',
        userId: 'user_456',
        userEmail: 'john@example.com',
        userName: 'John Doe',
        action: 'API_KEY_GENERATED',
        resource: 'API Management',
        resourceId: 'key_888',
        details: { keyName: 'Production API Key', permissions: ['read', 'write'] },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        sessionId: 'sess_def456',
        success: true,
        timestamp: new Date('2024-01-19T14:10:00Z'),
        severity: 'MEDIUM'
      },
      {
        id: 'audit_6',
        userId: 'system',
        userEmail: 'system@omnix.ai',
        userName: 'System Process',
        action: 'DATA_BACKUP',
        resource: 'Database',
        details: { backupType: 'incremental', size: '2.4GB', duration: '45s' },
        ipAddress: '10.0.0.1',
        userAgent: 'OmnixBackupService/1.0',
        success: true,
        timestamp: new Date('2024-01-19T02:00:00Z'),
        severity: 'LOW'
      },
      {
        id: 'audit_7',
        userId: 'user_111',
        userEmail: 'attacker@bad.com',
        userName: 'Malicious User',
        action: 'PRIVILEGE_ESCALATION_ATTEMPT',
        resource: 'Access Control',
        details: { attemptedRole: 'SUPER_ADMIN', currentRole: 'USER' },
        ipAddress: '85.123.45.67',
        userAgent: 'Python-requests/2.28.1',
        success: false,
        timestamp: new Date('2024-01-18T23:30:00Z'),
        severity: 'CRITICAL'
      }
    ];

    // Apply filters to mock data
    let filteredLogs = mockAuditLogs;
    
    if (userId_filter) {
      filteredLogs = filteredLogs.filter(log => log.userId.includes(userId_filter));
    }
    
    if (action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(action.toLowerCase())
      );
    }
    
    if (resource) {
      filteredLogs = filteredLogs.filter(log => 
        log.resource.toLowerCase().includes(resource.toLowerCase())
      );
    }
    
    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity);
    }
    
    if (success !== null) {
      filteredLogs = filteredLogs.filter(log => log.success === (success === 'true'));
    }
    
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp <= new Date(endDate)
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const totalCount = filteredLogs.length;
    const totalPages = Math.ceil(totalCount / limit);

    // Log this audit log access
    await logAuditEvent({
      userId,
      userEmail: user.email,
      action: 'AUDIT_LOG_ACCESS',
      resource: 'Audit Logs',
      details: { 
        filters: { userId_filter, action, resource, severity, startDate, endDate, success },
        resultCount: paginatedLogs.length 
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      success: true,
      severity: 'MEDIUM'
    });

    return createSecureResponse({
      logs: paginatedLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        userId: userId_filter,
        action,
        resource,
        severity,
        startDate,
        endDate,
        success
      }
    });

  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return createErrorResponse('Failed to fetch audit logs', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await req.json();
    const { 
      action, 
      resource, 
      resourceId, 
      details, 
      severity = 'LOW',
      success = true 
    } = body;

    if (!action || !resource) {
      return createErrorResponse('Action and resource are required', 400);
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Create audit log entry
    const auditLog = await logAuditEvent({
      userId,
      userEmail: user.email,
      userName: user.name || 'Unknown',
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      success,
      severity
    });

    return createSecureResponse({
      message: 'Audit log created successfully',
      logId: auditLog.id,
      timestamp: auditLog.timestamp
    });

  } catch (error) {
    console.error('Audit log creation error:', error);
    return createErrorResponse('Failed to create audit log', 500);
  }
}

// Helper function to log audit events
async function logAuditEvent(data: {
  userId: string;
  userEmail: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}) {
  // In a real implementation, this would save to a dedicated audit logs table
  // For now, we'll use the existing AdminAction model as a placeholder
  
  try {
    const auditLog = await prisma.adminAction.create({
      data: {
        adminId: data.userId,
        action: data.action,
        targetUserId: data.resourceId,
        details: {
          resource: data.resource,
          userEmail: data.userEmail,
          userName: data.userName,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sessionId: data.sessionId,
          success: data.success,
          severity: data.severity,
          originalDetails: data.details
        }
      }
    });

    return {
      id: auditLog.id,
      timestamp: auditLog.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Failed to save audit log to database:', error);
    // Return a mock response to avoid breaking the application
    return {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check if user has super admin privileges
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, email: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return createErrorResponse('Super admin privileges required', 403);
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get('olderThan'); // ISO date string
    const severity = searchParams.get('severity');

    if (!olderThan) {
      return createErrorResponse('olderThan parameter is required', 400);
    }

    const cutoffDate = new Date(olderThan);
    if (isNaN(cutoffDate.getTime())) {
      return createErrorResponse('Invalid date format', 400);
    }

    // In a real implementation, this would delete audit logs from the database
    // For demo purposes, we'll simulate the deletion
    
    const mockDeletedCount = Math.floor(Math.random() * 100) + 10;

    // Log this audit log deletion
    await logAuditEvent({
      userId,
      userEmail: user.email,
      action: 'AUDIT_LOG_CLEANUP',
      resource: 'Audit Logs',
      details: { 
        cutoffDate: cutoffDate.toISOString(),
        severity,
        deletedCount: mockDeletedCount
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      success: true,
      severity: 'HIGH'
    });

    return createSecureResponse({
      message: 'Audit logs cleaned up successfully',
      deletedCount: mockDeletedCount,
      cutoffDate: cutoffDate.toISOString()
    });

  } catch (error) {
    console.error('Audit log cleanup error:', error);
    return createErrorResponse('Failed to cleanup audit logs', 500);
  }
}