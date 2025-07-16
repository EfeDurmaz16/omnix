import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prismaCreditManager } from '@/lib/credits/PrismaCreditManager';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = await prismaCreditManager.getCredits(userId);
    
    return NextResponse.json({ 
      success: true, 
      credits 
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch credits' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, description, metadata } = await request.json();
    
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const result = await prismaCreditManager.addCredits(
      amount,
      description || 'Credit addition',
      metadata,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json({ 
      error: 'Failed to add credits' 
    }, { status: 500 });
  }
}