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

    // Check if user is admin (you'll need to implement admin role checking)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return createErrorResponse('Admin access required', 403);
    }

    // Get all users with aggregated usage data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
        createdAt: true,
        lastLoginAt: true,
        // Add computed fields
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to prevent performance issues
    });

    // Get usage data for each user
    const usersWithUsage = await Promise.all(
      users.map(async (user) => {
        const totalUsage = await prisma.creditTransaction.aggregate({
          where: {
            userId: user.clerkId,
            type: 'USAGE'
          },
          _sum: {
            amount: true
          }
        });

        return {
          ...user,
          status: 'active' as const, // You might want to track this in DB
          totalUsage: Math.abs(totalUsage._sum.amount || 0)
        };
      })
    );

    return createSecureResponse({
      users: usersWithUsage,
      total: users.length
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    return createErrorResponse('Failed to fetch users', 500);
  }
}

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

    const { action, targetUserId, data } = await req.json();

    switch (action) {
      case 'create_user':
        // Create new user (if needed)
        const newUser = await prisma.user.create({
          data: {
            clerkId: data.clerkId,
            email: data.email,
            name: data.name,
            plan: data.plan || 'FREE',
            credits: data.credits || 0
          }
        });
        return createSecureResponse({ user: newUser });

      case 'bulk_update':
        // Bulk update users
        const updates = await Promise.all(
          data.users.map((userData: any) =>
            prisma.user.update({
              where: { id: userData.id },
              data: {
                plan: userData.plan,
                credits: userData.credits
              }
            })
          )
        );
        return createSecureResponse({ updated: updates.length });

      default:
        return createErrorResponse('Invalid action', 400);
    }

  } catch (error) {
    console.error('Admin users action error:', error);
    return createErrorResponse('Failed to perform action', 500);
  }
}