import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { routeRequest, validateModelAccess } from '@/lib/model-router';
import { GenerateRequest } from '@/lib/providers/base';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  sessionId?: string;
  mode?: 'flash' | 'think' | 'ultra-think';
  files?: Array<{
    name: string;
    type: string;
    url: string;
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
    const { messages, model, sessionId, mode, files } = body;

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
    let processedMessages = [...messages];
    if (files && files.length > 0) {
      const fileContext = files.map(file => `[Attached file: ${file.name} (${file.type})]`).join('\n');
      const lastMessage = processedMessages[processedMessages.length - 1];
      lastMessage.content = `${fileContext}\n\n${lastMessage.content}`;
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
      maxTokens: mode === 'flash' ? 1000 : mode === 'ultra-think' ? 4000 : 2000
    };

    console.log('Routing request to model:', model);
    
    // Use our model router to generate the response
    const aiResponse = await routeRequest(generateRequest);

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
      metadata: aiResponse.metadata
    };

    return NextResponse.json(response);

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
      const providerError = error as any;
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