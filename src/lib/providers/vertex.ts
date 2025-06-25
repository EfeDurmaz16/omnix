import { VertexAI } from '@google-cloud/vertexai';
import { 
  ModelProvider, 
  ModelInfo, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderError,
  RateLimitError,
  COMPUTE_MODES,
  ModelCapability
} from './base';

export class VertexAIProvider implements ModelProvider {
  name = 'vertex';
  private vertexAI: VertexAI | null;
  
  models: ModelInfo[] = [
    {
      id: 'gemini-2.0-flash-001',
      name: 'Gemini 2.0 Flash',
      provider: 'vertex',
      type: 'multimodal',
      contextWindow: 1048576, // 1M tokens
      inputCostPer1kTokens: 0.000075,
      outputCostPer1kTokens: 0.0003,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'file-upload', supported: true }
      ]
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'vertex',
      type: 'multimodal',
      contextWindow: 1048576, // 1M tokens
      inputCostPer1kTokens: 0.000075,
      outputCostPer1kTokens: 0.0003,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'file-upload', supported: true }
      ]
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'vertex',
      type: 'multimodal',
      contextWindow: 2097152, // 2M tokens
      inputCostPer1kTokens: 0.00125,
      outputCostPer1kTokens: 0.005,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'file-upload', supported: true }
      ]
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'vertex',
      type: 'multimodal',
      contextWindow: 2097152, // 2M tokens
      inputCostPer1kTokens: 0.00125,
      outputCostPer1kTokens: 0.005,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'file-upload', supported: true }
      ]
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'vertex',
      type: 'multimodal',
      contextWindow: 1048576, // 1M tokens
      inputCostPer1kTokens: 0.000075,
      outputCostPer1kTokens: 0.0003,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'file-upload', supported: true }
      ]
    },
    {
      id: 'llama-4-scout-17b-16e-instruct-maas',
      name: 'Llama 4 Scout 17B',
      provider: 'vertex',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0002,
      outputCostPer1kTokens: 0.0002,
      maxTokens: 4096,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true }
      ]
    },
    {
      id: 'llama-4-maverick-17b-128e-instruct-maas',
      name: 'Llama 4 Maverick 17B',
      provider: 'vertex',
      type: 'text',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.0002,
      outputCostPer1kTokens: 0.0002,
      maxTokens: 4096,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true }
      ]
    },
    {
      id: 'mistral-small-2503@001',
      name: 'Mistral Small 2503',
      provider: 'vertex',
      type: 'text',
      contextWindow: 32768,
      inputCostPer1kTokens: 0.0002,
      outputCostPer1kTokens: 0.0006,
      maxTokens: 8192,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'code-generation', supported: true },
        { type: 'function-calling', supported: true }
      ]
    },
    {
      id: 'imagen-4.0-fast-generate',
      name: 'Imagen 4 Fast',
      provider: 'vertex',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.04, 
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'imagen-4.0-generate-preview-06-06',
      name: 'Imagen 4 Standard',
      provider: 'vertex',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.04,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'imagen-4.0-ultra-generate-preview-06-06',
      name: 'Imagen 4 Ultra',
      provider: 'vertex',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.08,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'imagen-4.0-fast-generate-preview-06-06',
      name: 'Imagen 4 Fast',
      provider: 'vertex',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.02,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'imagen-3.0-generate-002',
      name: 'Imagen 3.0',
      provider: 'vertex',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true }
      ]
    },
    {
      id: 'veo-3.0-generate-preview',
      name: 'Veo 3.0 Preview',
      provider: 'vertex',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0.20,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'video-generation', supported: true }
      ]
    },
    {
      id: 'veo-2.0-generate-001',
      name: 'Veo 2.0',
      provider: 'vertex',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0.15,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      capabilities: [
        { type: 'video-generation', supported: true }
      ]
    }
  ];

  constructor() {
    console.log('🔧 Initializing Vertex AI provider...');
    
    // Check required environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    // Use us-central1 for Imagen/Veo, us-east5 for Claude models
    const defaultLocation = 'us-central1'; // For Imagen and Veo models
    const claudeLocation = 'us-east5'; // For Claude models
    
    if (!projectId) {
      console.warn('⚠️ GOOGLE_CLOUD_PROJECT not set - Vertex AI provider will be limited');
      // Don't throw error, just set vertexAI to null for graceful degradation
      this.vertexAI = null as any;
      return;
    }

    try {
      console.log(`🚀 Attempting to initialize Vertex AI with project: ${projectId}`);
      console.log(`📍 Default location: ${defaultLocation}, Claude location: ${claudeLocation}`);
      
      this.vertexAI = new VertexAI({
        project: projectId,
        location: defaultLocation, // Default location for most models
      });
      
      console.log('✅ Vertex AI provider initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Vertex AI provider:', error);
      // Don't throw, just log the error and set to null for graceful degradation
      this.vertexAI = null as any;
    }
  }

  // Separate method for Llama models using OpenAI-compatible API on Vertex AI
  private async generateLlamaText(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT not set');
      }

      console.log('🦙 Generating text with Llama on Vertex AI:', { model: request.model, messages: request.messages.length });
      
      // Llama models always use us-east5
      const location = 'us-east5';
      console.log('📍 Llama API using location:', location, 'for model:', request.model);
      
      // Get access token for Google Cloud
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken.token) {
        throw new Error('Failed to get Google Cloud access token');
      }
      
      // Convert our messages to OpenAI format (which Llama API expects)
      const openaiMessages = request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Map our model IDs to the API format
      let apiModelName;
      if (request.model === 'llama-4-scout-17b-16e-instruct-maas') {
        apiModelName = 'meta/llama-4-scout-17b-16e-instruct-maas';
      } else if (request.model === 'llama-4-maverick-17b-128e-instruct-maas') {
        apiModelName = 'meta/llama-4-maverick-17b-128e-instruct-maas';
      } else {
        throw new Error(`Unknown Llama model: ${request.model}`);
      }
      
      // Prepare request body for Llama OpenAI-compatible API
      const requestBody = {
        model: apiModelName,
        messages: openaiMessages,
        max_tokens: request.maxTokens || 2048,
        temperature: request.temperature || 0.7,
        stream: false
      };
      
      // Construct endpoint URL (using the format from the documentation)
      const endpoint = `https://us-east5-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-east5/endpoints/openapi/chat/completions`;
      
      console.log('📡 Calling Llama API on Vertex:', { endpoint: 'openapi/chat/completions', model: apiModelName });
      
      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Llama API error:', response.status, errorText);
        throw new Error(`Llama API error (${response.status}): ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ Llama API response received');
      
      // Extract content from OpenAI-compatible response
      const content = responseData.choices?.[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('No content in Llama response');
      }
      
      const latency = Date.now() - startTime;
      
      // Extract token usage from response or estimate
      const usage = responseData.usage || {};
      const inputTokens = usage.prompt_tokens || this.estimateInputTokens(request.messages);
      const outputTokens = usage.completion_tokens || this.estimateTokens(content);
      const totalTokens = usage.total_tokens || (inputTokens + outputTokens);
      
      const modelInfo = this.models.find(m => m.id === request.model);
      const estimatedCost = this.calculateCost(inputTokens, outputTokens, modelInfo);

      return {
        id: `llama-vertex-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        content,
        role: 'assistant',
        model: request.model,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens,
          estimatedCost
        },
        finishReason: responseData.choices?.[0]?.finish_reason || 'stop',
        metadata: {
          provider: this.name,
          model: request.model,
          latency,
          timestamp: new Date().toISOString(),
          requestId: `llama-vertex-${Date.now()}`
        }
      };
      
    } catch (error) {
      console.error('❌ Llama text generation failed:', error);
      throw new ProviderError(
        `Llama generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'LLAMA_ERROR',
        500
      );
    }
  }



  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    let modelId = request.model;
    let location = 'us-central1'; // Default location
    
    try {
      if (!this.vertexAI) {
        throw new Error('Vertex AI not initialized. Please check PROJECT_ID and credentials.');
      }

      console.log('💬 Generating text with Vertex AI:', { model: request.model, messages: request.messages.length });
      
      // Claude models are now handled by the dedicated Claude provider
      if (request.model.includes('claude')) {
        throw new ProviderError(`Claude model ${request.model} should be handled by Claude provider`, this.name, 'WRONG_PROVIDER', 400);
      }
      
      // Check if this is a Llama model - use OpenAI-compatible API
      if (request.model.includes('llama')) {
        location = 'us-east5'; // Set correct location for error logging
        console.log('🔀 Routing Llama model to generateLlamaText:', request.model);
        return await this.generateLlamaText(request);
      }
      
      // For non-Claude/non-Llama models, use standard Vertex AI approach
      // Convert model IDs to proper Vertex AI format
      if (request.model === 'mistral-small-2503@001') {
        modelId = 'publishers/mistralai/models/mistral-small-2503@001';
        location = 'us-east5';
      }
      
      if (modelId.includes('mistral')) {
        console.log(`📍 Using us-east5 region for ${request.model} -> ${modelId}`);
      }
      
      // Create a new VertexAI client with the correct location for this model
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT!,
        location: location,
      });

      const model = vertexAI.getGenerativeModel({ 
        model: modelId,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 2048,
          temperature: request.temperature || 0.7,
          topP: request.topP || 0.95
        }
      });

      const messages = request.messages;
      if (messages.length === 0) {
        throw new Error('No messages provided');
      }

      // Convert messages to Vertex AI format
      const chat = model.startChat({
        history: this.convertMessagesToVertexHistory(messages.slice(0, -1)),
      });

      // Get the last message (current user input)
      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content as string);
      
      if (!result || !result.response) {
        throw new Error('No response from Vertex AI model');
      }
      
      const response = await result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        throw new Error('Empty response from Vertex AI model');
      }

      const latency = Date.now() - startTime;
      
      // Estimate token usage (Vertex AI doesn't always provide exact counts)
      const estimatedInputTokens = this.estimateInputTokens(messages);
      const estimatedOutputTokens = this.estimateTokens(text);
      const totalTokens = estimatedInputTokens + estimatedOutputTokens;
      
      const modelInfo = this.models.find(m => m.id === request.model);
      const estimatedCost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens, modelInfo);

      return {
        id: `vertex-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        content: text,
        role: 'assistant',
        model: request.model,
        usage: {
          promptTokens: estimatedInputTokens,
          completionTokens: estimatedOutputTokens,
          totalTokens: totalTokens,
          estimatedCost
        },
        finishReason: 'stop',
        metadata: {
          provider: this.name,
          model: request.model,
          latency,
          timestamp: new Date().toISOString(),
          requestId: `vertex-${Date.now()}`
        }
      };
    } catch (error) {
      console.error('❌ Vertex AI text generation failed:', error);
      console.error('📋 Failed request details:', { 
        model: request.model, 
        modelId, 
        location,
        messagesCount: request.messages.length 
      });
      
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 500)
        });
        
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw new ProviderError(`Model ${request.model} (${modelId}) not found in Vertex AI region ${location}`, this.name, 'MODEL_NOT_FOUND', 404);
        }
        
        if (error.message.includes('403') || error.message.includes('permission')) {
          throw new ProviderError(`Access denied for model ${request.model} in region ${location}. Check API permissions.`, this.name, 'PERMISSION_DENIED', 403);
        }
        
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new ProviderError('Vertex AI authentication failed. Check credentials.', this.name, 'AUTH_ERROR', 401);
        }
      }
      
      throw new ProviderError(
        `Vertex AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'GENERATION_ERROR',
        500
      );
    }
  }

  async *generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    const startTime = Date.now();
    
    try {
      // Claude models are now handled by the dedicated Claude provider
      if (request.model.includes('claude')) {
        throw new ProviderError(`Claude model ${request.model} should be handled by Claude provider`, this.name, 'WRONG_PROVIDER', 400);
      }
      
      // Check if this is a Llama model - Llama models use OpenAI-compatible API
      if (request.model.includes('llama')) {
        // For Llama models, we'll do a single request and yield the result
        const response = await this.generateLlamaText(request);
        yield response;
        return;
      }
      
      // Apply compute mode if specified
      const computeModeConfig = request.mode ? COMPUTE_MODES[request.mode] : null;
      let messages = [...request.messages];
      
      if (computeModeConfig) {
        if (messages[0]?.role !== 'system') {
          messages.unshift({
            role: 'system',
            content: computeModeConfig.systemPrompt
          });
        } else {
          messages[0].content = `${computeModeConfig.systemPrompt}\n\n${messages[0].content}`;
        }
      }

      // Determine the correct location and model ID based on model type (same as generateText)
      let modelId = request.model;
      let location = 'us-central1'; // Default location
      
      // Convert model IDs to proper Vertex AI format and set correct locations
      if (request.model === 'mistral-small-2503@001') {
        modelId = 'publishers/mistralai/models/mistral-small-2503@001';
        location = 'us-east5';
      }
      
      if (modelId.includes('mistral')) {
        console.log(`📍 Stream: Using us-east5 region for ${request.model} -> ${modelId}`);
      }
      
      // Create VertexAI client with correct location for streaming
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT!,
        location: location,
      });
      
      const model = vertexAI?.getGenerativeModel({ 
        model: modelId,
        generationConfig: {
          temperature: computeModeConfig?.temperature ?? request.temperature ?? 0.7,
          maxOutputTokens: computeModeConfig?.maxTokens ?? request.maxTokens ?? 1000,
          topP: request.topP ?? 0.9,
        }
      });

      const chat = model?.startChat({
        history: this.convertMessagesToVertexHistory(messages.slice(0, -1)),
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat?.sendMessageStream(lastMessage.content as string);

      if (!result || !result.stream) {
        throw new Error('No stream response from Vertex AI model');
      }

      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        fullText += chunkText;
        
        const inputTokens = this.estimateInputTokens(messages);
        const outputTokens = this.estimateTokens(fullText);
        const totalTokens = inputTokens + outputTokens;
        
        const modelInfo = this.models.find(m => m.id === request.model);
        const estimatedCost = this.calculateCost(inputTokens, outputTokens, modelInfo);

        yield {
          id: `vertex-stream-${Date.now()}`,
          content: chunkText,
          role: 'assistant',
          model: request.model,
          usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens,
            estimatedCost
          },
          finishReason: 'stop',
          metadata: {
            provider: this.name,
            model: request.model,
            latency: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            requestId: `vertex-stream-${Date.now()}`,
          }
        };
      }
      
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        throw new RateLimitError(this.name);
      }
      
      throw new ProviderError(
        error?.message || 'Unknown Vertex AI error',
        this.name,
        error?.code,
        error?.status,
        false
      );
    }
  }

  async generateImage(options: {
    prompt: string;
    model: string;
    size?: string;
    quality?: string;
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    size: string;
    createdAt: string;
  }> {
    try {
      if (!this.vertexAI) {
        throw new Error('Vertex AI not initialized. Please check PROJECT_ID and credentials.');
      }

      console.log('🎨 Generating image with Vertex AI Imagen:', {
        model: options.model,
        prompt: options.prompt.substring(0, 100) + '...'
      });

      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const location = 'us-central1'; // Imagen models are available in us-central1
      
      // Prepare the REST API request for Imagen
      const imageCount = 1; // Generate 1 image
      const requestBody = {
        instances: [
          {
            prompt: options.prompt
          }
        ],
        parameters: {
          sampleCount: imageCount,
          language: "en",
          aspectRatio: "1:1", // Default aspect ratio
          safetyFilterLevel: "block_only_high",
          personGeneration: "allow_adult"
        }
      };

      console.log('📡 Sending Imagen REST API request...');
      
      // Use the REST API endpoint for Imagen
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${options.model}:predict`;
      
      try {
        // Get Google Cloud access token
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        if (!accessToken.token) {
          throw new Error('Failed to get Google Cloud access token');
        }
        
        console.log('🔑 Got Google Cloud access token');
        
        // Make the actual API call to Imagen
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('📊 Imagen API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('❌ Imagen API error:', errorData);
          throw new Error(`Imagen API error (${response.status}): ${errorData}`);
        }
        
        const responseData = await response.json();
        console.log('✅ Imagen API response received');
        
        // Extract image URL from response
        const prediction = responseData.predictions?.[0];
        const imageUrl = prediction?.bytesBase64Encoded ? 
          `data:image/png;base64,${prediction.bytesBase64Encoded}` :
          prediction?.gcsUri || prediction?.url;
        
        if (!imageUrl) {
          throw new Error('No image URL found in Imagen response');
        }
        
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log('✅ Imagen generation completed:', imageId);
        console.log('🖼️ Generated real image from Imagen API');
        
        return {
          id: imageId,
          url: imageUrl,
          prompt: options.prompt,
          model: options.model,
          size: options.size || '1024x1024',
          createdAt: new Date().toISOString(),
        };
        
      } catch (apiError) {
        console.warn('⚠️ Real Imagen API failed, using placeholder:', apiError instanceof Error ? apiError.message : 'Unknown error');
        
        // Fallback to placeholder if real API fails
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const imageUrl = `https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=Imagen+${options.model.replace('imagen-', '').replace('-generate', '')}+Generated+(API+Unavailable)`;
        
        console.log('✅ Imagen generation completed (fallback):', imageId);
        console.log('🔗 Using placeholder image URL due to API unavailability');
        
        return {
          id: imageId,
          url: imageUrl,
          prompt: options.prompt,
          model: options.model,
          size: options.size || '1024x1024',
          createdAt: new Date().toISOString(),
        };
             }

    } catch (error) {
      console.error('❌ Vertex AI Imagen generation failed:', error);
      throw new ProviderError(
        `Imagen generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'vertex',
        'IMAGEN_ERROR',
        500
      );
    }
  }

  async generateVideo(options: {
    prompt: string;
    model: string;
    duration?: number;
    quality?: string;
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    duration: number;
    createdAt: string;
  }> {
    try {
      if (!this.vertexAI) {
        throw new Error('Vertex AI not initialized. Please check PROJECT_ID and credentials.');
      }

      console.log('🎬 Generating video with Vertex AI Veo:', {
        model: options.model,
        prompt: options.prompt.substring(0, 100) + '...',
        duration: options.duration || 5
      });

      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const location = 'us-central1'; // Veo models are available in us-central1
      
      // Prepare the REST API request for Veo (using correct format from docs)
      const sampleCount = 1; // Generate 1 video (1-2 supported per docs)
      
      const requestBody = {
        instances: [
          {
            prompt: options.prompt
          }
        ],
        parameters: {
          sampleCount: sampleCount.toString(), // Must be string per docs
          // storageUri: "gs://your-bucket/output/", // Optional - if not provided, returns base64
        }
      };

      console.log('📡 Sending Veo long-running API request...');
      
      // Use the correct long-running API endpoint for Veo
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${options.model}:predictLongRunning`;
      
      try {
        // Get access token for Google Cloud
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        if (!accessToken.token) {
          throw new Error('Failed to get Google Cloud access token');
        }

        console.log('🎬 Making real Veo API call...');
        
        // Make the actual Veo API call
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Veo API error:', response.status, errorText);
          throw new Error(`Veo API error (${response.status}): ${errorText}`);
        }

        const responseData = await response.json();
        console.log('✅ Veo long-running operation started');
        
        // Veo returns an operation name for long-running operations
        const operationName = responseData.name;
        if (!operationName) {
          throw new Error('No operation name returned from Veo API');
        }
        
        console.log('⏳ Polling operation status...', operationName);
        
        // Poll the operation status until completion
        const pollEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${options.model}:fetchPredictOperation`;
        
        let operationComplete = false;
        let pollAttempts = 0;
        const maxAttempts = 30; // Poll for up to 5 minutes (10s * 30)
        let videoResult = null;
        
        while (!operationComplete && pollAttempts < maxAttempts) {
          pollAttempts++;
          
          // Wait before polling (except first attempt)
          if (pollAttempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          }
          
          console.log(`📡 Polling attempt ${pollAttempts}/${maxAttempts}...`);
          
          const pollResponse = await fetch(pollEndpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operationName: operationName
            })
          });
          
          if (!pollResponse.ok) {
            const errorText = await pollResponse.text();
            throw new Error(`Poll operation failed (${pollResponse.status}): ${errorText}`);
          }
          
          const pollData = await pollResponse.json();
          
          if (pollData.done) {
            operationComplete = true;
            console.log('✅ Operation completed!');
            console.log('📋 Full response structure:', JSON.stringify(pollData, null, 2));
            
            // Extract videos from response
            const videos = pollData.response?.videos;
            if (!videos || videos.length === 0) {
              throw new Error('No videos in completed operation response');
            }
            
            // Use the first video (we requested sampleCount: 1)
            videoResult = videos[0];
            console.log('📋 Video result structure:', JSON.stringify(videoResult, null, 2));
            break;
          } else {
            console.log(`⏳ Operation still running... (${pollAttempts}/${maxAttempts})`);
          }
        }
        
        if (!operationComplete) {
          throw new Error(`Video generation timed out after ${maxAttempts} polling attempts`);
        }
        
        if (!videoResult) {
          throw new Error('No video result after completion');
        }
        
        console.log('🔍 Analyzing video result structure...');
        console.log('Available fields:', Object.keys(videoResult));
        if (videoResult.bytesBase64Encoded) {
          console.log('📦 Base64 video data available (length:', videoResult.bytesBase64Encoded.length, 'chars)');
        }
        if (videoResult.mimeType) {
          console.log('📄 MIME type:', videoResult.mimeType);
        }
        
        // Extract video URL from result - try different possible field names
        let videoUrl = videoResult.gcsUri || 
                      videoResult.uri || 
                      videoResult.url || 
                      videoResult.videoUri || 
                      videoResult.downloadUri ||
                      videoResult.signedUri;
        
        // If no URL found, check for base64 encoded video
        if (!videoUrl && videoResult.bytesBase64Encoded) {
          console.log('📦 Video returned as base64 data, converting to data URL...');
          
          const mimeType = videoResult.mimeType || 'video/mp4';
          const base64Data = videoResult.bytesBase64Encoded;
          
          // Create a data URL from the base64 data
          videoUrl = `data:${mimeType};base64,${base64Data}`;
          
          console.log('✅ Converted base64 to data URL');
          console.log(`📊 Video size: ~${Math.round(base64Data.length * 0.75 / 1024 / 1024)}MB`);
        }
        
        if (!videoUrl) {
          console.error('❌ No video URL or base64 data found. Available fields:', Object.keys(videoResult));
          throw new Error(`No video URL in operation result. Available fields: ${Object.keys(videoResult).join(', ')}`);
        }
        
        console.log('🔗 Found video URL:', videoUrl.substring(0, 100) + (videoUrl.length > 100 ? '...' : ''));
        
        // Import video storage here to avoid circular dependencies
        const { VideoStorage } = await import('../video-storage');
        
        const duration = options.duration || 5; // Default duration
        
        // Calculate video size for base64 data
        let videoSize = 0;
        if (videoUrl.startsWith('data:')) {
          // For data URLs, estimate size from base64 length
          const base64Part = videoUrl.split(',')[1];
          if (base64Part) {
            videoSize = Math.round(base64Part.length * 0.75); // Base64 to bytes conversion
          }
        }
        
        // Store the actual generated video in our storage system
        const storedVideo = await VideoStorage.store({
          url: videoUrl,
          prompt: options.prompt,
          model: options.model,
          duration: duration,
          createdAt: new Date().toISOString(),
          userId: 'current-user', // In production, get this from authentication
          size: videoSize,
          format: videoResult.mimeType ? videoResult.mimeType.split('/')[1] || 'mp4' : 'mp4'
        });
        
        console.log('✅ Real Veo generation completed:', storedVideo.id);
        console.log('📁 Video stored in database');
        console.log('🔗 Real video URL:', storedVideo.url);

        return {
          id: storedVideo.id,
          url: storedVideo.url,
          prompt: storedVideo.prompt,
          model: storedVideo.model,
          duration: storedVideo.duration,
          createdAt: storedVideo.createdAt,
        };
        
      } catch (apiError) {
        // If the API call fails, check if it's an access/permission error
        console.warn('⚠️ Veo API call failed, checking error type:', apiError);
        
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        
        // Check for quota/rate limit errors (429)
        if (
          errorMessage.includes('429') ||
          errorMessage.includes('quota') ||
          errorMessage.includes('QUOTA_EXCEEDED') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('Quota exceeded')
        ) {
          // This is a quota issue - you have access but need more quota
          throw new Error(
            `⏱️ Veo quota limit reached! You have API access but need more quota. ` +
            `Visit Google Cloud Console → Vertex AI → Quotas to request an increase for Veo models. ` +
            `Your prompt: "${options.prompt.substring(0, 100)}..."`
          );
        }
         
        // Common Veo access errors
        if (
          errorMessage.includes('403') || 
          errorMessage.includes('permission') ||
          errorMessage.includes('access') ||
          errorMessage.includes('not authorized') ||
          errorMessage.includes('PERMISSION_DENIED')
        ) {
          // This is an access issue - provide helpful guidance
          throw new Error(
            `🚫 Veo video generation requires special API access from Google Cloud. ` +
            `Contact Google Cloud support to request access to Veo models. ` +
            `Your prompt: "${options.prompt.substring(0, 100)}..."`
          );
        }
        
        // For other errors, provide the actual error details
        throw new Error(`Veo API error: ${errorMessage}`);
      }

    } catch (error) {
      console.error('❌ Vertex AI Veo generation failed:', error);
      throw new ProviderError(
        `Veo generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'vertex',
        'VEO_ERROR',
        500
      );
    }
  }

  getModels(): ModelInfo[] {
    // Only return models if Vertex AI is properly initialized
    if (!this.vertexAI) {
      console.warn('🔄 Vertex AI not initialized, returning empty models array');
      return [];
    }
    return this.models;
  }

  async validateConfig(): Promise<boolean> {
    try {
      console.log('🔍 Testing Vertex AI connection...');
      
      // Test with basic available models
      const modelsToTest = ['gemini-2.0-flash-001', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      
      for (const modelName of modelsToTest) {
        try {
          console.log(`🧪 Testing model: ${modelName}`);
          const model = this.vertexAI?.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              maxOutputTokens: 10,
              temperature: 0.1
            }
          });
          
          const result = await model?.generateContent('Hi');
          const response = await result?.response;
          
          if (!result || !response) {
            console.log(`❌ Model ${modelName} returned no response`);
            continue;
          }
          
          const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (text) {
            console.log(`✅ Vertex AI test successful with ${modelName}:`, text?.substring(0, 50));
            return true;
          }
        } catch (modelError: any) {
          console.log(`❌ Model ${modelName} failed:`, modelError.message);
          continue;
        }
      }
      
      console.warn('❌ All Vertex AI models failed health check');
      return false;
    } catch (error) {
      console.warn('❌ Vertex AI health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  estimateCost(request: GenerateRequest): number {
    const modelInfo = this.models.find(m => m.id === request.model);
    if (!modelInfo) return 0;

    const inputTokens = this.estimateInputTokens(request.messages);
    const outputTokens = request.maxTokens || 1000;
    
    return this.calculateCost(inputTokens, outputTokens, modelInfo);
  }

  private convertMessagesToVertexHistory(messages: any[]): any[] {
    const history: any[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Skip system messages as they're handled differently in Vertex
      if (msg.role === 'system') continue;
      
      history.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    
    return history;
  }

  private calculateCost(inputTokens: number, outputTokens: number, modelInfo?: ModelInfo): number {
    if (!modelInfo) return 0;
    
    const inputCost = (inputTokens / 1000) * modelInfo.inputCostPer1kTokens;
    const outputCost = (outputTokens / 1000) * modelInfo.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private estimateInputTokens(messages: any[]): number {
    const totalText = messages.map(m => m.content).join(' ');
    return this.estimateTokens(totalText);
  }
}