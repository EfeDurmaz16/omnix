import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextManager } from '@/lib/context/AdvancedContextManager';

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const auth_result = await auth();
    const userId = auth_result.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      userId,
      stats,
      testResults: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Memory test failed:', error);
    return NextResponse.json(
      { 
        error: 'Memory test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const auth_result = await auth();
    const userId = auth_result.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    if (action === 'sync-profile') {
      await (contextManager as any).vectorStore.syncUserProfile(userId, true);
      return NextResponse.json({ success: true, message: 'Profile synced' });
    }

    if (action === 'test-extraction') {
      const { message } = data;
      if (!message) {
        return NextResponse.json({ error: 'Message required' }, { status: 400 });
      }

      // Create a temporary context to test extraction
      const context = await contextManager.getOrCreateContext(userId, `test_${Date.now()}`);
      await contextManager.addMessage(context.id, {
        role: 'user',
        content: message,
        model: 'gpt-4o'
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Extraction test completed',
        contextId: context.id 
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Memory test POST failed:', error);
    return NextResponse.json(
      { 
        error: 'Memory test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 