import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextManager } from '@/lib/context/AdvancedContextManager';
import { conversationStore } from '@/lib/database/ConversationStore';

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Use RAG-enhanced conversation retrieval
    let result;
    
    if (search) {
      // Search conversations by content
      const conversations = await conversationStore.searchConversations(userId, search, limit);
      result = {
        conversations,
        total: conversations.length,
        hasMore: false
      };
    } else {
      // Get paginated conversations
      result = await contextManager.getUserConversations(userId, limit, offset);
    }

    // Add RAG insights to conversations
    const conversationsWithInsights = await Promise.all(
      result.conversations.map(async (conv) => {
        try {
          // Get user stats for this conversation context
          const stats = await contextManager.getUserStats(userId);
          
          return {
            ...conv,
            metadata: {
              ...conv.metadata,
              ragEnabled: true,
              memoryCount: stats.memoryStats?.totalMemories || 0,
              lastActivity: conv.metadata.lastActivity.toISOString(),
              startedAt: conv.metadata.startedAt.toISOString()
            }
          };
        } catch (error) {
          console.warn('Failed to add insights to conversation:', error);
          return {
            ...conv,
            metadata: {
              ...conv.metadata,
              lastActivity: conv.metadata.lastActivity.toISOString(),
              startedAt: conv.metadata.startedAt.toISOString()
            }
          };
        }
      })
    );

    return NextResponse.json({
      conversations: conversationsWithInsights,
      total: result.total,
      hasMore: result.hasMore,
      ragEnabled: true,
      timestamp: new Date().toISOString()
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
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, model = 'gpt-4o', initialMessage } = body;

    // Create new conversation using RAG-enhanced context manager
    const context = await contextManager.getOrCreateContext(
      userId,
      undefined, // Let it generate a new conversation ID
      model
    );

    // Update title if provided
    if (title && title !== 'New Chat') {
      context.title = title;
      await conversationStore.storeConversation(context);
    }

    // Add initial message if provided
    if (initialMessage) {
      await contextManager.addMessage(context.id, {
        role: 'user',
        content: initialMessage,
        model: model
      });
    }

    return NextResponse.json({
      id: context.id,
      title: context.title,
      messages: context.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      })),
      metadata: {
        ...context.metadata,
        lastActivity: context.metadata.lastActivity.toISOString(),
        startedAt: context.metadata.startedAt.toISOString()
      },
      settings: context.settings,
      ragEnabled: true
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Delete using enhanced context manager (includes vector store cleanup)
    await contextManager.deleteContext(conversationId, userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Conversation deleted successfully',
      ragCleanup: true
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, title, model } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Load conversation to verify ownership
    const conversation = await contextManager.loadConversation(conversationId);
    
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Update conversation
    const updates: any = {};
    if (title) updates.title = title;
    if (model && model !== conversation.metadata.currentModel) {
      // Switch model within conversation
      await contextManager.switchModel(conversationId, model);
    } else {
      // Update title only
      if (title) {
        conversation.title = title;
        await conversationStore.storeConversation(conversation);
      }
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      model: conversation.metadata.currentModel,
      ragEnabled: true,
      updated: true
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
} 