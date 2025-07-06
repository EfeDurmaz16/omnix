import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { agentManager } from '@/lib/agents/AgentManager';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const executionId = searchParams.get('executionId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (executionId) {
      // Get specific execution
      const execution = agentManager.getExecution(executionId);
      if (!execution) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
      }

      // Check if user owns the agent
      const agent = agentManager.getAgent(execution.agentId);
      if (!agent || agent.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        data: execution
      });
    }

    if (agentId) {
      // Get executions for specific agent
      const agent = agentManager.getAgent(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      if (agent.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const executions = agentManager.getAgentExecutions(agentId);
      const paginatedExecutions = executions.slice(offset, offset + limit);
      
      return NextResponse.json({
        success: true,
        data: {
          executions: paginatedExecutions,
          total: executions.length,
          limit,
          offset,
          hasMore: offset + limit < executions.length
        }
      });
    }

    // Get all executions for user's agents
    const userAgents = agentManager.getUserAgents(userId);
    const allExecutions: any[] = [];
    
    for (const agent of userAgents) {
      const agentExecutions = agentManager.getAgentExecutions(agent.id);
      allExecutions.push(...agentExecutions.map(exec => ({
        ...exec,
        agentName: agent.name
      })));
    }

    // Sort by start time (most recent first)
    allExecutions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    const paginatedExecutions = allExecutions.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        executions: paginatedExecutions,
        total: allExecutions.length,
        limit,
        offset,
        hasMore: offset + limit < allExecutions.length
      }
    });

  } catch (error) {
    console.error('❌ Get agent executions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get agent executions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    // Get execution to check ownership
    const execution = agentManager.getExecution(executionId);
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Check if user owns the agent
    const agent = agentManager.getAgent(execution.agentId);
    if (!agent || agent.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Cancel execution if it's still running
    const cancelled = agentManager.cancelExecution(executionId);
    
    console.log('✅ Agent execution cancelled:', executionId);

    return NextResponse.json({
      success: true,
      message: cancelled ? 'Execution cancelled successfully' : 'Execution was already completed'
    });

  } catch (error) {
    console.error('❌ Cancel agent execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel agent execution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}