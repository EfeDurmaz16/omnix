import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// GET /api/user/data - Get user data from Prisma database
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Getting user data for:', userId);

    // Get user from Prisma database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      plan: user.plan,
      credits: user.credits
    });

    const response = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      plan: user.plan.toLowerCase(),
      credits: user.credits,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      transactions: user.transactions
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}

// POST /api/user/data - Update user data in Prisma database  
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData = await req.json();
    console.log('🔄 Updating user data:', updateData);

    // Update user in Prisma database
    const user = await prisma.user.update({
      where: { clerkId: userId },
      data: updateData
    });

    console.log('✅ User updated:', {
      id: user.id,
      email: user.email,
      plan: user.plan,
      credits: user.credits
    });

    const response = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      plan: user.plan.toLowerCase(),
      credits: user.credits,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
}