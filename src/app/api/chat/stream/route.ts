import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { enhancedModelRouter, EnhancedGenerateRequest } from '@/lib/router/EnhancedModelRouter';
import { StreamProcessor } from '@/lib/ai/streaming/StreamProcessor';
import { CleanContextManager } from '@/lib/memory/CleanContextManager';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

// Initialize services
const cleanContextManager = new CleanContextManager();

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

    // Log request details
    logger.info('Stream request started', {
      component: 'stream',
      userId: userId.substring(0, 12) + '...',
      chatId: chatId,
      messageLength: message?.length
    });

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

            const memoryStartTime = Date.now();

            // Build context using the proven CleanContextManager
            const userMessage = {
              id: messageId,
              role: 'user' as const,
              content: message,
              timestamp: new Date()
            };

            // Generate unique conversationId for this conversation
            const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const simpleContext = {
              userId,
              chatId,
              conversationId, // Use unique conversationId
              messages: [userMessage],
              memoryEnabled: true
            };

            // IMMEDIATELY store user message in short-term memory
            cleanContextManager.storeInShortTermMemory(userId, chatId, userMessage);

            // Store user message in long-term memory BEFORE retrieval so it can be found in L1/L2
            try {
              await cleanContextManager['memoryStore'].storeConversation(
                userId,
                chatId,
                conversationId,
                userMessage,
                'user',
                { messageCount: 1, tokenCount: Math.ceil(userMessage.length / 4) }
              );
              console.log('✅ User message stored before memory retrieval');
            } catch (error) {
              console.error('❌ Failed to store user message before retrieval:', error);
            }

            // Get enhanced messages with hierarchical memory context (L1-L2-L3)
            const enhancedMessages = await cleanContextManager.getContextWithMemory(simpleContext);
            
            const memoryRetrievalTime = Date.now() - memoryStartTime;
            const memoryInjected = enhancedMessages.length > simpleContext.messages.length;

            // Send memory context status
            await processor.processChunk(JSON.stringify({
              type: 'memory_context',
              content: memoryInjected 
                ? `Retrieved memory context in ${memoryRetrievalTime}ms` 
                : `No relevant memories found (${memoryRetrievalTime}ms)`,
              complete: true,
              metadata: {
                memoryInjected,
                retrievalTime: memoryRetrievalTime,
                messageCount: enhancedMessages.length
              }
            }));

            logger.debug('Clean memory context injection', {
              component: 'memory',
              originalCount: simpleContext.messages.length,
              enhancedCount: enhancedMessages.length,
              memoryInjected,
              retrievalTime: memoryRetrievalTime
            });

            // Build enhanced request using the clean context manager's enhanced messages
            const enhancedRequest: EnhancedGenerateRequest = {
              messages: enhancedMessages.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              model,
              temperature,
              maxTokens,
              context: {
                userId,
                sessionId: chatId,
                conversationId: chatId,
                preferences: {}
              },
              useRAG: false, // We're handling memory through CleanContextManager
              requireWebSearch: useWebSearch,
              fallbackModels: ['gpt-3.5-turbo', 'claude-3-haiku']
            };

            // Start streaming from model
            const streamStartTime = Date.now();
            let totalContent = '';
            let lastContentLength = 0;

            for await (const chunk of enhancedModelRouter.generateStream(enhancedRequest)) {
              if (chunk.content) {
                // Extract only the NEW content since chunks are cumulative
                const newContent = chunk.content.slice(lastContentLength);
                lastContentLength = chunk.content.length;
                
                logger.trace('Chunk received', {
                  component: 'stream',
                  newContentLength: newContent.length,
                  totalLength: chunk.content.length
                });
                
                if (newContent) {
                  await processor.processChunk(newContent);
                }
                
                // Track total content for saving to database
                totalContent = chunk.content;
              }

              if (chunk.done) {
                // Save conversation to database
                await saveConversation(userId, chatId, message, totalContent, model);
                
                // Store BOTH user and assistant messages in short-term memory immediately
                const assistantMessage = {
                  id: `assistant_${Date.now()}`,
                  role: 'assistant' as const,
                  content: totalContent,
                  timestamp: new Date()
                };
                
                cleanContextManager.storeInShortTermMemory(userId, chatId, assistantMessage);
                logger.info('Stored both messages in short-term memory', {
                  component: 'memory',
                  userMessageLength: message.length,
                  assistantMessageLength: totalContent.length
                });
                
                // Store conversation in CleanMemoryStore (fire-and-forget for long-term)
                storeConversationMemory(userId, chatId, conversationId, message, totalContent);
                
                break;
              }
            }

            await processor.finish();

          } catch (error) {
            logger.error('Streaming error', { component: 'stream', chatId }, error);
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
    logger.error('Stream setup error', { component: 'stream' }, error);
    return NextResponse.json(
      { error: 'Failed to setup stream' },
      { status: 500 }
    );
  }
}

