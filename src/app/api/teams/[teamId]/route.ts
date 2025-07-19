import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check if user is team owner or admin
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

    const { name, description, maxMembers } = await req.json();

    // Only owner can change maxMembers
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (maxMembers !== undefined && isOwner) updateData.maxMembers = maxMembers;

    const updatedTeam = await prisma.team.update({
      where: { id: params.teamId },
      data: updateData
    });

    return createSecureResponse({
      team: updatedTeam,
      message: 'Team updated successfully'
    });

  } catch (error) {
    console.error('Team update error:', error);
    return createErrorResponse('Failed to update team', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check if user is team owner
    const team = await prisma.team.findUnique({
      where: { id: params.teamId }
    });

    if (!team) {
      return createErrorResponse('Team not found', 404);
    }

    if (team.ownerId !== userId) {
      return createErrorResponse('Only team owner can delete team', 403);
    }

    // Remove team reference from all members
    await prisma.user.updateMany({
      where: { teamId: params.teamId },
      data: {
        teamId: null,
        teamRole: null
      }
    });

    // Delete team (this will cascade delete invitations and usage)
    await prisma.team.delete({
      where: { id: params.teamId }
    });

    return createSecureResponse({
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Team deletion error:', error);
    return createErrorResponse('Failed to delete team', 500);
  }
}