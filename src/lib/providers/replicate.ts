import Replicate from 'replicate';
import { ModelProvider, ModelInfo, GenerateRequest, GenerateResponse, ProviderError } from './base';

export interface ReplicateGenerateRequest extends GenerateRequest {
  imageUrl?: string; // For image-to-text models
  videoUrl?: string; // For video processing
  audioUrl?: string; // For audio processing
  stylePrompt?: string; // For image generation style
  aspectRatio?: string; // For image generation
  outputFormat?: string; // For various outputs
}

export class ReplicateProvider implements ModelProvider {
  public readonly id = 'replicate';
  public readonly name = 'Replicate';
  private client: Replicate;

  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }

    this.client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  models: ModelInfo[] = [
    // Image Generation Models
    {
      id: 'black-forest-labs/flux-1.1-pro',
      name: 'FLUX.1.1 Pro',
      provider: 'replicate',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.04, // Per image
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true },
        { type: 'high-quality', supported: true }
      ],
      category: 'image-generation'
    },
    {
      id: 'ideogram-ai/ideogram-v2',
      name: 'Ideogram v2',
      provider: 'replicate',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.08, // Per image
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true },
        { type: 'text-in-images', supported: true }
      ],
      category: 'image-generation'
    },
    {
      id: 'recraft-ai/recraft-v3',
      name: 'Recraft V3',
      provider: 'replicate',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.05, // Per image
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'image-generation', supported: true },
        { type: 'style-control', supported: true }
      ],
      category: 'image-generation'
    },

    // Video Generation Models
    {
      id: 'minimax/video-01',
      name: 'MiniMax Video-01',
      provider: 'replicate',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0.1, // Per video
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'text-to-video', supported: true }
      ],
      category: 'video-generation'
    },
    {
      id: 'lightricks/ltx-video',
      name: 'LTX Video',
      provider: 'replicate',
      type: 'video',
      contextWindow: 0,
      inputCostPer1kTokens: 0.08, // Per video
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'video-generation', supported: true },
        { type: 'fast-generation', supported: true }
      ],
      category: 'video-generation'
    },

    // Audio Models
    {
      id: 'meta/musicgen',
      name: 'MusicGen',
      provider: 'replicate',
      type: 'audio',
      contextWindow: 0,
      inputCostPer1kTokens: 0.02, // Per generation
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'audio-generation', supported: true },
        { type: 'music-generation', supported: true }
      ],
      category: 'audio-generation'
    },

    // Specialized Vision Models
    {
      id: 'yorickvp/llava-13b',
      name: 'LLaVA 13B',
      provider: 'replicate',
      type: 'multimodal',
      contextWindow: 2048,
      inputCostPer1kTokens: 0.001,
      outputCostPer1kTokens: 0.001,
      capabilities: [
        { type: 'image-analysis', supported: true },
        { type: 'text-generation', supported: true },
        { type: 'visual-question-answering', supported: true }
      ],
      category: 'multimodal'
    },

    // Image Enhancement Models
    {
      id: 'tencentarc/gfpgan',
      name: 'GFPGAN Face Restoration',
      provider: 'replicate',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.005, // Per image
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'image-enhancement', supported: true },
        { type: 'face-restoration', supported: true }
      ],
      category: 'image-processing'
    },
    {
      id: 'nightmareai/real-esrgan',
      name: 'Real-ESRGAN Upscaler',
      provider: 'replicate',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.003, // Per image
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'image-upscaling', supported: true },
        { type: 'image-enhancement', supported: true }
      ],
      category: 'image-processing'
    },

    // Background Removal
    {
      id: 'cjwbw/rembg',
      name: 'Remove Background',
      provider: 'replicate',
      type: 'image',
      contextWindow: 0,
      inputCostPer1kTokens: 0.002, // Per image
      outputCostPer1kTokens: 0,
      capabilities: [
        { type: 'background-removal', supported: true },
        { type: 'image-processing', supported: true }
      ],
      category: 'image-processing'
    },

    // Code Models
    {
      id: 'meta/codellama-34b-instruct',
      name: 'CodeLlama 34B Instruct',
      provider: 'replicate',
      type: 'text',
      contextWindow: 16384,
      inputCostPer1kTokens: 0.0005,
      outputCostPer1kTokens: 0.0005,
      capabilities: [
        { type: 'code-generation', supported: true },
        { type: 'text-generation', supported: true }
      ],
      category: 'coding'
    }
  ];

  async generateText(request: ReplicateGenerateRequest): Promise<GenerateResponse> {
    try {
      const model = this.models.find(m => m.id === request.model);
      if (!model) {
        throw new ProviderError(`Model ${request.model} not found`, this.id);
      }

      // Handle different model types
      let input: any;
      let output: any;

      if (model.type === 'image') {
        input = this.prepareImageInput(request);
        output = await this.client.run(request.model as any, { input });
      } else if (model.type === 'video') {
        input = this.prepareVideoInput(request);
        output = await this.client.run(request.model as any, { input });
      } else if (model.type === 'audio') {
        input = this.prepareAudioInput(request);
        output = await this.client.run(request.model as any, { input });
      } else if (model.type === 'multimodal') {
        input = this.prepareMultimodalInput(request);
        output = await this.client.run(request.model as any, { input });
      } else {
        // Text models
        input = this.prepareTextInput(request);
        output = await this.client.run(request.model as any, { input });
      }

      return this.formatResponse(output, request, model);

    } catch (error: any) {
      console.error(`Replicate API error for model ${request.model}:`, error);
      
      if (error.message?.includes('insufficient funds')) {
        throw new ProviderError('Insufficient Replicate credits', this.id, false);
      }
      if (error.message?.includes('rate limit')) {
        throw new ProviderError('Replicate rate limit exceeded', this.id, true);
      }
      if (error.message?.includes('not found')) {
        throw new ProviderError(`Model ${request.model} not found on Replicate`, this.id, false);
      }
      
      throw new ProviderError(
        error.message || `Replicate API error for ${request.model}`,
        this.id,
        true
      );
    }
  }

  async *generateStream(request: ReplicateGenerateRequest): AsyncGenerator<any, void, unknown> {
    // Most Replicate models don't support streaming, but some do
    throw new ProviderError('Streaming not supported for most Replicate models', this.id, false);
  }

  private prepareImageInput(request: ReplicateGenerateRequest): any {
    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    // Common image generation parameters
    const baseInput = {
      prompt,
      num_outputs: 1,
      guidance_scale: 7.5,
      num_inference_steps: 50,
      seed: request.seed || Math.floor(Math.random() * 1000000)
    };

    // Model-specific adjustments
    if (request.model.includes('flux')) {
      return {
        ...baseInput,
        aspect_ratio: request.aspectRatio || "1:1",
        output_format: request.outputFormat || "webp",
        output_quality: 90
      };
    }

    if (request.model.includes('ideogram')) {
      return {
        ...baseInput,
        style_type: request.stylePrompt || "AUTO",
        aspect_ratio: request.aspectRatio || "ASPECT_1_1"
      };
    }

    if (request.model.includes('rembg')) {
      return {
        image: request.imageUrl || request.attachedImages?.[0]
      };
    }

    if (request.model.includes('esrgan') || request.model.includes('gfpgan')) {
      return {
        image: request.imageUrl || request.attachedImages?.[0],
        scale: 4
      };
    }

    return baseInput;
  }

  private prepareVideoInput(request: ReplicateGenerateRequest): any {
    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    if (request.model.includes('minimax')) {
      return {
        prompt,
        aspect_ratio: request.aspectRatio || "16:9",
        duration: "5s"
      };
    }

    if (request.model.includes('ltx-video')) {
      return {
        prompt,
        width: 768,
        height: 512,
        num_frames: 161,
        num_inference_steps: 50
      };
    }

    return { prompt };
  }

  private prepareAudioInput(request: ReplicateGenerateRequest): any {
    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    if (request.model.includes('musicgen')) {
      return {
        prompt,
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "loudness",
        duration: 30
      };
    }

    return { prompt };
  }

  private prepareMultimodalInput(request: ReplicateGenerateRequest): any {
    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    if (request.model.includes('llava')) {
      return {
        image: request.imageUrl || request.attachedImages?.[0],
        prompt,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature || 0.7
      };
    }

    return { prompt };
  }

  private prepareTextInput(request: ReplicateGenerateRequest): any {
    const prompt = request.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    return {
      prompt,
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7,
      top_p: 0.9,
      repetition_penalty: 1.1
    };
  }

  private formatResponse(output: any, request: ReplicateGenerateRequest, model: ModelInfo): GenerateResponse {
    let content = '';
    let mediaUrls: string[] = [];

    // Handle different output types
    if (Array.isArray(output)) {
      if (typeof output[0] === 'string') {
        if (output[0].startsWith('http')) {
          // Media URLs
          mediaUrls = output;
          content = `Generated ${model.type}: ${mediaUrls.join(', ')}`;
        } else {
          // Text content
          content = output.join(' ');
        }
      }
    } else if (typeof output === 'string') {
      if (output.startsWith('http')) {
        mediaUrls = [output];
        content = `Generated ${model.type}: ${output}`;
      } else {
        content = output;
      }
    } else if (output && typeof output === 'object') {
      // Handle object responses
      content = JSON.stringify(output, null, 2);
    }

    return {
      id: `replicate-${Date.now()}`,
      content,
      model: request.model,
      usage: {
        promptTokens: 0, // Replicate doesn't provide token counts
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: 'stop',
      metadata: {
        provider: this.id,
        model: request.model,
        timestamp: new Date().toISOString(),
        mediaUrls,
        modelType: model.type,
        cost: this.calculateCost(model)
      }
    };
  }

  private calculateCost(model: ModelInfo): number {
    // Replicate charges per prediction, not per token
    return model.inputCostPer1kTokens;
  }

  async listModels(): Promise<ModelInfo[]> {
    // Return static list for now
    // In production, you might fetch from Replicate's collections API
    return this.models;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple text model
      const models = await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}