import { 
  ModelProvider, 
  ModelInfo, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderError,
  ModelCapability
} from './base';

export class ReplicateVideoProvider implements ModelProvider {
  name = 'replicate-video';
  private apiToken: string;

  models: ModelInfo[] = [
    {
      id: 'kling-video-v1.6',
      name: 'Kling Video v1.6',
      provider: 'replicate-video',
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
        { type: 'high-resolution', supported: true }
      ]
    },
    {
      id: 'pika-labs-v1.0',
      name: 'Pika Labs v1.0',
      provider: 'replicate-video',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      category: 'video-generation',
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'text-to-video', supported: true },
        { type: 'video-editing', supported: true },
        { type: 'cinematic-quality', supported: true }
      ]
    },
    {
      id: 'stable-video-diffusion-xt',
      name: 'Stable Video Diffusion XT',
      provider: 'replicate-video',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      category: 'video-generation',
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'image-to-video', supported: true },
        { type: 'high-frame-rate', supported: true },
        { type: 'extended-duration', supported: true }
      ]
    },
    {
      id: 'zeroscope-v2-xl',
      name: 'Zeroscope v2 XL',
      provider: 'replicate-video',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      maxTokens: 0,
      category: 'video-generation',
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'text-to-video', supported: true },
        { type: 'watermark-free', supported: true },
        { type: 'open-source', supported: true }
      ]
    },
    {
      id: 'runway-gen3-turbo',
      name: 'Runway Gen-3 Turbo',
      provider: 'replicate-video',
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
        { type: 'commercial-use', supported: true }
      ]
    },
    {
      id: 'haiper-video-v2',
      name: 'Haiper Video v2',
      provider: 'replicate-video',
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
        { type: 'motion-control', supported: true }
      ]
    }
  ];

  constructor() {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.warn('⚠️ Replicate API token not found');
      this.apiToken = '';
    } else {
      this.apiToken = apiToken;
      console.log('🔗 Replicate Video provider initialized');
    }
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    throw new ProviderError('Replicate Video provider only supports video generation', 'replicate-video', 'UNSUPPORTED_OPERATION');
  }

  async generateImage(options: any): Promise<any> {
    throw new ProviderError('Replicate Video provider only supports video generation', 'replicate-video', 'UNSUPPORTED_OPERATION');
  }

  async generateVideo(options: {
    prompt: string;
    model: string;
    duration?: number;
    quality?: string;
    imageUrl?: string;
    aspectRatio?: string;
    frameRate?: number;
    motionStrength?: number;
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    duration: number;
    createdAt: string;
    metadata?: {
      aspectRatio?: string;
      frameRate?: number;
      resolution?: string;
      provider: string;
    };
  }> {
    if (!this.apiToken) {
      throw new ProviderError('Replicate API token not configured', 'replicate-video', 'MISSING_API_KEY', 401);
    }

    console.log(`🎬 Generating video with ${options.model}:`, {
      prompt: options.prompt.substring(0, 50) + '...',
      duration: options.duration,
      quality: options.quality
    });

    const startTime = Date.now();

    try {
      // Model-specific configurations
      const modelConfigs = {
        'kling-video-v1.6': {
          replicateModel: 'kuaishou-ai/kling-video',
          version: 'latest',
          input: {
            prompt: options.prompt,
            duration: options.duration || 5,
            aspect_ratio: options.aspectRatio || '16:9',
            ...(options.imageUrl && { image: options.imageUrl })
          }
        },
        'pika-labs-v1.0': {
          replicateModel: 'pika-labs/pika',
          version: 'latest',
          input: {
            prompt: options.prompt,
            fps: options.frameRate || 24,
            motion: options.motionStrength || 3,
            guidance_scale: 12
          }
        },
        'stable-video-diffusion-xt': {
          replicateModel: 'stability-ai/stable-video-diffusion',
          version: 'latest',
          input: {
            input_image: options.imageUrl,
            motion_bucket_id: options.motionStrength || 127,
            num_frames: Math.min((options.duration || 4) * 8, 25),
            fps: options.frameRate || 8
          }
        },
        'zeroscope-v2-xl': {
          replicateModel: 'anotherjesse/zeroscope-v2-xl',
          version: 'latest',
          input: {
            prompt: options.prompt,
            num_frames: Math.min((options.duration || 3) * 8, 24),
            num_inference_steps: 50
          }
        },
        'runway-gen3-turbo': {
          replicateModel: 'runwayml/gen-3-alpha-turbo',
          version: 'latest',
          input: {
            prompt: options.prompt,
            duration: Math.min(options.duration || 4, 10),
            ...(options.imageUrl && { image: options.imageUrl })
          }
        },
        'haiper-video-v2': {
          replicateModel: 'haiper-ai/haiper-video-2',
          version: 'latest',
          input: {
            prompt: options.prompt,
            duration: options.duration || 4,
            aspect_ratio: options.aspectRatio || '16:9',
            ...(options.imageUrl && { image: options.imageUrl })
          }
        }
      };

      const config = modelConfigs[options.model as keyof typeof modelConfigs];
      if (!config) {
        throw new ProviderError(`Unsupported model: ${options.model}`, 'replicate-video', 'UNSUPPORTED_MODEL', 400);
      }

      // Create prediction
      const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.replicateModel,
          input: config.input
        })
      });

      if (!predictionResponse.ok) {
        const errorText = await predictionResponse.text();
        throw new ProviderError(
          `Replicate API error: ${errorText}`,
          'replicate-video',
          'API_ERROR',
          predictionResponse.status
        );
      }

      const prediction = await predictionResponse.json();
      console.log('📡 Replicate prediction created:', prediction.id);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          }
        });

        if (!statusResponse.ok) {
          throw new ProviderError('Failed to check prediction status', 'replicate-video', 'API_ERROR', statusResponse.status);
        }

        const status = await statusResponse.json();
        
        if (status.status === 'succeeded') {
          const videoUrl = Array.isArray(status.output) ? status.output[0] : status.output;
          
          if (!videoUrl) {
            throw new ProviderError('No video URL in response', 'replicate-video', 'INVALID_RESPONSE');
          }

          const processingTime = Date.now() - startTime;
          console.log(`✅ Video generated successfully in ${processingTime}ms`);

          return {
            id: prediction.id,
            url: videoUrl,
            prompt: options.prompt,
            model: options.model,
            duration: options.duration || 5,
            createdAt: new Date().toISOString(),
            metadata: {
              aspectRatio: options.aspectRatio || '16:9',
              frameRate: options.frameRate || 24,
              resolution: this.getResolutionForModel(options.model),
              provider: 'replicate-video'
            }
          };
        } else if (status.status === 'failed') {
          throw new ProviderError(
            `Video generation failed: ${status.error || 'Unknown error'}`,
            'replicate-video',
            'GENERATION_FAILED'
          );
        }

        attempts++;
        console.log(`⏳ Waiting for video generation... (${attempts}/${maxAttempts})`);
      }

      throw new ProviderError('Video generation timed out', 'replicate-video', 'TIMEOUT');

    } catch (error) {
      console.error('❌ Replicate video generation failed:', error);
      
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw new ProviderError(
        `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'replicate-video',
        'GENERATION_ERROR',
        500
      );
    }
  }

  private getResolutionForModel(model: string): string {
    const resolutions: Record<string, string> = {
      'kling-video-v1.6': '1280x720',
      'pika-labs-v1.0': '1024x576',
      'stable-video-diffusion-xt': '1024x576',
      'zeroscope-v2-xl': '1024x576',
      'runway-gen3-turbo': '1408x704',
      'haiper-video-v2': '1280x720'
    };
    
    return resolutions[model] || '1024x576';
  }

  getModels(): ModelInfo[] {
    return this.models;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiToken) {
      return false;
    }

    try {
      const response = await fetch('https://api.replicate.com/v1/account', {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}