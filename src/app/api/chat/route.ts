import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GenerateRequest } from '@/lib/providers/base';
import { EnhancedGenerateRequest } from '@/lib/router/EnhancedModelRouter';
import { CleanContextManager } from '@/lib/memory/CleanContextManager';
import { FirecrawlWebSearch } from '@/lib/search/FirecrawlWebSearch';
import { enhancedModelRouter } from '@/lib/router/EnhancedModelRouter';
import { modelCatalog } from '@/lib/catalog/ModelCatalog';
import { analyticsTracker } from '@/lib/analytics/AnalyticsTracker';
import { validateAndSanitize, chatRequestSchema, checkRateLimit, rateLimits } from '@/lib/security/inputValidation';
import { createSecureResponse, createErrorResponse, validateOrigin, validateRequestSize, logSecurityEvent } from '@/lib/security/apiSecurity';
import { sanitizeHtml } from '@/lib/security/inputValidation';
import { creditCostCalculator } from '@/lib/pricing/CreditCostCalculator';
import { PlanEnforcer } from '@/lib/middleware/PlanEnforcer';

// Extend timeout for long responses
export const maxDuration = 300; // 5 minutes

// Rate limiting is now handled by the security middleware

/**
 * Clean AI response content by removing XML tags and formatting issues
 */
