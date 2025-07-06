import { 
  ModelProvider, 
  ModelInfo, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderError,
  ModelCapability
} from './base';

export class LumaVideoProvider implements ModelProvider {
  name = 'luma-video';
  private apiKey: string;

  models: ModelInfo[] = [
    {
      id: 'luma-dream-machine-v1.5',
      name: 'Luma Dream Machine v1.5',
      provider: 'luma-video',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      category: 'video-generation',
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'text-to-video', supported: true },
        { type: 'image-to-video', supported: true },
        { type: 'high-quality', supported: true },
        { type: 'realistic-motion', supported: true }
      ]
    },
    {
      id: 'luma-ray-v1.0',
      name: 'Luma Ray v1.0',
      provider: 'luma-video',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      category: 'video-generation',
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'text-to-video', supported: true },
        { type: 'fast-generation', supported: true },
        { type: 'cost-effective', supported: true }
      ]
    }
  ];

  constructor() {
    const apiKey = process.env.LUMA_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Luma API key not found');
      this.apiKey = '';
    } else {
      this.apiKey = apiKey;
      console.log('🎭 Luma Video provider initialized');
    }
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    throw new ProviderError('Luma provider only supports video generation', 'luma-video', 'UNSUPPORTED_OPERATION');
  }

  async generateImage(options: any): Promise<any> {
    throw new ProviderError('Luma provider only supports video generation', 'luma-video', 'UNSUPPORTED_OPERATION');
  }

  async generateVideo(options: {
    prompt: string;
    model: string;
    duration?: number;
    quality?: string;
    imageUrl?: string;
    aspectRatio?: string;
    loop?: boolean;
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    duration: number;
    createdAt: string;
    metadata?: {
      aspectRatio?: string;
      resolution?: string;
      provider: string;
    };
  }> {
    if (!this.apiKey) {
      throw new ProviderError('Luma API key not configured', 'luma-video', 'MISSING_API_KEY', 401);
    }

    console.log(`🎭 Generating video with ${options.model}:`, {
      prompt: options.prompt.substring(0, 50) + '...',
      duration: options.duration,
      quality: options.quality
    });

    const startTime = Date.now();

    try {
      // Create generation request
      const requestBody = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio || '16:9',
        duration: Math.min(options.duration || 5, 10), // Luma max is usually 10s
        loop: options.loop || false,
        ...(options.imageUrl && { keyframes: { frame0: { type: 'image', url: options.imageUrl } } })
      };

      const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Luma API error: ${errorText}`,
          'luma-video',
          'API_ERROR',
          response.status
        );
      }

      const generation = await response.json();
      console.log('📡 Luma generation created:', generation.id);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 100; // ~8 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generation.id}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          }
        });

        if (!statusResponse.ok) {
          throw new ProviderError('Failed to check generation status', 'luma-video', 'API_ERROR', statusResponse.status);
        }

        const status = await statusResponse.json();
        
        if (status.state === 'completed') {
          const videoUrl = status.assets?.video || status.video_url;
          
          if (!videoUrl) {
            throw new ProviderError('No video URL in response', 'luma-video', 'INVALID_RESPONSE');
          }

          const processingTime = Date.now() - startTime;
          console.log(`✅ Luma video generated successfully in ${processingTime}ms`);

          return {
            id: generation.id,
            url: videoUrl,
            prompt: options.prompt,
            model: options.model,
            duration: options.duration || 5,
            createdAt: new Date().toISOString(),
            metadata: {
              aspectRatio: options.aspectRatio || '16:9',
              resolution: '1280x720',
              provider: 'luma-video'
            }
          };
        } else if (status.state === 'failed') {
          throw new ProviderError(
            `Video generation failed: ${status.failure_reason || 'Unknown error'}`,
            'luma-video',
            'GENERATION_FAILED'
          );
        }

        attempts++;
        console.log(`⏳ Waiting for Luma video generation... (${attempts}/${maxAttempts})`);
      }

      throw new ProviderError('Video generation timed out', 'luma-video', 'TIMEOUT');

    } catch (error) {
      console.error('❌ Luma video generation failed:', error);
      
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw new ProviderError(
        `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'luma-video',
        'GENERATION_ERROR',
        500
      );
    }
  }

  getModels(): ModelInfo[] {
    return this.models;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations?limit=1', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}