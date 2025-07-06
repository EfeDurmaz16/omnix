import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { agentManager } from '@/lib/agents/AgentManager';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = agentManager.getAgentTemplates();

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('❌ Get agent templates error:', error);
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