function cleanAIResponse(content: string): string {
  if (!content) return content;
  
  return content
    .replace(/<\/?answer>/g, '')
    .replace(/<\/?think>/g, '')
    .replace(/<\/?thinking>/g, '')
    .replace(/<\/?reasoning>/g, '')
    .replace(/<\/?analysis>/g, '')
    .replace(/<\/?response>/g, '')
    .replace(/<\/?output>/g, '')
    .trim();
}

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  sessionId?: string;
  conversationId?: string;
  mode?: 'flash' | 'think' | 'ultra-think' | 'full-think';
  stream?: boolean;
  includeMemory?: boolean;
  voiceChat?: boolean;
  language?: string;
  enableWebSearch?: boolean;
  forceWebSearch?: boolean;
  files?: Array<{
    name: string;
    type: string;
    url: string;
    content?: string;
    mimeType?: string;
  }>;
}

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  let model: string | undefined;
  let modelInfo: any;
  let requestStartTime: number | undefined;
  let body: ChatRequest | undefined;

  try {
    console.log('Chat API called');
    
    // Security validations
    if (!validateOrigin(req)) {
      return createErrorResponse('Invalid origin', 403);
    }
    
    if (!validateRequestSize(req.headers.get('content-length'))) {
      return createErrorResponse('Request too large', 413);
    }
    
    // Authentication check
    const auth_result = await auth();
    userId = auth_result.userId || undefined;
    console.log('User ID from auth:', userId);
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Parse and validate request body
    body = await req.json();
    
    // Validate request body with schema
    const validation = validateAndSanitize(chatRequestSchema, body);
    if (!validation.success) {
      logSecurityEvent('INVALID_CHAT_REQUEST', userId, { error: validation.error });
      return createErrorResponse(validation.error, 400);
    }
    
    // Use validated data
    body = validation.data;

    const { messages, sessionId, conversationId, mode, files, stream = false, includeMemory = true, voiceChat = false, language = 'en', enableWebSearch = false, forceWebSearch = false } = body;
    model = body.model;
    
    // Estimate credit cost before plan enforcement
    const estimatedCredits = creditCostCalculator.calculateCost(
      model,
      messages.map(m => m.content).join(' ').length,
      'text'
    );
    
    console.log(`🎯 Plan enforcement check: user=${userId}, model=${model}, estimatedCredits=${estimatedCredits}`);
    
    // Plan enforcement - check model access, quotas, and rate limits
    const planCheck = await PlanEnforcer.enforceApiRequest(
      userId,
      model,
      estimatedCredits,
      voiceChat ? 'voice-chat' : 'basic-chat',
      'chat'
    );
    
    if (!planCheck.allowed) {
      console.log('🚫 Plan enforcement failed:', planCheck.reason);
      const response = createErrorResponse(planCheck.reason || 'Access denied', 403, {
        rateLimitInfo: planCheck.rateLimitInfo,
        usageInfo: planCheck.usageInfo
      });
      
      // Add rate limit headers if available
      if (planCheck.headers) {
        Object.entries(planCheck.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    }
    
    console.log('✅ Plan enforcement passed:', {
      rateLimitInfo: planCheck.rateLimitInfo,
      usageInfo: planCheck.usageInfo
    });
    
    // Debug voice chat requests
    if (voiceChat) {
      console.log('🎙️ Voice chat request received:', {
        messageCount: messages?.length || 0,
        lastMessage: messages?.[messages.length - 1]?.content?.substring(0, 100),
        language: language,
        includeMemory: includeMemory
      });
    }

    // Additional validation is handled by schema
    const totalContent = messages.map(m => m.content).join(' ');
    
    // Sanitize message content
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: sanitizeHtml(msg.content)
    }));

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId, rateLimits.chat);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', userId, { endpoint: 'chat' });
      return createErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    // Initialize model catalog and validate model access
    console.log('Validating model access for:', model);
    await modelCatalog.initialize();
    const allModels = await modelCatalog.getAllModels();
    modelInfo = allModels.find(m => m.id === model);
    console.log('Model info for', model, ':', modelInfo ? 'found' : 'not found');
    
    if (!modelInfo) {
      console.log('Access denied for model:', model, '- model not found in catalog');
      logSecurityEvent('INVALID_MODEL_ACCESS', userId, { model });
      return createErrorResponse('Invalid model or model not available', 403);
    }
    
    // TODO: Add user plan validation here if needed
    console.log('Model access granted for:', model);

    // Content filtering (basic)
    const forbiddenWords = ['hack', 'exploit', 'malware', 'virus'];
    if (forbiddenWords.some(word => totalContent.toLowerCase().includes(word))) {
      logSecurityEvent('CONTENT_FILTER_TRIGGERED', userId, { content: totalContent.substring(0, 100) });
      return createErrorResponse('Message contains inappropriate content', 400);
    }

    // Process file attachments if any
    const processedMessages = [...sanitizedMessages];
    const attachedImages: Array<{name: string; type: string; url: string; content?: string; mimeType?: string}> = [];
    
    if (files && files.length > 0) {
      console.log('📎 Processing attached files:', files.length);
      
      const lastMessage = processedMessages[processedMessages.length - 1];
      let messageContent = lastMessage.content;
      
      // Process different file types
      files.forEach((file: any) => {
        console.log('📄 Processing file:', file.name, file.type);
        
        if (file.type === 'image' && file.content) {
          // Collect images separately for vision model processing
          attachedImages.push({
            name: file.name,
            type: 'image',
            url: file.url || '',
            content: file.content,
            mimeType: file.mimeType || 'image/jpeg'
          });
          console.log('🖼️ Image collected for vision processing:', file.name);
          
          // Add image reference to message content
          const hasVisionCapability = model ? (model.includes('gpt-4') || model.includes('claude') || model.includes('gemini') || model.includes('vision')) : false;
          if (hasVisionCapability) {
            messageContent = `[Image: ${file.name} - Vision analysis enabled]\n${messageContent}`;
          } else {
            messageContent = `[Image attached: ${file.name} - Note: This model doesn't support image analysis]\n${messageContent}`;
          }
        } else if (file.type === 'text' && file.content) {
          // For text files, include the actual content
          console.log('📄 Adding text file content:', file.name);
          messageContent = `[Text File: ${file.name}]\n${file.content}\n\n${messageContent}`;
        } else if ((file.type === 'pdf' || file.type === 'PDF') && file.content) {
          // For PDFs, include the extracted text content
          console.log('📑 Adding PDF content:', file.name, file.type, file.content.length, 'characters');
          messageContent = `${file.content}\n\n${messageContent}`;
        } else if ((file.type === 'document' || file.type === 'Word (DOCX)' || file.type === 'PowerPoint (PPTX)' || file.type === 'Excel (XLSX)' || file.type.includes('Word') || file.type.includes('Excel') || file.type.includes('PowerPoint')) && file.content) {
          // For Office documents (Word, Excel, PowerPoint)
          console.log('📋 Adding document content:', file.name, file.type);
          messageContent = `${file.content}\n\n${messageContent}`;
        } else {
          // For other file types
          messageContent = `[File: ${file.name}] (${file.type})\n${messageContent}`;
        }
      });
      
      lastMessage.content = messageContent;
      console.log('✅ Files processed and added to message context');
    }

    // Create the request for our model router
    const generateRequest: GenerateRequest = {
      model,
      messages: processedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      userId,
      sessionId: sessionId || `session_${Date.now()}`,
      mode: mode || 'think',
      temperature: 0.7,
      maxTokens: mode === 'flash' ? 1000 : mode === 'ultra-think' ? 4000 : mode === 'full-think' ? 3000 : 2000,
      attachedImages: attachedImages.filter(img => img.content).map(img => ({
        name: img.name,
        content: img.content!,
        mimeType: img.mimeType!
      }))
    };

    console.log('🧠 Using optimized conversation context');
    
    // Quick mode: Skip heavy RAG operations for faster response
    const useQuickMode = mode === 'flash' || req.nextUrl.searchParams.get('quick') === 'true';
    
    console.log('🧠 DEBUG: Chat mode settings:', {
      mode: mode,
      useQuickMode: useQuickMode,
      isFlashMode: mode === 'flash',
      hasQuickParam: req.nextUrl.searchParams.get('quick') === 'true'
    });
    // Auto-enable quick mode for very simple queries to improve performance
    // BUT exclude memory/context related queries from simple query detection
    const lastMessageContent = processedMessages.length > 0 ? 
      processedMessages[processedMessages.length - 1].content.toLowerCase() : '';
    const isMemoryQuery = lastMessageContent.includes('remember') || 
                         lastMessageContent.includes('memory') || 
                         lastMessageContent.includes('previous') || 
                         lastMessageContent.includes('earlier') ||
                         lastMessageContent.includes('context') ||
                         lastMessageContent.includes('our chat') ||
                         lastMessageContent.includes('conversation') ||
                         lastMessageContent.includes('know about me') ||
                         lastMessageContent.includes('who am i') ||
                         lastMessageContent.includes('what do you know') ||
                         lastMessageContent.includes('tell me about') ||
                         lastMessageContent.includes('my profile') ||
                         lastMessageContent.includes('about myself') ||
                         lastMessageContent.includes('recall') ||
                         lastMessageContent.includes('before') ||
                         lastMessageContent.includes('past') ||
                         lastMessageContent.includes('history') ||
                         lastMessageContent.includes('info about') ||
                         lastMessageContent.includes('information about') ||
                         lastMessageContent.includes('hatırla') ||  // Turkish: remember
                         lastMessageContent.includes('önceki') ||   // Turkish: previous
                         lastMessageContent.includes('geçmiş') ||   // Turkish: past
                         lastMessageContent.includes('daha önce') || // Turkish: before
                         lastMessageContent.includes('hakkında') ||  // Turkish: about
                         lastMessageContent.includes('bana söyle') || // Turkish: tell me
                         lastMessageContent.includes('bilgi') ||     // Turkish: information
                         lastMessageContent.includes('kim') ||       // Turkish: who
                         lastMessageContent.includes('ne biliyorsun') || // Turkish: what do you know
                         lastMessageContent.includes('araştır') ||   // Turkish: research
                         lastMessageContent.includes('özetle') ||    // Turkish: summarize
                         lastMessageContent.includes('analiz') ||    // Turkish: analyze
                         lastMessageContent.includes('research') ||
                         lastMessageContent.includes('analyze') ||
                         lastMessageContent.includes('summarize') ||
                         lastMessageContent.includes('explain') ||
                         lastMessageContent.includes('describe') ||
                         lastMessageContent.includes('study') ||
                         lastMessageContent.includes('investigate') ||
                         lastMessageContent.includes('examine') ||
                         lastMessageContent.includes('review') ||
                         lastMessageContent.includes('search') ||
                         lastMessageContent.includes('find') ||
                         lastMessageContent.includes('look up') ||
                         lastMessageContent.includes('açıkla') ||    // Turkish: explain
                         lastMessageContent.includes('incele') ||    // Turkish: examine
                         lastMessageContent.includes('tanımla') ||   // Turkish: describe
                         lastMessageContent.includes('çalış') ||     // Turkish: study
                         lastMessageContent.includes('ara') ||       // Turkish: search
                         lastMessageContent.includes('bul') ||       // Turkish: find
                         lastMessageContent.includes('bak') ||        // Turkish: look
                         lastMessageContent.includes('do you know who i am') ||
                         lastMessageContent.includes('what do i do') ||
                         lastMessageContent.includes('tell me about myself') ||
                         lastMessageContent.includes('my profile') ||
                         lastMessageContent.includes('about me') ||
                         lastMessageContent.includes('ben kimim') ||    // Turkish: who am I
                         lastMessageContent.includes('ne işi yapıyorum') || // Turkish: what work do I do
                         lastMessageContent.includes('profilim') ||     // Turkish: my profile
                         lastMessageContent.includes('hakkımda');        // Turkish: about me
    
    const isSimpleQuery = processedMessages.length > 0 && 
      processedMessages[processedMessages.length - 1].content.length < 10 && // Reduced from 30 to 10
      !isMemoryQuery; // Don't treat memory queries as simple even if they're short
    
    // Initialize clean context manager
    const cleanContextManager = new CleanContextManager();
    const contextId = conversationId || `chat_${Date.now()}`;
    let enhancedMessages = processedMessages;
    
    if (useQuickMode || isSimpleQuery) {
      // Fast path: minimal context processing
      console.log('⚡ Quick mode: skipping memory operations', isSimpleQuery ? '(simple query detected)' : '(flash mode)');
      enhancedMessages = processedMessages;
      
      // Still add model identity for consistency
      const modelIdentityMessage = {
        id: 'model-identity',
        role: 'system' as const,
        content: `You are responding as ${model}. Maintain this identity throughout the conversation.`,
        timestamp: new Date()
      };
      enhancedMessages = [modelIdentityMessage, ...enhancedMessages];
    } else {
      // Clean hierarchical memory processing
      try {
        console.log('🧠 Using clean hierarchical memory system');
        
        // Extract chatId from conversationId (format: chat_123 or chat_123_conv_456)
        const chatId = cleanContextManager.extractChatId(contextId);
        console.log(`🔍 Chat ID: ${chatId}, Conversation ID: ${contextId}`);
        
        // Create context for memory retrieval
        const memoryContext = {
          userId,
          chatId,
          conversationId: contextId,
          messages: processedMessages.map(msg => ({
            id: msg.id || `msg_${Date.now()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
          })),
          memoryEnabled: !useQuickMode && includeMemory !== false
        };
        
        console.log('🔧 DEBUG Memory context:', {
          userId: userId.substring(0, 20) + '...',
          chatId,
          conversationId: contextId,
          messageCount: memoryContext.messages.length,
          includeMemoryFromRequest: includeMemory,
          useQuickMode,
          memoryEnabled: memoryContext.memoryEnabled,
          lastMessage: memoryContext.messages[memoryContext.messages.length - 1]?.content?.substring(0, 100) + '...'
        });
        
        // Get enhanced messages with memory context
        console.log('🔧 DEBUG: Calling cleanContextManager.getContextWithMemory...');
        enhancedMessages = await cleanContextManager.getContextWithMemory(memoryContext);
        console.log('🔧 DEBUG: getContextWithMemory returned:', {
          originalCount: processedMessages.length,
          enhancedCount: enhancedMessages.length,
          memoryInjected: enhancedMessages.length > processedMessages.length
        });

        // Add model identity system message at the very beginning
        const modelIdentityMessage = {
          id: 'model-identity',
          role: 'system' as const,
          content: `You are responding as ${model}. Maintain this identity throughout the conversation. If you encounter context about other AI models from previous conversations, ignore those model references but still use the user information and conversation context provided.`,
          timestamp: new Date()
        };
        enhancedMessages = [modelIdentityMessage, ...enhancedMessages];
        
        if (enhancedMessages.length > processedMessages.length) {
          console.log('✅ Clean memory context injected:', enhancedMessages.length - processedMessages.length, 'memory messages added');
          const memoryMessage = enhancedMessages.find(m => m.id === 'memory-context');
          if (memoryMessage) {
            console.log('🧠 Memory content preview:', memoryMessage.content.substring(0, 200) + '...');
          }
        } else {
          console.log('📝 No relevant memory found, using current conversation only');
        }
      } catch (error) {
        console.warn('⚠️ Clean memory enhancement failed, using basic context:', error);
        enhancedMessages = processedMessages;
      }
    }

    // Voice chat memory is already handled by the clean memory system above
    if (voiceChat && language !== 'en') {
      // Add language instruction for non-English voice chat
      const languageInstruction = {
        role: 'system' as const,
        content: `*Note: User is speaking via voice chat in ${language.toUpperCase()} - provide natural, conversational responses in the same language.*`
      };
      enhancedMessages = [languageInstruction, ...enhancedMessages];
      console.log('✅ Voice chat language instruction added');
    }

    // Web search enhancement
    let webSearchResults: any[] = [];
    if ((enableWebSearch || forceWebSearch) && !useQuickMode) {
      try {
        console.log('🔍 Web search requested');
        const webSearch = new FirecrawlWebSearch();
        
        if (webSearch.isAvailable()) {
          const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
          if (lastUserMessage) {
            const shouldSearch = forceWebSearch || webSearch.shouldSearchWeb(lastUserMessage.content, '');
            
            if (shouldSearch) {
              console.log('🌐 Performing web search for:', lastUserMessage.content.substring(0, 100));
              
              const searchResults = await webSearch.searchWeb(lastUserMessage.content, {
                maxResults: 3,
                language: language || 'en'
              });
              
              if (searchResults.length > 0) {
                webSearchResults = searchResults;
                
                const webContext = searchResults
                  .map(result => `Web source: ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}`)
                  .join('\n\n');

                const webContextMessage = {
                  role: 'system' as const,
                  content: `# Current Web Information:\n\n${webContext}\n\n*Note: Use this current web information to enhance your response with up-to-date facts and sources.*`
                };
                
                enhancedMessages = [webContextMessage, ...enhancedMessages];
                console.log('✅ Web search context added with', searchResults.length, 'results');
              } else {
                console.log('📭 No web search results found');
              }
            } else {
              console.log('🚫 Web search not needed for this query');
            }
          }
        } else {
          console.warn('⚠️ Web search not available (missing Firecrawl API key)');
        }
      } catch (error) {
        console.warn('⚠️ Web search failed:', error);
      }
    }

    // Create enhanced request with proper context
    const enhancedRequest: EnhancedGenerateRequest = {
      ...generateRequest,
      messages: enhancedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      context: {
        userId,
        sessionId: `session-${Date.now()}`,
        conversationId: `conv-${Date.now()}`,
        preferences: {
          preferredProviders: [],
          maxCostPerRequest: 1000,
          qualityOverSpeed: true
        }
      }
    };
    
    // Debug: Log the messages being sent to ensure system prompt is included
    console.log('🔍 Messages sent to AI:', JSON.stringify(enhancedRequest.messages, null, 2));

    console.log('Routing request to model with RAG context:', model);
    
    // Track request start time for analytics
    requestStartTime = performance.now();
    
    if (stream) {
      // Handle streaming response
      console.log('🌊 Streaming response requested');
      
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Check credit availability before processing
            const creditCheck = await creditCostCalculator.canAfford(
              model,
              enhancedRequest.messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4, // Rough token estimate
              enhancedRequest.maxTokens || 1000,
              'text',
              userId
            );
            
            if (!creditCheck.canAfford) {
              console.log('❌ Insufficient credits for request:', creditCheck);
              controller.error(new Error(`Insufficient credits: ${creditCheck.currentCredits} available, ${creditCheck.requiredCredits} required`));
              return;
            }
            
            // Use enhanced model router to generate the response
            const aiResponse = await enhancedModelRouter.generateText(enhancedRequest);
            
            // Stream the response with optimized chunk size for performance
            const content = cleanAIResponse(aiResponse.content);
            const chunkSize = content.length > 2000 ? 10 : 5; // Larger chunks for long content
            
            console.log('🔍 Starting stream - Total content length:', content.length);
            console.log('🔍 Content preview:', content.substring(0, 100) + '...');
            console.log('🔍 Content ending:', '...' + content.substring(content.length - 100));
            
            // Try to stream the content
            let streamingSuccessful = true;
            let chunksStreamed = 0;
            
            for (let i = 0; i < content.length; i += chunkSize) {
              chunksStreamed++;
              const chunk = content.slice(i, i + chunkSize);
              
              try {
                // Send chunk (remove aggressive controller check)
                controller.enqueue(encoder.encode(chunk));
                
                // Reduced delay for long content, faster streaming
                if (i + chunkSize < content.length) {
                  const delay = content.length > 2000 ? 5 : 10; // Faster for long content
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              } catch (error) {
                // Only break on actual controller errors, not client disconnects
                if (error instanceof Error && error.message.includes('Controller is already closed')) {
                  console.log('🔌 Client disconnected, ending stream gracefully');
                  break;
                } else {
                  console.log('🛑 Streaming error:', error instanceof Error ? error.message : 'Unknown error');
                  streamingSuccessful = false;
                  break;
                }
              }
            }
            
            console.log('🔍 Stream finished - Chunks streamed:', chunksStreamed);
            console.log('🔍 Stream successful:', streamingSuccessful);
            console.log('🔍 Expected chunks:', Math.ceil(content.length / chunkSize));
            
            // If streaming failed, log the full response for debugging
            if (!streamingSuccessful) {
              console.log('⚠️ Streaming was interrupted. Full response was:');
              console.log('📝 Response content:', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
            }
            
            // Process credit deduction for successful response
            const creditResult = await creditCostCalculator.processUsage(
              model,
              aiResponse.usage,
              'text',
              userId
            );
            
            if (!creditResult.success) {
              console.warn('⚠️ Credit deduction failed:', creditResult.error);
              // Continue anyway as response was generated
            } else {
              console.log('✅ Credits deducted:', creditResult.creditsDeducted, 'remaining:', creditResult.remainingCredits);
            }
            
            // Store conversation in clean memory system (non-blocking)
            if (!useQuickMode) {
              const chatId = cleanContextManager.extractChatId(contextId);
              const conversationMessages = [
                ...processedMessages.map(msg => ({
                  id: msg.id || `msg_${Date.now()}`,
                  role: msg.role,
                  content: msg.content,
                  timestamp: new Date()
                })),
                {
                  id: `response_${Date.now()}`,
                  role: 'assistant' as const,
                  content: cleanAIResponse(aiResponse.content),
                  timestamp: new Date()
                }
              ];
              
              cleanContextManager.storeConversation(userId, chatId, contextId, conversationMessages)
                .catch(error => console.warn('Background conversation storage failed:', error));
            }

            // Track streaming analytics (non-blocking)
            if (userId && model && modelInfo && requestStartTime !== undefined) {
              analyticsTracker.trackTextGeneration({
                userId,
                modelId: model,
                provider: modelInfo.provider,
                prompt: processedMessages[processedMessages.length - 1]?.content || '',
                response: cleanAIResponse(aiResponse.content),
                startTime: requestStartTime,
                success: true,
                tokensUsed: aiResponse.usage.totalTokens,
                cost: aiResponse.usage.estimatedCost,
                mode,
                metadata: {
                  stream: true,
                  webSearchUsed: webSearchResults.length > 0,
                  ragEnabled: !useQuickMode && enhancedMessages.length > processedMessages.length,
                  attachedImages: attachedImages.length
                }
              }).catch(error => console.warn('Analytics tracking failed:', error));
            }
            
            // Always close the controller after streaming is complete
            try {
              controller.close();
              console.log('✅ Stream completed successfully');
            } catch (error) {
              console.log('🛑 Controller already closed:', error instanceof Error ? error.message : 'Unknown error');
            }
          } catch (error) {
            console.error('Streaming error:', error);
            
            // Track streaming error analytics (non-blocking)
            if (userId && model && modelInfo && requestStartTime !== undefined) {
              analyticsTracker.trackTextGeneration({
                userId,
                modelId: model,
                provider: modelInfo.provider,
                prompt: processedMessages[processedMessages.length - 1]?.content || '',
                response: '',
                startTime: requestStartTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown streaming error',
                tokensUsed: 0,
                cost: 0,
                mode,
                metadata: {
                  stream: true,
                  webSearchUsed: webSearchResults.length > 0,
                  ragEnabled: !useQuickMode && enhancedMessages.length > processedMessages.length,
                  attachedImages: attachedImages.length
                }
              }).catch(analyticsError => console.warn('Analytics tracking failed:', analyticsError));
            }
            
            controller.error(error);
          }
        }
      });

      const responseHeaders: Record<string, string> = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      };

      // Add rate limit headers if available
      if (planCheck.headers) {
        Object.entries(planCheck.headers).forEach(([key, value]) => {
          responseHeaders[key] = value;
        });
      }

      return new Response(readable, {
        headers: responseHeaders,
      });
    } else {
      // Handle regular JSON response
      
      // Check credit availability before processing
      const creditCheck = await creditCostCalculator.canAfford(
        model,
        enhancedRequest.messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4, // Rough token estimate
        enhancedRequest.maxTokens || 1000,
        'text',
        userId
      );
      
      if (!creditCheck.canAfford) {
        console.log('❌ Insufficient credits for request:', creditCheck);
        return createErrorResponse(
          `Insufficient credits: ${creditCheck.currentCredits} available, ${creditCheck.requiredCredits} required`,
          402
        );
      }
      
      const aiResponse = await enhancedModelRouter.generateText(enhancedRequest);
      
      // Process credit deduction for successful response
      const creditResult = await creditCostCalculator.processUsage(
        model,
        aiResponse.usage,
        'text',
        userId
      );
      
      if (!creditResult.success) {
        console.warn('⚠️ Credit deduction failed:', creditResult.error);
        // Continue anyway as response was generated
      } else {
        console.log('✅ Credits deducted:', creditResult.creditsDeducted, 'remaining:', creditResult.remainingCredits);
      }

      // Store conversation in clean memory system (non-blocking)
      if (!useQuickMode) {
        const chatId = cleanContextManager.extractChatId(contextId);
        const conversationMessages = [
          ...processedMessages.map(msg => ({
            id: msg.id || `msg_${Date.now()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
          })),
          {
            id: `response_${Date.now()}`,
            role: 'assistant' as const,
            content: cleanAIResponse(aiResponse.content),
            timestamp: new Date()
          }
        ];
        
        cleanContextManager.storeConversation(userId, chatId, contextId, conversationMessages)
          .catch(error => console.warn('Background conversation storage failed:', error));
      }

      // Track non-streaming analytics (non-blocking)
      if (userId && model && modelInfo && requestStartTime !== undefined) {
        analyticsTracker.trackTextGeneration({
          userId,
          modelId: model,
          provider: modelInfo.provider,
          prompt: processedMessages[processedMessages.length - 1]?.content || '',
          response: aiResponse.content,
          startTime: requestStartTime,
          success: true,
          tokensUsed: aiResponse.usage.totalTokens,
          cost: aiResponse.usage.estimatedCost,
          mode,
          metadata: {
            stream: false,
            webSearchUsed: webSearchResults.length > 0,
            ragEnabled: !useQuickMode && !!context,
            attachedImages: attachedImages.length
          }
        }).catch(error => console.warn('Analytics tracking failed:', error));
      }

      console.log('Model router response successful');

      // Create response compatible with existing frontend
      const cleanedContent = cleanAIResponse(aiResponse.content);
      const response = {
        id: aiResponse.id,
        role: 'assistant' as const,
        message: cleanedContent, // Frontend expects 'message' field
        content: cleanedContent,
        timestamp: new Date().toISOString(),
        model: aiResponse.model,
        tokens: aiResponse.usage.totalTokens,
        cost: aiResponse.usage.estimatedCost,
        sessionId: generateRequest.sessionId,
        conversationId: contextId,
        memoryEnhanced: !useQuickMode && enhancedMessages.length > processedMessages.length,
        webSearchResults: webSearchResults.length > 0 ? webSearchResults : undefined,
        webSearchEnabled: enableWebSearch || forceWebSearch,
        credits: {
          used: creditResult.success ? creditResult.creditsDeducted : 0,
          remaining: creditResult.success ? creditResult.remainingCredits : creditCheck.currentCredits,
          required: creditCheck.requiredCredits
        },
        metadata: {
          ...aiResponse.metadata,
          ragEnabled: !useQuickMode && enhancedMessages.length > processedMessages.length,
          webSearchUsed: webSearchResults.length > 0,
          contextId: contextId,
          crossChatContext: !useQuickMode, // Indicates cross-chat context was used
          quickMode: useQuickMode
        }
      };

      const secureResponse = createSecureResponse(response);
      
      // Add rate limit headers if available
      if (planCheck.headers) {
        Object.entries(planCheck.headers).forEach(([key, value]) => {
          secureResponse.headers.set(key, value);
        });
      }
      
      return secureResponse;
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Track error analytics if we have the required data (non-blocking)
    if (userId && model && modelInfo && requestStartTime !== undefined) {
      analyticsTracker.trackTextGeneration({
        userId,
        modelId: model,
        provider: modelInfo.provider,
        prompt: body?.messages?.[body.messages.length - 1]?.content || '',
        response: '',
        startTime: requestStartTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
        tokensUsed: 0,
        cost: 0,
        mode: body?.mode,
        metadata: {
          stream: body?.stream || false,
          webSearchUsed: false,
          ragEnabled: false,
          attachedImages: body?.files?.filter(f => f.type === 'image').length || 0
        }
      }).catch(analyticsError => console.warn('Analytics tracking failed:', analyticsError));
    }
    
    // Detailed error logging for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Handle specific provider errors
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    // Check if it's a ProviderError with specific status code
    if (error && typeof error === 'object' && 'statusCode' in error && 'name' in error && error.name === 'ProviderError') {
      const providerError = error as {statusCode?: number; message?: string};
      statusCode = providerError.statusCode || 500;
      
      // Use specific error messages based on status code
      switch (statusCode) {
        case 429:
          errorMessage = 'Model quota exceeded. Please try a different model or wait before retrying.';
          break;
        case 401:
          errorMessage = 'Authentication failed. Please check your credentials.';
          break;
        case 403:
          errorMessage = 'Access denied. You may not have permission to use this model.';
          break;
        case 404:
          errorMessage = 'Selected model is not available.';
          break;
        case 503:
          errorMessage = 'AI service temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = providerError.message || 'AI service error occurred.';
      }
    } else if (error instanceof Error) {
      // Fallback to message-based detection
      if (error.message.includes('Quota exceeded') || error.message.includes('429')) {
        errorMessage = 'Model quota exceeded. Please try a different model or wait before retrying.';
        statusCode = 429;
      } else if (error.message.includes('Rate limit')) {
        errorMessage = 'AI service rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('not found')) {
        errorMessage = 'Selected model is not available.';
        statusCode = 404;
      } else if (error.message.includes('Unauthorized') || error.message.includes('API key')) {
        errorMessage = 'AI service configuration error.';
        statusCode = 503;
      } else if (error.message.includes('Authentication failed')) {
        errorMessage = 'Authentication failed. Please check your credentials.';
        statusCode = 401;
      } else if (error.message.includes('Access denied')) {
        errorMessage = 'Access denied. You may not have permission to use this model.';
        statusCode = 403;
      }
    }

    return createErrorResponse(
      errorMessage,
      statusCode,
      process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    );
  }
}

export async function GET() {
  // Health check endpoint
  return createSecureResponse({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['multi-model', 'compute-modes', 'cost-optimization']
  });
} 