import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AdvancedContextManager } from '@/lib/context/AdvancedContextManager';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

// GET /api/debug/test-memory-injection - Test memory injection with actual context
export async function GET(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    const { userId } = await auth();
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    console.log(`🔍 Testing memory injection for user ${userId}`);

    const contextManager = new AdvancedContextManager();
    const testConversationId = "test-conv-" + Date.now();

    const results = {
      userId: userId,
      testConversationId: testConversationId,
      testPassed: false,
      memoryInjected: false,
      finalMessages: [] as any[],
      logs: [] as string[],
      errors: [] as string[]
    };

    try {
      // Create a test context
      console.log('🔧 Creating test context...');
      const context = await contextManager.getOrCreateContext(userId, testConversationId);
      results.logs.push('✅ Context created successfully');

      // Add a test user message
      const testUserMessage = {
        id: 'test-user-msg',
        role: 'user' as const,
        content: 'who am i',
        timestamp: new Date()
      };

      context.messages.push(testUserMessage);
      results.logs.push('✅ Test user message added');

      // Get enhanced context with memory injection
      console.log('🔧 Getting enhanced context with memory...');
      const enhancedContext = await contextManager.getEnhancedContext(context);
      results.logs.push('✅ Enhanced context retrieved');

      // Check if memory was injected
      const memoryMessage = enhancedContext.messages.find(m => m.id === 'cross-chat-memory');
      results.memoryInjected = !!memoryMessage;
      results.finalMessages = enhancedContext.messages.map(m => ({
        id: m.id,
        role: m.role,
        contentLength: m.content?.length || 0,
        contentPreview: m.content ? m.content.substring(0, 200) + '...' : null
      }));

      if (memoryMessage) {
        results.logs.push('✅ Memory message found in final context');
        results.logs.push(`📋 Memory content length: ${memoryMessage.content?.length || 0}`);
        results.testPassed = true;
      } else {
        results.logs.push('⚠️ No memory message found in final context');
        results.testPassed = false;
      }

      console.log('🔧 Test results:', {
        memoryInjected: results.memoryInjected,
        messageCount: results.finalMessages.length,
        testPassed: results.testPassed
      });

    } catch (testError) {
      results.errors.push(`Test error: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      console.error('❌ Test error:', testError);
    }

    return createSecureResponse(results);

  } catch (error) {
    console.error('Error in memory injection test:', error);
    return createErrorResponse(
      'Failed to test memory injection',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}