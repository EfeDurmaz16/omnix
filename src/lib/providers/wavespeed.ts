import { ModelProvider, GenerateRequest, GenerateResponse, ModelInfo, ProviderError } from './base';

export class WavespeedProvider implements ModelProvider {
  name = 'wavespeed';
  private apiKey: string;

  models: ModelInfo[] = [
    {
      id: 'seedance-v1-pro-i2v-720p',
      name: 'Seedance V1 Pro I2V 720p',
      provider: 'wavespeed',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0.10, // Estimated cost per video
      outputCostPer1kTokens: 0.10,
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'image-generation', supported: false }
      ],
      maxTokens: 0,
    }
  ];

  constructor() {
    this.apiKey = process.env.WAVESPEED_API_KEY || '';
    if (!this.apiKey) {
      console.warn('🔑 Wavespeed API key not found in environment variables');
    }
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    throw new ProviderError('Wavespeed provider only supports video generation', 'wavespeed', 'UNSUPPORTED_OPERATION');
  }

  async *generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    throw new ProviderError('Wavespeed provider only supports video generation', 'wavespeed', 'UNSUPPORTED_OPERATION');
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
    throw new ProviderError('Wavespeed provider only supports video generation', 'wavespeed', 'UNSUPPORTED_OPERATION');
  }

  async generateVideo(options: {
    prompt: string;
    model: string;
    duration?: number;
    quality?: string;
    imageUrl?: string; // For image-to-video
  }): Promise<{
    id: string;
    url: string;
    prompt: string;
    model: string;
    duration: number;
    createdAt: string;
  }> {
    if (!this.apiKey) {
      throw new ProviderError(
        'Wavespeed API key not configured. Add WAVESPEED_API_KEY to your environment variables.',
        'wavespeed',
        'MISSING_API_KEY'
      );
    }

    try {
      console.log('🎬 Starting Wavespeed video generation...');
      console.log('📝 Prompt:', options.prompt);
      console.log('🖼️ Image URL:', options.imageUrl || 'None (text-to-video)');

      const url = "https://api.wavespeed.ai/api/v3/bytedance/seedance-v1-pro-i2v-720p";
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      };

      // If no image URL provided, use a default placeholder or throw error
      if (!options.imageUrl) {
        throw new ProviderError(
          'Wavespeed Seedance model requires an image URL for image-to-video generation. Please provide an imageUrl parameter.',
          'wavespeed',
          'MISSING_IMAGE'
        );
      }

      const payload = {
        "duration": options.duration || 5,
        "image": options.imageUrl,
        "prompt": options.prompt,
        "seed": -1 // Random seed
      };

      console.log('📤 Sending request to Wavespeed API...');
      
      // Submit the task
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Wavespeed API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      const requestId = result.data?.id;
      
      if (!requestId) {
        throw new Error('No request ID returned from Wavespeed API');
      }

      console.log(`✅ Task submitted successfully. Request ID: ${requestId}`);
      console.log('⏳ Polling for completion...');

      // Poll for completion
      let pollAttempts = 0;
      const maxAttempts = 120; // 2 minutes max (0.5s intervals)
      
      while (pollAttempts < maxAttempts) {
        pollAttempts++;
        
        const pollResponse = await fetch(
          `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
          {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`
            }
          }
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          throw new Error(`Wavespeed polling error (${pollResponse.status}): ${errorText}`);
        }

        const pollResult = await pollResponse.json();
        const data = pollResult.data;
        const status = data?.status;

        console.log(`📡 Poll attempt ${pollAttempts}/${maxAttempts} - Status: ${status}`);

        if (status === "completed") {
          const resultUrl = data.outputs?.[0];
          if (!resultUrl) {
            throw new Error('No video URL in completed result');
          }

          console.log('✅ Wavespeed video generation completed!');
          console.log('🔗 Video URL:', resultUrl);

          // Import video storage here to avoid circular dependencies
          const { VideoStorage } = await import('../video-storage');
          
          // Store the generated video in our storage system
          const storedVideo = await VideoStorage.store({
            url: resultUrl,
            prompt: options.prompt,
            model: options.model,
            duration: options.duration || 5,
            createdAt: new Date().toISOString(),
            userId: 'current-user', // In production, get this from authentication
            size: 0, // API doesn't provide file size
            format: 'mp4' // Wavespeed typically generates MP4
          });

          console.log('📁 Video stored in database with ID:', storedVideo.id);

          return {
            id: storedVideo.id,
            url: storedVideo.url,
            prompt: storedVideo.prompt,
            model: storedVideo.model,
            duration: storedVideo.duration,
            createdAt: storedVideo.createdAt,
          };

        } else if (status === "failed") {
          const error = data.error || 'Unknown error';
          throw new Error(`Wavespeed task failed: ${error}`);
        } else {
          // Still processing
          console.log(`⏳ Task still processing... (${pollAttempts}/${maxAttempts})`);
        }

        // Wait 0.5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      throw new Error(`Video generation timed out after ${maxAttempts} polling attempts`);

    } catch (error) {
      console.error('❌ Wavespeed video generation failed:', error);
      throw new ProviderError(
        `Wavespeed generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'wavespeed',
        'GENERATION_ERROR',
        500
      );
    }
  }

  getModels(): ModelInfo[] {
    return this.models;
  }

  async validateConfig(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('❌ Wavespeed API key not configured');
      return false;
    }
    
    try {
      // Test API key by making a simple request (we can't easily test without submitting a real task)
      console.log('🧪 Testing Wavespeed API connection...');
      
      // For now, just validate that the API key exists
      // In a real scenario, you might want to make a test request
      console.log('✅ Wavespeed API key configured');
      return true;
    } catch (error) {
      console.warn('❌ Wavespeed API validation failed:', error);
      return false;
    }
  }

  estimateCost(request: GenerateRequest): number {
    // Flat rate for video generation
    return 0.10;
  }
} 