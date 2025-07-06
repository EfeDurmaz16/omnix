import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Refreshing credits for user:', userId);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('💰 Current credits from database:', user.credits);

    return NextResponse.json({
      success: true,
      data: {
        credits: user.credits,
        plan: user.plan,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Refresh credits error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}