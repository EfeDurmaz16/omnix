import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CleanContextManager } from '@/lib/memory/CleanContextManager';

// POST /api/memory/test-clean-system - Test the clean hierarchical memory system
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, chatId, query } = await req.json();
    
    const contextManager = new CleanContextManager();
    const testChatId = chatId || `chat_${Date.now()}`;

    let result: any = {};

    switch (action) {
      case 'store_conversation':
        // Test storing a conversation
        const testConversationId = contextManager.generateConversationId(testChatId);
        
        await contextManager.storeConversation(userId, testChatId, testConversationId, [
          {
            id: 'msg1',
            role: 'user',
            content: 'Hello, my name is John and I work as a software engineer at Google.',
            timestamp: new Date()
          },
          {
            id: 'msg2', 
            role: 'assistant',
            content: 'Hello John! Nice to meet you. It\'s great to know you work as a software engineer at Google. How can I help you today?',
            timestamp: new Date()
          },
          {
            id: 'msg3',
            role: 'user', 
            content: 'I\'m working on a machine learning project using TensorFlow. Can you help me with some optimization tips?',
            timestamp: new Date()
          }
        ]);

        result = {
          action: 'store_conversation',
          chatId: testChatId,
          conversationId: testConversationId,
          status: 'stored'
        };
        break;

      case 'test_memory_retrieval':
        // Test memory retrieval with hierarchical context
        const retrievalChatId = testChatId;
        const retrievalConversationId = contextManager.generateConversationId(retrievalChatId);
        const testQuery = query || 'Who am I and what do I work on?';

        const context = {
          userId,
          chatId: retrievalChatId,
          conversationId: retrievalConversationId,
          messages: [
            {
              id: 'current_msg',
              role: 'user' as const,
              content: testQuery,
              timestamp: new Date()
            }
          ],
          memoryEnabled: true
        };

        const messagesWithMemory = await contextManager.getContextWithMemory(context);
        
        result = {
          action: 'test_memory_retrieval',
          chatId: retrievalChatId,
          query: testQuery,
          originalMessages: context.messages.length,
          enhancedMessages: messagesWithMemory.length,
          memoryInjected: messagesWithMemory.length > context.messages.length,
          memoryContent: messagesWithMemory.find(m => m.id === 'memory-context')?.content?.substring(0, 500) + '...',
          allMessages: messagesWithMemory.map(m => ({
            id: m.id,
            role: m.role,
            contentPreview: m.content.substring(0, 100) + '...'
          }))
        };
        break;

      case 'test_cross_chat':
        // Test cross-chat memory by creating a second chat
        const chat1Id = `chat_${Date.now()}_primary`;
        const chat2Id = `chat_${Date.now()}_secondary`;

        // Store conversation in chat 1
        const conv1Id = contextManager.generateConversationId(chat1Id);
        await contextManager.storeConversation(userId, chat1Id, conv1Id, [
          {
            id: 'c1_msg1',
            role: 'user',
            content: 'I love playing guitar and I\'ve been learning jazz for 3 years.',
            timestamp: new Date()
          },
          {
            id: 'c1_msg2',
            role: 'assistant', 
            content: 'That\'s wonderful! Jazz guitar is a challenging but rewarding genre.',
            timestamp: new Date()
          }
        ]);

        // Small delay to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        // Test retrieval from chat 2 (should find cross-chat context)
        const conv2Id = contextManager.generateConversationId(chat2Id);
        const crossChatContext = {
          userId,
          chatId: chat2Id,
          conversationId: conv2Id,
          messages: [
            {
              id: 'c2_msg1',
              role: 'user' as const,
              content: 'What are my hobbies?',
              timestamp: new Date()
            }
          ],
          memoryEnabled: true
        };

        const crossChatMessages = await contextManager.getContextWithMemory(crossChatContext);

        result = {
          action: 'test_cross_chat',
          chat1Id,
          chat2Id,
          storedInChat1: conv1Id,
          queriedFromChat2: conv2Id,
          memoryFound: crossChatMessages.length > crossChatContext.messages.length,
          memoryContent: crossChatMessages.find(m => m.id === 'memory-context')?.content?.substring(0, 500) + '...'
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in clean memory system test:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test clean memory system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/memory/test-clean-system - Get test instructions
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Clean Hierarchical Memory System Test API',
    endpoints: {
      'POST with action: store_conversation': 'Store a test conversation',
      'POST with action: test_memory_retrieval': 'Test memory retrieval with query',
      'POST with action: test_cross_chat': 'Test cross-chat memory retrieval'
    },
    example: {
      method: 'POST',
      body: {
        action: 'store_conversation',
        chatId: 'optional-chat-id'
      }
    }
  });
}