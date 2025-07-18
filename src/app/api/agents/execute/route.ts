import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL || 'http://127.0.0.1:8002';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, taskDescription, context } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    if (!taskDescription || !taskDescription.trim()) {
      return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
    }

    console.log('🤖 ADK Agent execution request via service:', { agentId, taskDescription: taskDescription.substring(0, 100) + '...' });

    // Forward request to ADK service
    const response = await fetch(`${ADK_SERVICE_URL}/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        taskDescription,
        context,
        userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ADK service error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('✅ ADK Agent execution completed via service:', data.data?.executionId);

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ ADK Agent execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute agent task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}