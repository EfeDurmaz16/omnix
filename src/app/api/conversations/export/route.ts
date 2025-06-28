import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'omnix'; // omnix, chatgpt, claude, json
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    console.log('📤 Exporting conversations for user:', user.id, 'format:', format);

    // In a real implementation, you'd fetch from your database
    // For now, we'll return a mock structure
    const conversations = await getMockConversations(user.id, startDate, endDate);

    let exportData;
    let filename;
    let contentType = 'application/json';

    switch (format) {
      case 'chatgpt':
        exportData = formatForChatGPT(conversations);
        filename = `omnix-conversations-chatgpt-${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'claude':
        exportData = formatForClaude(conversations);
        filename = `omnix-conversations-claude-${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'csv':
        exportData = formatForCSV(conversations);
        filename = `omnix-conversations-${new Date().toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv';
        break;
      
      case 'omnix':
      default:
        exportData = formatForOmniX(conversations);
        filename = `omnix-conversations-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    const response = new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

    console.log('✅ Export completed:', filename);
    return response;

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

// Mock function - replace with real database query
async function getMockConversations(userId: string, startDate?: string, endDate?: string) {
  return [
    {
      id: 'conv-1',
      title: 'Planning my startup',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T11:45:00Z',
      model: 'gpt-4',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Help me plan my AI startup',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'I\'d be happy to help you plan your AI startup! Let\'s start with the key areas...',
          timestamp: '2024-01-15T10:30:30Z',
          model: 'gpt-4'
        }
      ]
    }
  ];
}

function formatForOmniX(conversations: any[]) {
  return JSON.stringify({
    version: '1.0',
    source: 'omnix',
    exportDate: new Date().toISOString(),
    conversations: conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model || conv.model
      }))
    }))
  }, null, 2);
}

function formatForChatGPT(conversations: any[]) {
  // Format compatible with ChatGPT export format
  return JSON.stringify(conversations.map(conv => ({
    title: conv.title,
    create_time: new Date(conv.createdAt).getTime() / 1000,
    update_time: new Date(conv.updatedAt).getTime() / 1000,
    mapping: Object.fromEntries(
      conv.messages.map((msg: any, index: number) => [
        msg.id,
        {
          id: msg.id,
          message: {
            id: msg.id,
            create_time: new Date(msg.timestamp).getTime() / 1000,
            content: {
              content_type: 'text',
              parts: [msg.content]
            },
            author: {
              role: msg.role
            },
            metadata: {
              model_slug: msg.model || conv.model
            }
          },
          parent: index > 0 ? conv.messages[index - 1].id : null,
          children: index < conv.messages.length - 1 ? [conv.messages[index + 1].id] : []
        }
      ])
    )
  })), null, 2);
}

function formatForClaude(conversations: any[]) {
  // Format compatible with Claude export format
  return JSON.stringify({
    conversations: conversations.map(conv => ({
      uuid: conv.id,
      name: conv.title,
      created_at: conv.createdAt,
      updated_at: conv.updatedAt,
      chat_messages: conv.messages.map((msg: any) => ({
        uuid: msg.id,
        text: msg.content,
        sender: msg.role === 'user' ? 'human' : 'assistant',
        created_at: msg.timestamp
      }))
    }))
  }, null, 2);
}

function formatForCSV(conversations: any[]) {
  const headers = ['Conversation ID', 'Title', 'Date', 'Model', 'Role', 'Message', 'Timestamp'];
  const rows = [headers.join(',')];
  
  conversations.forEach(conv => {
    conv.messages.forEach((msg: any) => {
      const row = [
        conv.id,
        `"${conv.title.replace(/"/g, '""')}"`,
        conv.createdAt.split('T')[0],
        conv.model,
        msg.role,
        `"${msg.content.replace(/"/g, '""')}"`,
        msg.timestamp
      ];
      rows.push(row.join(','));
    });
  });
  
  return rows.join('\n');
} 