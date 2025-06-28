import { NextRequest, NextResponse } from 'next/server';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  model: string;
}

// This would be replaced with actual database operations
const mockConversations: Conversation[] = [
  {
    id: 'conv_1',
    title: 'Getting Started with AI',
    messages: [
      {
        id: 'msg_1',
        role: 'user',
        content: 'What can you help me with?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
        model: 'gpt-4o'
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: 'I can help you with a wide variety of tasks including writing, analysis, coding, math, creative projects, and much more. What would you like to work on today?',
        timestamp: new Date(Date.now() - 1000 * 60 * 29),
        model: 'gpt-4o'
      }
    ],
    updatedAt: new Date(Date.now() - 1000 * 60 * 29),
    model: 'gpt-4o'
  },
  {
    id: 'conv_2',
    title: 'Code Review Help',
    messages: [
      {
        id: 'msg_3',
        role: 'user',
        content: 'Can you review this JavaScript function for me?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        model: 'claude-3.5-sonnet'
      }
    ],
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    model: 'claude-3.5-sonnet'
  }
];

export async function GET(request: NextRequest) {
  try {
    // In a real app, you would:
    // 1. Get user ID from authentication
    // 2. Query database for user's conversations
    // 3. Apply pagination, filtering, etc.
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Sort by most recent first
    const sortedConversations = mockConversations
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return NextResponse.json({
      conversations: sortedConversations,
      total: mockConversations.length,
      hasMore: offset + limit < mockConversations.length
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, model } = body;

    // Create new conversation
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      title: title || 'New Chat',
      messages: [],
      updatedAt: new Date(),
      model: model || 'gpt-4o'
    };

    // In a real app, save to database
    mockConversations.unshift(newConversation);

    return NextResponse.json(newConversation, { status: 201 });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, messages, model } = body;

    // Find and update conversation
    const conversationIndex = mockConversations.findIndex(conv => conv.id === id);
    if (conversationIndex === -1) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    mockConversations[conversationIndex] = {
      ...mockConversations[conversationIndex],
      title: title || mockConversations[conversationIndex].title,
      messages: messages || mockConversations[conversationIndex].messages,
      model: model || mockConversations[conversationIndex].model,
      updatedAt: new Date()
    };

    return NextResponse.json(mockConversations[conversationIndex]);

  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Find and remove conversation
    const conversationIndex = mockConversations.findIndex(conv => conv.id === id);
    if (conversationIndex === -1) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    mockConversations.splice(conversationIndex, 1);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
} 