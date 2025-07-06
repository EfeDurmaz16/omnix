import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { agentManager } from '@/lib/agents/AgentManager';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, testPrompt } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    console.log('🧪 Testing agent:', agentId);

    // Check agent ownership
    const agent = agentManager.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Test the agent
    const testResult = await agentManager.testAgent(agentId, testPrompt);

    console.log('✅ Agent test completed:', testResult.success);

    return NextResponse.json({
      success: true,
      data: testResult
    });

  } catch (error) {
    console.error('❌ Agent test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}