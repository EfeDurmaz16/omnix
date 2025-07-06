import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    // Get all users for debugging
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        plan: true,
        credits: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        currentUser: user,
        allUsers: allUsers,
        userCount: allUsers.length
      }
    });

  } catch (error) {
    console.error('❌ Database state check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check database state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}