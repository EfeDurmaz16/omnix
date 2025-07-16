import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { enhancedModelRouter, EnhancedGenerateRequest } from '@/lib/router/EnhancedModelRouter';
import { ElasticsearchRAG } from '@/lib/rag/ElasticsearchRAG';
import { FirecrawlWebSearch } from '@/lib/search/FirecrawlWebSearch';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    const body = await request.json();
    const {
      messages,
      model,
      temperature,
      maxTokens,
      stream = false,
      conversationId,
      sessionId,
      useRAG = false,
      requireWebSearch = false,
      preferences = {},
      fallbackModels = []
    } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build enhanced request
    const enhancedRequest: EnhancedGenerateRequest = {
      messages,
      model,
      temperature,
      maxTokens,
      context: {
        userId,
        sessionId,
        conversationId,
        preferences
      },
      useRAG,
      requireWebSearch,
      fallbackModels
    };

    // Handle streaming response
    if (stream) {
      return handleStreamingResponse(enhancedRequest);
    }

    // Handle regular response
    const startTime = Date.now();
    const response = await enhancedModelRouter.generateText(enhancedRequest);

    return NextResponse.json({
      success: true,
      data: {
        id: response.id,
        content: response.content,
        model: response.actualModel,
        provider: response.providerUsed,
        usage: response.usage,
        cost: response.cost,
        processingTime: response.processingTime,
        fallbacksAttempted: response.fallbacksAttempted,
        cacheHit: response.cacheHit,
        ragResults: response.ragResults,
        webSearchResults: response.webSearchResults,
        metadata: {
          ...response.metadata,
          timestamp: new Date().toISOString(),
          userId,
          conversationId,
          sessionId
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Enhanced chat API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handleStreamingResponse(request: EnhancedGenerateRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of enhancedModelRouter.generateStream(request)) {
          const data = JSON.stringify({
            id: chunk.id,
            content: chunk.content,
            model: chunk.model,
            done: chunk.done,
            finishReason: chunk.finishReason,
            metadata: chunk.metadata
          });
          
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          
          if (chunk.done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            break;
          }
        }
      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// GET endpoint for chat-related queries
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        const health = enhancedModelRouter.getProviderHealth();
        const healthData = Object.fromEntries(health);
        return NextResponse.json({
          success: true,
          data: healthData
        });

      case 'models':
        const filter = {
          provider: searchParams.get('provider') || undefined,
          category: searchParams.get('category') || undefined,
          type: searchParams.get('type') as any || undefined,
          freeOnly: searchParams.get('freeOnly') === 'true'
        };
        
        const models = await enhancedModelRouter.getAvailableModels(filter);
        return NextResponse.json({
          success: true,
          data: models
        });

      case 'recommendations':
        const task = searchParams.get('task') || 'text';
        const recommendations = await enhancedModelRouter.getModelRecommendations(task);
        return NextResponse.json({
          success: true,
          data: recommendations
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Enhanced chat GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}