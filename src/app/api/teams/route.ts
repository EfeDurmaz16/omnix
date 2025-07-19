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

    // Get user's teams (owned or member of)
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { clerkId: userId } } }
        ]
      },
      include: {
        owner: {
          select: { name: true, email: true }
        },
        members: {
          select: { id: true, name: true, email: true, teamRole: true }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    // Format teams with user's role
    const formattedTeams = teams.map(team => {
      const isOwner = team.ownerId === userId;
      const member = team.members.find(m => m.id === userId);
      
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        avatar: team.avatar,
        plan: team.plan,
        credits: team.credits,
        maxMembers: team.maxMembers,
        memberCount: team._count.members,
        role: isOwner ? 'OWNER' : (member?.teamRole || 'MEMBER'),
        createdAt: team.createdAt.toISOString()
      };
    });

    return createSecureResponse({
      teams: formattedTeams,
      total: formattedTeams.length
    });

  } catch (error) {
    console.error('Teams fetch error:', error);
    return createErrorResponse('Failed to fetch teams', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { name, description } = await req.json();

    if (!name?.trim()) {
      return createErrorResponse('Team name is required', 400);
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.team.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        plan: 'TEAM',
        credits: 5000, // Default team credits
        maxMembers: 10,
        ownerId: userId,
        settings: JSON.stringify({
          allowMemberInvites: true,
          autoApproveInvites: false,
          creditSharing: 'shared_pool',
          modelRestrictions: [],
          requestLimits: {
            perUser: 100,
            perHour: 500
          },
          notifications: {
            lowCredits: true,
            newMembers: true,
            highUsage: true
          }
        })
      },
      include: {
        owner: {
          select: { name: true, email: true }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    // Add owner as team member
    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        teamId: team.id,
        teamRole: 'OWNER'
      }
    });

    return createSecureResponse({
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        avatar: team.avatar,
        plan: team.plan,
        credits: team.credits,
        maxMembers: team.maxMembers,
        memberCount: 1, // Just the owner
        role: 'OWNER',
        createdAt: team.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Team creation error:', error);
    return createErrorResponse('Failed to create team', 500);
  }
}