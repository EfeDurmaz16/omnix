import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CleanContextManager } from '@/lib/memory/CleanContextManager';

// POST /api/memory/get-context - Get enhanced context with hierarchical memory
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, conversationId, messages, memoryEnabled = true } = await req.json();

    if (!chatId || !conversationId || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: 'Missing required fields: chatId, conversationId, messages' 
      }, { status: 400 });
    }

    const contextManager = new CleanContextManager();

    console.log(`🧠 Getting context for user ${userId}, chat ${chatId}, conversation ${conversationId}`);

    // Create context object
    const context = {
      userId,
      chatId,
      conversationId,
      messages: messages.map(msg => ({
        id: msg.id || `msg_${Date.now()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now())
      })),
      memoryEnabled
    };

    // Get enhanced context with memory
    const enhancedMessages = await contextManager.getContextWithMemory(context);

    // Return enhanced context
    return NextResponse.json({
      success: true,
      originalMessageCount: context.messages.length,
      enhancedMessageCount: enhancedMessages.length,
      memoryInjected: enhancedMessages.length > context.messages.length,
      messages: enhancedMessages,
      metadata: {
        userId,
        chatId,
        conversationId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting enhanced context:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get enhanced context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/memory/store-conversation - Store completed conversation
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, conversationId, messages } = await req.json();

    if (!chatId || !conversationId || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: 'Missing required fields: chatId, conversationId, messages' 
      }, { status: 400 });
    }

    const contextManager = new CleanContextManager();

    console.log(`💾 Storing conversation ${conversationId} for user ${userId}`);

    // Store the conversation
    await contextManager.storeConversation(
      userId,
      chatId,
      conversationId,
      messages.map(msg => ({
        id: msg.id || `msg_${Date.now()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now())
      }))
    );

    return NextResponse.json({
      success: true,
      stored: {
        userId,
        chatId,
        conversationId,
        messageCount: messages.length
      }
    });

  } catch (error) {
    console.error('Error storing conversation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to store conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}