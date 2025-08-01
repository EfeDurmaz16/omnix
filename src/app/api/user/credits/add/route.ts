import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// POST /api/user/credits/add - Add credits to user account with transaction
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, description = 'Credit purchase' } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    console.log('💰 Adding credits:', { userId, amount, description });

    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current user
      const user = await tx.user.findUnique({
        where: { clerkId: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newCredits = user.credits + amount;

      // Update user credits
      const updatedUser = await tx.user.update({
        where: { clerkId: userId },
        data: { credits: newCredits }
      });

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: amount,
          type: 'PURCHASE',
          description: description
        }
      });

      return updatedUser;
    });

    console.log('✅ Credits added successfully:', {
      userId,
      oldCredits: result.credits - amount,
      newCredits: result.credits,
      added: amount
    });

    return NextResponse.json({
      success: true,
      credits: result.credits,
      added: amount,
      message: `${amount} credits added successfully`
    });

  } catch (error) {
    console.error('❌ Error adding credits:', error);
    return NextResponse.json(
      { error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}