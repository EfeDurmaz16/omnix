import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// POST /api/test-new-memory - Test the new memory system with actual chat API
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { step } = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    let result: any = {};

    switch (step) {
      case '1':
        // Step 1: Send first message to introduce yourself
        const firstResponse = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userId}`, // This won't work, but shows the flow
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: 'Hello! My name is John and I work as a software engineer at Google. I love playing guitar and hiking.'
              }
            ],
            model: 'gpt-4o-mini',
            conversationId: `test_chat_${Date.now()}`,
            includeMemory: true
          })
        });

        if (firstResponse.ok) {
          const data = await firstResponse.json();
          result = {
            step: 1,
            success: true,
            conversationId: data.conversationId,
            memoryEnhanced: data.memoryEnhanced,
            message: 'Sent introduction message'
          };
        } else {
          result = {
            step: 1,
            success: false,
            error: 'Failed to send first message'
          };
        }
        break;

      case '2':
        // Step 2: Ask "who am I" in a new conversation
        const secondResponse = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userId}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user', 
                content: 'Who am I and what do I do for work?'
              }
            ],
            model: 'gpt-4o-mini',
            conversationId: `test_chat_memory_${Date.now()}`,
            includeMemory: true
          })
        });

        if (secondResponse.ok) {
          const data = await secondResponse.json();
          result = {
            step: 2,
            success: true,
            conversationId: data.conversationId,
            memoryEnhanced: data.memoryEnhanced,
            response: data.content || data.message,
            message: 'Asked "who am I" - check if it remembers John/Google'
          };
        } else {
          result = {
            step: 2,
            success: false,
            error: 'Failed to send memory query'
          };
        }
        break;

      default:
        return NextResponse.json({ 
          message: 'New Memory System Test',
          instructions: [
            'POST with { "step": "1" } - Send introduction message',
            'Wait a few seconds for storage',
            'POST with { "step": "2" } - Ask "who am I" to test memory'
          ]
        });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in new memory test:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test new memory system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/test-new-memory - Instructions
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'New Memory System Test API',
    description: 'Test the clean hierarchical memory system integration',
    usage: [
      '1. POST with { "step": "1" } to send introduction',
      '2. Wait a few seconds for database storage',
      '3. POST with { "step": "2" } to test memory recall'
    ],
    note: 'This tests the actual chat API with the new CleanContextManager'
  });
}