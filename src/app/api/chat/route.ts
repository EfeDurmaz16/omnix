import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { routeRequest, validateModelAccess } from '@/lib/model-router';
import { GenerateRequest } from '@/lib/providers/base';
import { contextManager } from '@/lib/context/AdvancedContextManager';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
  files?: Array<{
    name: string;
    type: string;
    url: string;
    content?: string;
    mimeType?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    console.log('Chat API called');
    
    // Authentication check
    const { userId } = await auth();
    console.log('User ID from auth:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { messages, model, sessionId, conversationId, mode, files, stream = false } = body;

    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    // Validate message content length
    const totalContent = messages.map(m => m.content).join(' ');
    if (totalContent.length > 10000) {
      return NextResponse.json(
        { error: 'Total message content too long. Maximum 10,000 characters.' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const userRateLimit = rateLimitStore.get(userId) || { count: 0, resetTime: now + 60000 };
    
    if (now > userRateLimit.resetTime) {
      userRateLimit.count = 0;
      userRateLimit.resetTime = now + 60000; // Reset every minute
    }

    if (userRateLimit.count >= 30) { // 30 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    userRateLimit.count++;
    rateLimitStore.set(userId, userRateLimit);

    // Validate model access
    console.log('Validating model access for:', model);
    const hasAccess = await validateModelAccess(userId, model);
    console.log('Model access result:', hasAccess);
    
    if (!hasAccess) {
      console.log('Access denied for model:', model);
      return NextResponse.json(
        { error: 'Invalid model or access denied' },
        { status: 403 }
      );
    }

    // Content filtering (basic)
    const forbiddenWords = ['hack', 'exploit', 'malware', 'virus'];
    if (forbiddenWords.some(word => totalContent.toLowerCase().includes(word))) {
      return NextResponse.json(
        { error: 'Message contains inappropriate content' },
        { status: 400 }
      );
    }

    // Process file attachments if any
    const processedMessages = [...messages];
    const attachedImages: Array<{name: string; type: string; url: string; content?: string; mimeType?: string}> = [];
    
    if (files && files.length > 0) {
      console.log('📎 Processing attached files:', files.length);
      
      const lastMessage = processedMessages[processedMessages.length - 1];
      let messageContent = lastMessage.content;
      
      // Process different file types
      files.forEach((file) => {
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
          const hasVisionCapability = model.includes('gpt-4') || model.includes('claude') || model.includes('gemini') || model.includes('vision');
          if (hasVisionCapability) {
            messageContent = `[Image: ${file.name} - Vision analysis enabled]\n${messageContent}`;
          } else {
            messageContent = `[Image attached: ${file.name} - Note: This model doesn't support image analysis]\n${messageContent}`;
          }
        } else if (file.type === 'text' && file.content) {
          // For text files, include the actual content
          console.log('📄 Adding text file content:', file.name);
          messageContent = `[Text File: ${file.name}]\n${file.content}\n\n${messageContent}`;
        } else if (file.type === 'pdf' && file.content) {
          // For PDFs, include the extracted text content
          console.log('📑 Adding PDF content:', file.name, file.content.length, 'characters');
          messageContent = `${file.content}\n\n${messageContent}`;
        } else if (file.type === 'document' && file.content) {
          // For Word documents
          console.log('📋 Adding document content:', file.name);
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
    
    let context;
    let enhancedMessages = processedMessages;
    
    if (useQuickMode) {
      // Fast path: minimal context processing
      console.log('⚡ Quick mode: skipping heavy RAG operations');
      const contextId = conversationId || `quick_${Date.now()}`;
      context = { id: contextId };
    } else {
      // Full RAG processing (with timeout)
      try {
        const contextPromise = contextManager.getOrCreateContext(
          userId,
          conversationId,
          model,
          false // full RAG mode
        );
        
        // Add timeout to prevent hanging
        context = await Promise.race([
          contextPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Context creation timeout')), 5000)
          )
        ]) as any;

        // Add user message to context (non-blocking)
        const userMessage = processedMessages[processedMessages.length - 1];
        if (userMessage.role === 'user') {
          // Don't await this - let it run in background
          contextManager.addMessage(context.id, {
            role: 'user',
            content: userMessage.content,
            model: model
          }).catch(error => console.warn('Background message add failed:', error));
        }

        // Get enhanced context with timeout
        const enhancedPromise = contextManager.getContextForModel(context.id);
        enhancedMessages = await Promise.race([
          enhancedPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Context enhancement timeout')), 3000)
          )
        ]) as any;
        
        console.log('✅ RAG context enhanced with', enhancedMessages.length, 'messages');
      } catch (error) {
        console.warn('⚠️ RAG enhancement failed, using basic context:', error);
        // Fallback to basic context
        const contextId = conversationId || `fallback_${Date.now()}`;
        context = { id: contextId };
        enhancedMessages = processedMessages;
      }
    }

    // Create enhanced request
    const enhancedRequest: GenerateRequest = {
      ...generateRequest,
      messages: enhancedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    console.log('Routing request to model with RAG context:', model);
    
    if (stream) {
      // Handle streaming response
      console.log('🌊 Streaming response requested');
      
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Use our model router to generate the response
            const aiResponse = await routeRequest(enhancedRequest);
            
            // Stream the response in larger chunks for better performance
            const chunkSize = 20; // words per chunk
            const words = aiResponse.content.split(' ');
            
            for (let i = 0; i < words.length; i += chunkSize) {
              const chunk = words.slice(i, i + chunkSize).join(' ');
              const separator = i + chunkSize < words.length ? ' ' : '';
              
              // Send chunk
              controller.enqueue(encoder.encode(chunk + separator));
              
              // Small delay only for visual streaming effect (much faster)
              if (i + chunkSize < words.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
            
            // Add assistant response to context after streaming (non-blocking)
            if (!useQuickMode && context) {
              contextManager.addMessage(context.id, {
                role: 'assistant',
                content: aiResponse.content,
                model: model
              }).catch(error => console.warn('Background context update failed:', error));
            }
            
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    } else {
      // Handle regular JSON response
      const aiResponse = await routeRequest(enhancedRequest);

      // Add assistant response to context (non-blocking)
      if (!useQuickMode && context) {
        contextManager.addMessage(context.id, {
          role: 'assistant',
          content: aiResponse.content,
          model: model
        }).catch(error => console.warn('Background context update failed:', error));
      }

      console.log('Model router response successful');

      // Create response compatible with existing frontend
      const response = {
        id: aiResponse.id,
        role: 'assistant' as const,
        message: aiResponse.content, // Frontend expects 'message' field
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        model: aiResponse.model,
        tokens: aiResponse.usage.totalTokens,
        cost: aiResponse.usage.estimatedCost,
        sessionId: generateRequest.sessionId,
        conversationId: context.id,
        memoryEnhanced: !useQuickMode,
        metadata: {
          ...aiResponse.metadata,
          ragEnabled: !useQuickMode,
          contextId: context.id
        }
      };

      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    
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

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: statusCode }
    );
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['multi-model', 'compute-modes', 'cost-optimization']
  });
} 