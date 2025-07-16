import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextManager } from '@/lib/context/AdvancedContextManager';
import { debugAuth } from '@/lib/security/debugAuth';
import { createSecureResponse, createErrorResponse } from '@/lib/security/apiSecurity';

export async function GET(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    // Authentication check
    const auth_result = await auth();
    const userId = auth_result.userId;
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    console.log('🧪 Running memory system test for user:', userId);

    // Test memory system
    await contextManager.testMemorySystem(userId);

    // Get memory stats
    const stats = await (contextManager as any).vectorStore.getUserMemoryStats(userId);

    // Test memory retrieval
    const testQueries = [
      'who am i',
      'what do you know about me',
      'my profile',
      'user information',
      'personal details'
    ];

    const results = [];
    for (const query of testQueries) {
      const memories = await (contextManager as any).vectorStore.searchUserMemories(userId, query, undefined, 3);
      results.push({
        query,
        memories: memories.map(m => ({
          type: m.type,
          content: m.content,
          confidence: m.confidence
        }))
      });
    }

    return createSecureResponse({
      success: true,
      userId,
      stats,
      testResults: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Memory test failed:', error);
    return createErrorResponse(
      'Memory test failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Debug endpoint authentication
    const authResult = await debugAuth(req);
    if (authResult) {
      return authResult;
    }
    
    // Authentication check
    const auth_result = await auth();
    const userId = auth_result.userId;
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { action, data } = await req.json();

    if (action === 'sync-profile') {
      await (contextManager as any).vectorStore.syncUserProfile(userId, true);
      return createSecureResponse({ success: true, message: 'Profile synced' });
    }

    if (action === 'test-extraction') {
      const { message } = data;
      if (!message) {
        return createErrorResponse('Message required', 400);
      }

      // Create a temporary context to test extraction
      const context = await contextManager.getOrCreateContext(userId, `test_${Date.now()}`);
      await contextManager.addMessage(context.id, {
        role: 'user',
        content: message,
        model: 'gpt-4o'
      });

      return createSecureResponse({ 
        success: true, 
        message: 'Extraction test completed',
        contextId: context.id 
      });
    }

    return createErrorResponse('Unknown action', 400);

  } catch (error) {
    console.error('Memory test POST failed:', error);
    return createErrorResponse(
      'Memory test failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
} 