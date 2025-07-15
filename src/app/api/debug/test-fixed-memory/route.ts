import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CleanMemoryStore } from '@/lib/memory/CleanMemoryStore';
import { CleanContextManager } from '@/lib/memory/CleanContextManager';

// POST /api/debug/test-fixed-memory - Test the fixed memory system
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();
    const memoryStore = new CleanMemoryStore();
    const contextManager = new CleanContextManager();

    let result: any = {};

    switch (action) {
      case 'test_storage':
        // Test storing a conversation in the existing user-vectors collection
        try {
          console.log('🔧 DEBUG: Testing storage with parameters:', {
            userId: userId.substring(0, 20) + '...',
            chatId: 'chat_test_123',
            conversationId: 'conv_test_456',
            content: 'Hello, my name is John and I work at Google as a software engineer.',
            role: 'user'
          });

          await memoryStore.storeConversation(
            userId,
            'chat_test_123', // chatId
            'conv_test_456', // conversationId  
            'Hello, my name is John and I work at Google as a software engineer.',
            'user',
            { messageCount: 1, tokenCount: 50 }
          );
          
          result = {
            action: 'test_storage',
            success: true,
            message: 'Successfully stored test conversation in user-vectors collection'
          };
        } catch (error) {
          result = {
            action: 'test_storage', 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown storage error',
            details: error
          };
        }
        break;

      case 'test_retrieval':
        // Test retrieving hierarchical context
        try {
          const context = await memoryStore.getHierarchicalContext(
            userId,
            'chat_test_new', // Different chat to test cross-chat retrieval
            'conv_new_789',
            'Who am I and where do I work?' 
          );
          
          result = {
            action: 'test_retrieval',
            success: true,
            context: {
              conversationCount: context.conversationContext.length,
              chatCount: context.chatContext.length,
              userCount: context.userContext.length,
              totalFound: context.totalFound
            },
            formatted: memoryStore.formatHierarchicalContext(context)
          };
        } catch (error) {
          result = {
            action: 'test_retrieval',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown retrieval error',
            details: error
          };
        }
        break;

      case 'test_chatid_extraction':
        // Test chat ID extraction with different formats
        const testIds = [
          'conv_1752529334382',
          'chat_123',
          'chat_123_conv_456', 
          'some_random_id'
        ];
        
        result = {
          action: 'test_chatid_extraction',
          results: testIds.map(id => ({
            input: id,
            output: contextManager.extractChatId(id)
          }))
        };
        break;

      case 'test_contextmanager_storage':
        // Test the CleanContextManager storage method directly
        try {
          const testMessages = [
            {
              id: 'msg_1',
              role: 'user' as const,
              content: 'Hello, my name is Alice and I am a data scientist.',
              timestamp: new Date()
            },
            {
              id: 'msg_2', 
              role: 'assistant' as const,
              content: 'Nice to meet you Alice! Data science is a fascinating field.',
              timestamp: new Date()
            }
          ];

          await contextManager.storeConversation(
            userId,
            'chat_contexttest_123',
            'conv_contexttest_456',
            testMessages
          );

          result = {
            action: 'test_contextmanager_storage',
            success: true,
            message: 'Successfully stored conversation via CleanContextManager'
          };
        } catch (error) {
          result = {
            action: 'test_contextmanager_storage',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown contextmanager storage error',
            details: error
          };
        }
        break;

      default:
        return NextResponse.json({
          message: 'Fixed Memory System Test',
          actions: [
            'test_storage - Test storing conversation in existing user-vectors collection',
            'test_retrieval - Test hierarchical memory retrieval', 
            'test_chatid_extraction - Test chat ID extraction logic',
            'test_contextmanager_storage - Test CleanContextManager storage method'
          ]
        });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in fixed memory test:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test fixed memory system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET instructions
export async function GET() {
  return NextResponse.json({
    message: 'Fixed Memory System Test API',
    usage: 'POST with {"action": "test_storage"} or {"action": "test_retrieval"}',
    note: 'Tests the fixed CleanMemoryStore with existing user-vectors collection'
  });
}