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
    const { agentId, taskDescription, context } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    if (!taskDescription || !taskDescription.trim()) {
      return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
    }

    console.log('🤖 Agent execution request:', { agentId, taskDescription: taskDescription.substring(0, 100) + '...' });

    // Check agent ownership
    const agent = await agentManager.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Execute the task
    const execution = await agentManager.executeAgentTask(agentId, taskDescription, context);

    console.log('✅ Agent execution completed:', execution.id);

    return NextResponse.json({
      success: true,
      data: {
        executionId: execution.id,
        agentId: execution.agentId,
        status: execution.status,
        steps: execution.steps.length,
        totalCost: execution.totalCost,
        tokensUsed: execution.tokensUsed,
        result: execution.result,
        startTime: execution.startTime,
        endTime: execution.endTime
      }
    });

  } catch (error) {
    console.error('❌ Agent execution error:', error);
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