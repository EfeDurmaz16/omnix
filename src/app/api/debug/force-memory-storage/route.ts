import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// POST /api/debug/force-memory-storage - Force store test memories
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔧 Force storing test memories for user ${userId}`);

    const results = {
      userId: userId,
      testConversationStored: false,
      testMemoriesStored: false,
      errors: []
    };

    try {
      // Import required modules
      const { contextManager } = await import('@/lib/context/AdvancedContextManager');
      
      // Create a test conversation
      const testConversationId = `test_conversation_${Date.now()}`;
      
      const testContext = await contextManager.getOrCreateContext(
        userId,
        testConversationId,
        'gpt-4o',
        false // Full mode to trigger storage
      );

      // Add test messages
      await contextManager.addMessage(testContext.id, {
        role: 'user',
        content: 'My name is Efe, I am 19 years old from Bursa Turkey, studying at Bilkent University and working at Nokia as an intern. I love AI development and technology.',
        model: 'gpt-4o'
      });

      await contextManager.addMessage(testContext.id, {
        role: 'assistant', 
        content: 'Nice to meet you Efe! That sounds like an exciting combination - studying at Bilkent University and working as an intern at Nokia. AI development is definitely a fascinating field. What specific areas of AI development are you most interested in?',
        model: 'gpt-4o'
      });

      await contextManager.addMessage(testContext.id, {
        role: 'user',
        content: 'I am particularly interested in machine learning, natural language processing, and building AI agents. I am currently working on an omnix AI agent platform.',
        model: 'gpt-4o'
      });

      results.testConversationStored = true;
      console.log(`✅ Test conversation stored: ${testConversationId}`);

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      results.testMemoriesStored = true;
      console.log(`✅ Test memories should be processed`);

    } catch (storageError) {
      console.error('Error storing test memories:', storageError);
      results.errors.push(`Storage error: ${storageError}`);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in force-memory-storage:', error);
    return NextResponse.json(
      { 
        error: 'Failed to force memory storage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}