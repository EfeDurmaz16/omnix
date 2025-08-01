import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id }
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists',
        user: existingUser
      });
    }

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email: email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        plan: 'FREE',
        credits: 1500, // Default starting credits
      }
    });

    // Create initial credit transaction
    await prisma.creditTransaction.create({
      data: {
        userId: newUser.id,
        amount: 1500,
        type: 'BONUS',
        description: 'Welcome bonus credits'
      }
    });

    return NextResponse.json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create user', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}