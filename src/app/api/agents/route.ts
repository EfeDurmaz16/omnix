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
    const search = searchParams.get('search');
    const agentId = searchParams.get('id');

    if (agentId) {
      // Get specific agent
      const agent = await agentManager.getAgent(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      if (agent.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        data: agent
      });
    }

    // Get user's agents
    let agents = await agentManager.getUserAgents(userId);
    
    // Apply search filter if provided
    if (search) {
      agents = agents.filter(agent => 
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase()) ||
        agent.personality.expertise.some(skill => 
          skill.toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: agents
    });

  } catch (error) {
    console.error('❌ Get agents error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, config, action } = body;

    if (action === 'import') {
      // Import agents from backup
      const importedAgents = await agentManager.importAgents(userId, body.data);
      return NextResponse.json({
        success: true,
        data: importedAgents,
        message: `Successfully imported ${importedAgents.length} agents`
      });
    }

    // Create new agent
    const agent = await agentManager.createAgent(userId, config, templateId);

    console.log('✅ Agent created:', agent.name);

    return NextResponse.json({
      success: true,
      data: agent
    });

  } catch (error) {
    console.error('❌ Create agent error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, updates } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Check ownership
    const existingAgent = agentManager.getAgent(agentId);
    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    if (existingAgent.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedAgent = await agentManager.updateAgent(agentId, updates);

    console.log('✅ Agent updated:', updatedAgent.name);

    return NextResponse.json({
      success: true,
      data: updatedAgent
    });

  } catch (error) {
    console.error('❌ Update agent error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update agent',
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
    const agentId = searchParams.get('id');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const deleted = await agentManager.deleteAgent(agentId, userId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    console.log('✅ Agent deleted:', agentId);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete agent error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}