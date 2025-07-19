import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check if user is team member
    const userTeam = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { teamId: true }
    });

    if (userTeam?.teamId !== params.teamId) {
      return createErrorResponse('Access denied', 403);
    }

    // Get team members
    const members = await prisma.user.findMany({
      where: { teamId: params.teamId },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        avatar: true,
        teamRole: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: [
        { teamRole: 'desc' }, // OWNER first, then ADMIN, then MEMBER
        { name: 'asc' }
      ]
    });

    // Get usage data for each member (mock for now)
    const membersWithUsage = members.map(member => ({
      id: member.id,
      name: member.name || 'Unknown',
      email: member.email,
      avatar: member.avatar,
      role: member.teamRole || 'MEMBER',
      joinedAt: member.createdAt.toISOString(),
      lastActive: member.lastLoginAt 
        ? `${Math.floor((Date.now() - member.lastLoginAt.getTime()) / (1000 * 60))} minutes ago`
        : 'Never',
      creditsUsed: Math.floor(Math.random() * 1000) + 100 // Mock data
    }));

    return createSecureResponse({
      members: membersWithUsage,
      total: membersWithUsage.length
    });

  } catch (error) {
    console.error('Team members fetch error:', error);
    return createErrorResponse('Failed to fetch team members', 500);
  }
}