// Note: buildContextPrompt removed - using CleanContextManager instead

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
    logger.error('Failed to save conversation', { component: 'stream', chatId }, error);
  }
}

// Simple memory storage using CleanMemoryStore
async function storeConversationMemory(
  userId: string,
  chatId: string,
  conversationId: string,
  userMessage: string,
  assistantMessage: string
) {
  try {
    logger.info('Storing conversation memory', {
      component: 'memory',
      userId: userId.substring(0, 12) + '...',
      chatId
    });

    console.log('🔧 DEBUG: storeConversationMemory parameters:', {
      userId: userId?.substring(0, 20) + '...' || 'undefined',
      chatId: chatId || 'undefined',
      conversationId: conversationId || 'undefined',
      userMessageLength: userMessage?.length || 0,
      assistantMessageLength: assistantMessage?.length || 0
    });

    // User message already stored before memory retrieval - skip duplicate storage

    // Store assistant message
    await cleanContextManager['memoryStore'].storeConversation(
      userId,
      chatId,
      conversationId, // Now correctly passed from calling function
      assistantMessage,
      'assistant',
      { messageCount: 1, tokenCount: Math.ceil(assistantMessage.length / 4) }
    );

    logger.info('Successfully stored conversation memory', {
      component: 'memory',
      userId: userId.substring(0, 12) + '...',
      chatId
    });

  } catch (error) {
    logger.error('Failed to store conversation memory', {
      component: 'memory',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper function to extract entities (simplified)
async function extractEntities(text: string): Promise<string[]> {
  try {
    // Simple entity extraction - could be enhanced with NLP
    const entities = [];
    
    // Extract names (capitalized words)
    const names = text.match(/\b[A-Z][a-z]+\b/g) || [];
    entities.push(...names);
    
    // Extract emails
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    entities.push(...emails);
    
    // Extract numbers/dates
    const numbers = text.match(/\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [];
    entities.push(...numbers);
    
    return [...new Set(entities)]; // Remove duplicates
  } catch (error) {
    logger.error('Entity extraction error', { component: 'memory' }, error);
    return [];
  }
}

// Helper function to extract topics (simplified)
async function extractTopics(text: string): Promise<string[]> {
  try {
    // Simple topic extraction - could be enhanced with ML
    const topics = [];
    
    // Common programming topics
    const programmingTerms = ['javascript', 'python', 'react', 'api', 'database', 'server', 'client', 'function', 'variable', 'array', 'object'];
    programmingTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        topics.push(term);
      }
    });
    
    // Common business topics
    const businessTerms = ['project', 'meeting', 'deadline', 'budget', 'team', 'client', 'product', 'service'];
    businessTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        topics.push(term);
      }
    });
    
    return [...new Set(topics)];
  } catch (error) {
    logger.error('Topic extraction error', { component: 'memory' }, error);
    return [];
  }
}

// Helper function to calculate importance
function calculateImportance(userMessage: string, assistantMessage: string): number {
  let importance = 0.5; // Base importance
  
  // Longer conversations are more important
  const totalLength = userMessage.length + assistantMessage.length;
  if (totalLength > 500) importance += 0.2;
  if (totalLength > 1000) importance += 0.2;
  
  // Questions and problems are more important
  if (userMessage.includes('?') || userMessage.toLowerCase().includes('how') || 
      userMessage.toLowerCase().includes('what') || userMessage.toLowerCase().includes('why')) {
    importance += 0.2;
  }
  
  // Code or technical content is more important
  if (assistantMessage.includes('```') || assistantMessage.includes('function') || 
      assistantMessage.includes('const ') || assistantMessage.includes('import ')) {
    importance += 0.3;
  }
  
  return Math.min(1.0, importance); // Cap at 1.0
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
        // Simple stats for CleanContextManager
        const stats = {
          totalMemories: 'Using CleanMemoryStore',
          cacheHitRate: 'N/A',
          averageRetrievalTime: 'Fast hierarchical lookup',
          memoryTypes: { conversations: 'Stored with embeddings' }
        };
        return NextResponse.json({ success: true, data: stats });

      case 'pre-warm':
        const chatId = searchParams.get('chatId');
        if (chatId) {
          logger.info('Pre-warm requested for CleanContextManager', {
            component: 'memory',
            userId: userId.substring(0, 12) + '...',
            chatId
          });
          // CleanContextManager doesn't need pre-warming - it's already fast
          return NextResponse.json({ success: true, message: 'CleanContextManager is already optimized' });
        }
        return NextResponse.json({ error: 'chatId required' }, { status: 400 });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Stream GET error', { component: 'stream' }, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}