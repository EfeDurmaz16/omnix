import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { enhancedModelRouter, EnhancedGenerateRequest } from '@/lib/router/EnhancedModelRouter';
import { StreamProcessor } from '@/lib/ai/streaming/StreamProcessor';
import { OptimizedMemoryService } from '@/lib/ai/memory/OptimizedMemoryService';
import { AdvancedContextManager } from '@/lib/context/AdvancedContextManager';
import { prisma } from '@/lib/db';

// Initialize services
const contextManager = new AdvancedContextManager();
const optimizedMemoryService = new OptimizedMemoryService(contextManager);

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      message,
      model = 'gpt-4',
      chatId,
      temperature = 0.7,
      maxTokens = 2000,
      useWebSearch = false,
      memoryBudget = 2500
    } = body;

    // Validate input
    if (!message || !chatId) {
      return NextResponse.json(
        { error: 'Message and chatId are required' },
        { status: 400 }
      );
    }

    // Set up streaming response
    const response = new NextResponse(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Create custom Response object for StreamProcessor
          const mockResponse = {
            write: (data: string) => {
              controller.enqueue(encoder.encode(data));
            }
          };

          const processor = new StreamProcessor(mockResponse as any, chatId, messageId);

          try {
            // Start memory retrieval and inject context event
            processor.processChunk(JSON.stringify({
              type: 'memory_context',
              content: 'Retrieving relevant memories...',
              complete: false
            }));

            // Get optimized memories (this is now fast due to caching)
            const memoryStartTime = Date.now();
            const memoryContext = await optimizedMemoryService.getOptimizedMemories(
              userId,
              chatId,
              message,
              memoryBudget
            );

            const memoryRetrievalTime = Date.now() - memoryStartTime;

            // Send memory context status
            await processor.processChunk(JSON.stringify({
              type: 'memory_context',
              content: `Retrieved ${memoryContext.conversationMemories.length + memoryContext.userMemories.length} memories in ${memoryRetrievalTime}ms`,
              complete: true,
              metadata: {
                cacheHit: memoryContext.cacheHit,
                totalTokens: memoryContext.totalTokens,
                retrievalTime: memoryRetrievalTime
              }
            }));

            // Build messages array with context
            const contextPrompt = buildContextPrompt(memoryContext);
            const messages = [
              {
                role: 'system' as const,
                content: contextPrompt
              },
              {
                role: 'user' as const,
                content: message
              }
            ];

            // Build enhanced request
            const enhancedRequest: EnhancedGenerateRequest = {
              messages,
              model,
              temperature,
              maxTokens,
              context: {
                userId,
                sessionId: chatId,
                conversationId: chatId,
                preferences: {}
              },
              useRAG: false, // We're handling memory ourselves
              requireWebSearch: useWebSearch,
              fallbackModels: ['gpt-3.5-turbo', 'claude-3-haiku']
            };

            // Start streaming from model
            const streamStartTime = Date.now();
            let totalContent = '';
            let lastContentLength = 0;

            for await (const chunk of enhancedModelRouter.generateStream(enhancedRequest)) {
              if (chunk.content) {
                // Debug: Log what we're receiving (cumulative content)
                console.log('🔍 Raw chunk received (cumulative):', JSON.stringify(chunk.content));
                
                // Extract only the NEW content since chunks are cumulative
                const newContent = chunk.content.slice(lastContentLength);
                lastContentLength = chunk.content.length;
                
                console.log('🔍 New delta content:', JSON.stringify(newContent));
                
                if (newContent) {
                  await processor.processChunk(newContent);
                }
                
                // Track total content for saving to database
                totalContent = chunk.content;
              }

              if (chunk.done) {
                // Save conversation to database
                await saveConversation(userId, chatId, message, totalContent, model);
                
                // Process memory asynchronously (fire-and-forget)
                processMemoryAsync(userId, chatId, message, totalContent);
                
                break;
              }
            }

            await processor.finish();

          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                content: error instanceof Error ? error.message : 'Unknown error',
                complete: true 
              })}\n\n`)
            );
          } finally {
            controller.close();
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable Nginx buffering
        },
      }
    );

    return response;

  } catch (error) {
    console.error('Stream setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup stream' },
      { status: 500 }
    );
  }
}

function buildContextPrompt(memoryContext: any): string {
  let prompt = "You are an AI assistant with access to the user's conversation history and preferences.\n\n";

  if (memoryContext.userMemories.length > 0) {
    prompt += "User Context:\n";
    for (const memory of memoryContext.userMemories.slice(0, 5)) {
      prompt += `- ${memory.content}\n`;
    }
    prompt += "\n";
  }

  if (memoryContext.conversationMemories.length > 0) {
    prompt += "Recent Conversation:\n";
    for (const memory of memoryContext.conversationMemories.slice(0, 3)) {
      prompt += `- ${memory.content}\n`;
    }
    prompt += "\n";
  }

  prompt += "Please respond naturally and helpfully, taking into account the user's context and conversation history.";

  return prompt;
}

async function saveConversation(
  userId: string,
  chatId: string,
  userMessage: string,
  assistantMessage: string,
  model: string
) {
  try {
    // Get or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: { id: chatId }
    });

    const messages = conversation?.messages as any[] || [];
    
    // Add new messages
    messages.push(
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
        model
      }
    );

    if (conversation) {
      await prisma.conversation.update({
        where: { id: chatId },
        data: {
          messages,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.conversation.create({
        data: {
          id: chatId,
          userId,
          title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
          model,
          messages,
        }
      });
    }
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}

async function processMemoryAsync(
  userId: string,
  chatId: string,
  userMessage: string,
  assistantMessage: string
) {
  // This runs in the background to extract and store memories
  try {
    const memoryContent = {
      userMessage,
      assistantMessage,
      timestamp: new Date().toISOString()
    };

    // Use existing context manager to extract memories
    await contextManager.injectMemoryFromChat(userId, [
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage }
    ]);

    console.log(`Memory processed for user ${userId}, chat ${chatId}`);
  } catch (error) {
    console.error('Memory processing error:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'memory-stats':
        const stats = await optimizedMemoryService.getMemoryStats(userId);
        return NextResponse.json({ success: true, data: stats });

      case 'pre-warm':
        const chatId = searchParams.get('chatId');
        if (chatId) {
          await optimizedMemoryService.preWarmCache(userId, chatId);
          return NextResponse.json({ success: true, message: 'Cache pre-warmed' });
        }
        return NextResponse.json({ error: 'chatId required' }, { status: 400 });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Stream GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}