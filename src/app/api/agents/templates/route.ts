import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL || 'http://127.0.0.1:8002';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📋 Getting ADK agent templates from service');

    // Forward request to ADK service
    const response = await fetch(`${ADK_SERVICE_URL}/agents/templates`);
    
    if (!response.ok) {
      throw new Error(`ADK service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Retrieved templates from ADK service:', data.data?.templates?.length || 0);

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Get ADK templates error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get agent templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}