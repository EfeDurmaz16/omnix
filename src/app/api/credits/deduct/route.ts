import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prismaCreditManager } from '@/lib/credits/PrismaCreditManager';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, description, metadata } = await request.json();
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const result = await prismaCreditManager.deductCredits(
      amount,
      description || 'Credit deduction',
      metadata,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json({ 
      error: 'Failed to deduct credits' 
    }, { status: 500 });
  }
}