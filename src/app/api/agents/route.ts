import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL || 'http://127.0.0.1:8002';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const agentId = searchParams.get('id');

    console.log('🔍 Getting agents from ADK service for user:', userId);

    // Forward request to ADK service
    const response = await fetch(`${ADK_SERVICE_URL}/agents?userId=${userId}${search ? `&search=${search}` : ''}${agentId ? `&id=${agentId}` : ''}`);
    
    if (!response.ok) {
      throw new Error(`ADK service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Retrieved agents from ADK service:', data.data?.length || 0);

    return NextResponse.json(data);

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
    console.log('🔵 Agent POST request received');
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('🔵 Request body:', JSON.stringify(body, null, 2));
    const { templateId, config, action } = body;

    if (action === 'import') {
      // Import agents from backup - TODO: Implement for ADK
      return NextResponse.json({
        success: false,
        error: 'Import functionality not yet implemented for ADK agents'
      }, { status: 501 });
    }

    // Add userId to config
    const configWithUserId = {
      ...config,
      userId
    };

    // Forward request to ADK service
    console.log('🤖 Creating agent via ADK service');
    const response = await fetch(`${ADK_SERVICE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId,
        config: configWithUserId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ADK service error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('✅ Agent created via ADK service:', data.data?.name);

    return NextResponse.json(data);

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

    // For now, return not implemented for ADK agents
    return NextResponse.json({
      success: false,
      error: 'Agent updates not yet implemented for ADK agents'
    }, { status: 501 });

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

    console.log('🗑️ Deleting agent via ADK service:', agentId);

    // Forward request to ADK service
    const response = await fetch(`${ADK_SERVICE_URL}/agents/${agentId}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ADK service error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('✅ Agent deleted via ADK service');

    return NextResponse.json(data);

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