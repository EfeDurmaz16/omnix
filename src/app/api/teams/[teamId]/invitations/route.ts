import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';
import crypto from 'crypto';

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
      select: { teamId: true, teamRole: true }
    });

    if (userTeam?.teamId !== params.teamId) {
      return createErrorResponse('Access denied', 403);
    }

    // Get team invitations
    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId: params.teamId },
      include: {
        inviter: {
          select: { name: true, email: true }
        },
        invitee: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      inviterName: invitation.inviter.name || invitation.inviter.email,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString()
    }));

    return createSecureResponse({
      invitations: formattedInvitations,
      total: formattedInvitations.length
    });

  } catch (error) {
    console.error('Team invitations fetch error:', error);
    return createErrorResponse('Failed to fetch invitations', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { email, role = 'MEMBER' } = await req.json();

    if (!email?.trim()) {
      return createErrorResponse('Email is required', 400);
    }

    if (!['MEMBER', 'ADMIN'].includes(role)) {
      return createErrorResponse('Invalid role', 400);
    }

    // Check if user can send invitations
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      include: {
        members: {
          where: { clerkId: userId },
          select: { teamRole: true }
        }
      }
    });

    if (!team) {
      return createErrorResponse('Team not found', 404);
    }

    const isOwner = team.ownerId === userId;
    const member = team.members[0];
    const isAdmin = member?.teamRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Check if user is already a member
    const existingMember = await prisma.user.findUnique({
      where: { email: email.trim() }
    });

    if (existingMember?.teamId === params.teamId) {
      return createErrorResponse('User is already a team member', 400);
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId: params.teamId,
        email: email.trim(),
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      return createErrorResponse('Invitation already sent to this email', 400);
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: params.teamId,
        inviterId: userId,
        inviteeId: existingMember?.id || null,
        email: email.trim(),
        role: role as 'MEMBER' | 'ADMIN',
        token,
        expiresAt
      },
      include: {
        inviter: {
          select: { name: true, email: true }
        },
        team: {
          select: { name: true }
        }
      }
    });

    // TODO: Send invitation email
    console.log(`Invitation sent to ${email} for team ${team.name}`);
    console.log(`Invitation URL: ${process.env.NEXT_PUBLIC_APP_URL}/teams/join/${token}`);

    return createSecureResponse({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        inviterName: invitation.inviter.name || invitation.inviter.email,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString()
      },
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Team invitation error:', error);
    return createErrorResponse('Failed to send invitation', 500);
  }
}