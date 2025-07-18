import { 
  BaseProvider, 
  ModelInfo, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderError,
  COMPUTE_MODES,
  TokenUsage
} from './base';

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deploymentName: string;
  region: 'sweden-central' | 'us-east-2' | 'west-europe' | 'east-us';
  enableLogging?: boolean;
  enableVNet?: boolean;
  privateEndpoint?: string;
}

export interface AzureOpenAISetupGuide {
  step: number;
  title: string;
  description: string;
  azureCLI?: string;
  portalSteps?: string[];
  verification?: string;
}

export interface AzureOpenAICompliance {
  dataResidency: {
    region: string;
    location: string;
    gdprCompliant: boolean;
    turkeyCompliant: boolean;
  };
  security: {
    vnetSupport: boolean;
    privateEndpoints: boolean;
    managedKeys: boolean;
    azureAD: boolean;
  };
  enterprise: {
    sla: string;
    support: string;
    monitoring: boolean;
    costManagement: boolean;
  };
}

export interface AzureOpenAICostEstimate {
  model: string;
  region: string;
  monthlyTokens: number;
  estimatedCost: number;
  currency: string;
  costBreakdown: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

export class AzureOpenAIProvider extends BaseProvider {
  name = 'azure-openai';
  private config: AzureOpenAIConfig;

  models: ModelInfo[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4 (Azure)',
      provider: 'azure-openai',
      type: 'text',
      contextWindow: 8192,
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0.06,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4-32k',
      name: 'GPT-4 32k (Azure)',
      provider: 'azure-openai',
      type: 'text',
      contextWindow: 32768,
      inputCostPer1kTokens: 0.06,
      outputCostPer1kTokens: 0.12,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o (Azure)',
      provider: 'azure-openai',
      type: 'multimodal',
      contextWindow: 128000,
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.015,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'image-analysis', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    },
    {
      id: 'gpt-35-turbo',
      name: 'GPT-3.5 Turbo (Azure)',
      provider: 'azure-openai',
      type: 'text',
      contextWindow: 16385,
      inputCostPer1kTokens: 0.0015,
      outputCostPer1kTokens: 0.002,
      capabilities: [
        { type: 'text-generation', supported: true },
        { type: 'function-calling', supported: true },
        { type: 'json-mode', supported: true }
      ]
    }
  ];

  constructor(config: AzureOpenAIConfig) {
    super();
    this.config = config;
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    
    try {
      // Apply compute mode if specified
      const computeModeConfig = request.mode ? COMPUTE_MODES[request.mode] : null;
      const messages = [...request.messages];
      
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

      const requestBody = {
        messages: messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })),
        temperature: computeModeConfig?.temperature ?? request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        top_p: request.topP ?? 1,
        frequency_penalty: request.frequencyPenalty ?? 0,
        presence_penalty: request.presencePenalty ?? 0,
        stop: request.stop
      };

      const response = await fetch(
        `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new ProviderError(
          `Azure OpenAI API error: ${response.statusText}`,
          this.name,
          response.status.toString(),
          response.status,
          response.status === 429
        );
      }

      const data = await response.json();
      const choice = data.choices[0];
      const usage: TokenUsage = {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        estimatedCost: this.calculateCost(data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, request.model)
      };

      const latency = Date.now() - startTime;
      const response_obj = this.createResponse(
        choice.message.content,
        request.model,
        usage,
        choice.finish_reason === 'stop' ? 'stop' : 'length'
      );
      response_obj.metadata.latency = latency;

      return response_obj;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Azure OpenAI request failed: ${error}`,
        this.name,
        'REQUEST_FAILED',
        500
      );
    }
  }

  async *generateStream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    // For now, fall back to non-streaming
    const response = await this.generateText(request);
    yield response;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 1
          }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number, modelId: string): number {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.inputCostPer1kTokens;
    const outputCost = (outputTokens / 1000) * model.outputCostPer1kTokens;
    return inputCost + outputCost;
  }

  // Azure-specific methods
  static getSetupGuide(): AzureOpenAISetupGuide[] {
    return [
      {
        step: 1,
        title: 'Create Azure Resource Group',
        description: 'Create a new resource group for your OpenAI resources',
        azureCLI: 'az group create --name rg-omnix-openai --location swedencentral',
        portalSteps: [
          'Go to Azure Portal → Resource Groups',
          'Click "Create"',
          'Select subscription and enter resource group name',
          'Choose Sweden Central region',
          'Click "Review + Create"'
        ],
        verification: 'az group show --name rg-omnix-openai'
      },
      {
        step: 2,
        title: 'Deploy Azure OpenAI Resource',
        description: 'Create Azure OpenAI cognitive service in Sweden Central',
        azureCLI: 'az cognitiveservices account create --name omnix-openai-sweden --resource-group rg-omnix-openai --location swedencentral --kind OpenAI --sku S0',
        portalSteps: [
          'Go to Azure Portal → Create a resource',
          'Search for "Azure OpenAI"',
          'Click Create → Select subscription and resource group',
          'Enter name: omnix-openai-sweden',
          'Select Sweden Central region',
          'Choose Standard S0 pricing tier'
        ],
        verification: 'az cognitiveservices account show --name omnix-openai-sweden --resource-group rg-omnix-openai'
      }
    ];
  }

  static getComplianceInfo(): AzureOpenAICompliance {
    return {
      dataResidency: {
        region: 'Sweden Central',
        location: 'European Union',
        gdprCompliant: true,
        turkeyCompliant: true
      },
      security: {
        vnetSupport: true,
        privateEndpoints: true,
        managedKeys: true,
        azureAD: true
      },
      enterprise: {
        sla: '99.9%',
        support: '24/7 Enterprise Support',
        monitoring: true,
        costManagement: true
      }
    };
  }

  static estimateMonthlyCost(monthlyTokens: number, model: string = 'gpt-4o'): AzureOpenAICostEstimate {
    const models: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-35-turbo': { input: 0.0015, output: 0.002 }
    };

    const pricing = models[model] || models['gpt-4o'];
    const inputTokens = monthlyTokens * 0.7; // Assume 70% input
    const outputTokens = monthlyTokens * 0.3; // Assume 30% output

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      model,
      region: 'Sweden Central',
      monthlyTokens,
      estimatedCost: totalCost,
      currency: 'USD',
      costBreakdown: {
        inputTokens: inputCost,
        outputTokens: outputCost,
        totalCost
      }
    };
  }
}

/**
 * Factory function to create Azure OpenAI provider instance
 */
export function createAzureOpenAIProvider(config?: Partial<AzureOpenAIConfig>): AzureOpenAIProvider {
  const defaultConfig: AzureOpenAIConfig = {
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    region: (process.env.AZURE_OPENAI_REGION as any) || 'sweden-central'
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new AzureOpenAIProvider(finalConfig);
} 