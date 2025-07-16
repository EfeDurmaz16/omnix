import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prismaCreditManager } from '@/lib/credits/PrismaCreditManager';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.text();
    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }
    
    const { email, plan } = JSON.parse(body);
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const credits = await prismaCreditManager.initializeUserCredits(
      userId,
      email,
      plan || 'FREE'
    );

    return NextResponse.json({ 
      success: true, 
      credits 
    });
  } catch (error) {
    console.error('Error initializing user credits:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize user credits' 
    }, { status: 500 });
  }
}