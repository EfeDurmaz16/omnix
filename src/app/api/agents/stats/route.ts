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
    const type = searchParams.get('type') || 'user';

    if (agentId) {
      // Get specific agent statistics
      const agent = agentManager.getAgent(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      if (agent.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const stats = agentManager.getAgentStats(agentId);
      
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    if (type === 'system') {
      // Get system-wide statistics (admin only for now)
      const systemStats = agentManager.getSystemStats();
      
      return NextResponse.json({
        success: true,
        data: systemStats
      });
    }

    // Get user's agent statistics summary
    const userAgents = agentManager.getUserAgents(userId);
    const agentStats = userAgents.map(agent => agentManager.getAgentStats(agent.id));
    
    const summary = {
      totalAgents: userAgents.length,
      activeAgents: userAgents.filter(a => a.enabled).length,
      totalExecutions: agentStats.reduce((sum, stats) => sum + (stats?.totalExecutions || 0), 0),
      totalCost: agentStats.reduce((sum, stats) => sum + (stats?.totalCost || 0), 0),
      totalTokens: agentStats.reduce((sum, stats) => sum + (stats?.totalTokens || 0), 0),
      averageSuccessRate: agentStats.length > 0 
        ? agentStats.reduce((sum, stats) => sum + (stats?.successRate || 0), 0) / agentStats.length 
        : 0,
      agentStats: agentStats.filter(stats => stats !== null)
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Get agent stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get agent statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}