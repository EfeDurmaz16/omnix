/**
 * Utility functions for working with AI models
 */

// Global models cache
let modelsCache: any[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch models from the API
 */
async function fetchModels(): Promise<any[]> {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (modelsCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return modelsCache;
  }
  
  try {
    const response = await fetch('/api/models');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success && data.data && data.data.providers) {
      // Flatten models from all providers
      const allModels = data.data.providers.flatMap((provider: any) =>
        provider.models.map((model: any) => ({
          id: model.id,
          name: model.name,
          provider: provider.name,
          type: model.type,
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
          inputCost: model.inputCost,
          outputCost: model.outputCost,
          capabilities: model.capabilities || []
        }))
      );
      
      // Update cache
      modelsCache = allModels;
      cacheTimestamp = now;
      
      return allModels;
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
  }
  
  // Return empty array if fetch fails
  return [];
}

/**
 * Get a human-readable display name for a model
 * This function first tries to get the name from the API, then falls back to ID formatting
 */
export async function getModelDisplayName(modelId: string): Promise<string> {
  try {
    const models = await fetchModels();
    const model = models.find(m => m.id === modelId);
    
    if (model?.name && model.name !== model.id && !model.name.includes('/')) {
      return model.name;
    }
  } catch (error) {
    console.error('Error fetching model name:', error);
  }
  
  // Fallback to formatting the ID
  return formatModelId(modelId);
}

/**
 * Synchronous version that uses cached data only
 */
export function getModelDisplayNameSync(modelId: string): string {
  if (!modelId) return 'Unknown Model';
  
  const model = modelsCache.find(m => m.id === modelId);
  
  if (model?.name && model.name !== model.id && !model.name.includes('/')) {
    return model.name;
  }
  
  // Always fall back to formatting the ID if no cached data
  return formatModelId(modelId);
}

/**
 * Format a model ID into a human-readable name as fallback
 */
function formatModelId(modelId: string): string {
  if (!modelId) return 'Unknown Model';
  
  const id = modelId.toLowerCase();
  
  // Handle provider/model format (e.g., "meta-llama/llama-guard-3-8b")
  if (id.includes('/')) {
    const parts = id.split('/');
    const modelPart = parts[1] || parts[0];
    
    // Meta LLaMA models with provider prefix
    if (modelPart.includes('llama-guard-3-8b')) return 'LLaMA Guard 3 8B';
    if (modelPart.includes('llama-guard-3')) return 'LLaMA Guard 3';
    if (modelPart.includes('llama-guard')) return 'LLaMA Guard';
    if (modelPart.includes('llama-3.3') || modelPart.includes('llama-3-3')) return 'LLaMA 3.3';
    if (modelPart.includes('llama-3.2') || modelPart.includes('llama-3-2')) return 'LLaMA 3.2';
    if (modelPart.includes('llama-3.1') || modelPart.includes('llama-3-1')) return 'LLaMA 3.1';
    if (modelPart.includes('llama-3') || modelPart.includes('llama3')) return 'LLaMA 3';
    if (modelPart.includes('llama-2') || modelPart.includes('llama2')) return 'LLaMA 2';
    if (modelPart.includes('llama')) return 'LLaMA';
    
    // Other provider/model patterns
    if (modelPart.includes('codellama')) return 'Code LLaMA';
    if (modelPart.includes('mistral')) return 'Mistral';
    if (modelPart.includes('gemma')) return 'Gemma';
    
    // Generic cleanup for provider/model format
    return modelPart
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }
  
  // OpenAI models - handle various formats
  if (id.includes('o3-pro')) return 'o3-pro';
  if (id.includes('o3-mini')) return 'o3-mini';
  if (id.includes('o3')) return 'o3';
  if (id.includes('o1-pro')) return 'o1-pro';
  if (id.includes('o1-mini')) return 'o1-mini';
  if (id.includes('o1')) return 'o1';
  if (id.includes('gpt-4.1')) return 'GPT-4.1';
  if (id.includes('gpt-4o-mini')) return 'GPT-4o Mini';
  if (id.includes('gpt-4o')) return 'GPT-4o';
  if (id.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
  if (id.includes('gpt-4')) return 'GPT-4';
  if (id.includes('gpt-3.5-turbo')) return 'GPT-3.5 Turbo';
  if (id.includes('gpt-3.5')) return 'GPT-3.5';
  
  // Claude models - handle timestamp versions
  if (id.includes('claude-4-opus')) return 'Claude 4 Opus';
  if (id.includes('claude-4-sonnet') || id.includes('claude-sonnet-4')) return 'Claude 4 Sonnet';
  if (id.includes('claude-3.5-sonnet') || id.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
  if (id.includes('claude-3.5-haiku') || id.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku';
  if (id.includes('claude-3-opus')) return 'Claude 3 Opus';
  if (id.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
  if (id.includes('claude-3-haiku')) return 'Claude 3 Haiku';
  
  // Gemini models - handle version suffixes
  if (id.includes('gemini-2.5-pro') || id.includes('gemini-2-5-pro')) return 'Gemini 2.5 Pro';
  if (id.includes('gemini-2.5-flash') || id.includes('gemini-2-5-flash')) return 'Gemini 2.5 Flash';
  if (id.includes('gemini-2.0-flash') || id.includes('gemini-2-0-flash')) return 'Gemini 2.0 Flash';
  if (id.includes('gemini-1.5-pro') || id.includes('gemini-1-5-pro')) return 'Gemini 1.5 Pro';
  if (id.includes('gemini-1.5-flash') || id.includes('gemini-1-5-flash')) return 'Gemini 1.5 Flash';
  if (id.includes('gemini-pro')) return 'Gemini Pro';
  if (id.includes('gemini-flash')) return 'Gemini Flash';
  
  // Meta models
  if (id.includes('llama-4')) return 'LLaMA 4';
  if (id.includes('llama-3.3') || id.includes('llama-3-3')) return 'LLaMA 3.3';
  if (id.includes('llama-3.2') || id.includes('llama-3-2')) return 'LLaMA 3.2';
  if (id.includes('llama-3.1') || id.includes('llama-3-1')) return 'LLaMA 3.1';
  if (id.includes('llama-3') || id.includes('llama3')) return 'LLaMA 3';
  if (id.includes('llama-2') || id.includes('llama2')) return 'LLaMA 2';
  
  // Mistral models
  if (id.includes('mistral-large')) return 'Mistral Large';
  if (id.includes('mistral-medium')) return 'Mistral Medium';
  if (id.includes('mistral-small')) return 'Mistral Small';
  if (id.includes('mistral-7b')) return 'Mistral 7B';
  if (id.includes('mixtral')) return 'Mixtral';
  
  // xAI models
  if (id.includes('grok-3')) return 'Grok 3';
  if (id.includes('grok-2')) return 'Grok 2';
  if (id.includes('grok')) return 'Grok';
  
  // Other models
  if (id.includes('qwen-2.5') || id.includes('qwen2.5')) return 'Qwen 2.5';
  if (id.includes('qwen-2') || id.includes('qwen2')) return 'Qwen 2';
  if (id.includes('qwen')) return 'Qwen';
  if (id.includes('deepseek-v3')) return 'DeepSeek V3';
  if (id.includes('deepseek-v2')) return 'DeepSeek V2';
  if (id.includes('deepseek')) return 'DeepSeek';
  
  // Image models
  if (id.includes('dall-e-3') || id.includes('dall_e_3')) return 'DALL-E 3';
  if (id.includes('dall-e-2') || id.includes('dall_e_2')) return 'DALL-E 2';
  if (id.includes('imagen-4')) return 'Imagen 4';
  if (id.includes('imagen-3')) return 'Imagen 3';
  if (id.includes('flux-1.1-pro')) return 'FLUX.1.1 Pro';
  if (id.includes('flux-1-pro')) return 'FLUX.1 Pro';
  if (id.includes('flux-1.1')) return 'FLUX.1.1';
  if (id.includes('flux-1')) return 'FLUX.1';
  if (id.includes('midjourney-v7')) return 'Midjourney V7';
  if (id.includes('midjourney-v6')) return 'Midjourney V6';
  if (id.includes('midjourney')) return 'Midjourney';
  if (id.includes('stable-diffusion-3.5')) return 'Stable Diffusion 3.5';
  if (id.includes('stable-diffusion-3')) return 'Stable Diffusion 3';
  if (id.includes('stable-diffusion-xl')) return 'Stable Diffusion XL';
  if (id.includes('stable-diffusion')) return 'Stable Diffusion';
  
  // Video models
  if (id.includes('veo-3')) return 'Veo 3';
  if (id.includes('veo-2')) return 'Veo 2';
  if (id.includes('veo')) return 'Veo';
  if (id.includes('seedance')) return 'Seedance';
  if (id.includes('kling-1.6')) return 'Kling 1.6';
  if (id.includes('kling')) return 'Kling';
  if (id.includes('runway')) return 'Runway';
  if (id.includes('pika')) return 'Pika';
  
  // Audio models
  if (id.includes('elevenlabs')) return 'ElevenLabs';
  if (id.includes('whisper-1')) return 'Whisper';
  if (id.includes('tts-1-hd')) return 'TTS-1 HD';
  if (id.includes('tts-1')) return 'TTS-1';
  
  // Generic cleanup for unknown models
  const name = modelId
    // Remove provider prefixes (including meta-llama)
    .replace(/^(openai|anthropic|google|meta-llama|meta|mistral|xai|alibaba|deepseek|stability|midjourney|elevenlabs|wavespeed)[-_\/]?/i, '')
    // Remove timestamp suffixes (like -20241022)
    .replace(/-\d{8}$/, '')
    // Remove version suffixes (like -001, -002)
    .replace(/-\d{3}$/, '')
    // Replace dashes and underscores with spaces
    .replace(/[-_]/g, ' ')
    // Capitalize each word
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
  
  return name || modelId;
}

/**
 * Get model tier/category for display
 */
export function getModelTier(modelId: string): 'flagship' | 'premium' | 'standard' | 'efficient' {
  const id = modelId.toLowerCase();
  
  if (id.includes('o3') || id.includes('o1') || id.includes('claude-4') || id.includes('gemini-2.5')) {
    return 'flagship';
  }
  if (id.includes('gpt-4o') || id.includes('claude-3.5') || id.includes('gemini-pro')) {
    return 'premium';
  }
  if (id.includes('mini') || id.includes('flash') || id.includes('turbo')) {
    return 'efficient';
  }
  
  return 'standard';
}

/**
 * Get model provider from ID
 */
export function getModelProvider(modelId: string): string {
  const id = modelId.toLowerCase();
  
  if (id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('dall-e')) {
    return 'OpenAI';
  }
  if (id.includes('claude')) {
    return 'Anthropic';
  }
  if (id.includes('gemini') || id.includes('imagen') || id.includes('veo')) {
    return 'Google';
  }
  if (id.includes('llama')) {
    return 'Meta';
  }
  if (id.includes('mistral')) {
    return 'Mistral';
  }
  if (id.includes('grok')) {
    return 'xAI';
  }
  if (id.includes('qwen')) {
    return 'Alibaba';
  }
  if (id.includes('deepseek')) {
    return 'DeepSeek';
  }
  if (id.includes('flux')) {
    return 'Black Forest Labs';
  }
  if (id.includes('stable-diffusion')) {
    return 'Stability AI';
  }
  if (id.includes('midjourney')) {
    return 'Midjourney';
  }
  if (id.includes('seedance')) {
    return 'Wavespeed';
  }
  if (id.includes('elevenlabs')) {
    return 'ElevenLabs';
  }
  
  return 'Unknown';
}

/**
 * Check if a model is new/recently released
 */
export function isNewModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return [
    'o3', 'o4-mini', 'o3-pro', 'o3-mini', 'o1-pro', 'gpt-4.1',
    'claude-4', 'claude-sonnet-4', 'gemini-2.5', 'gemini-2.0',
    'llama-4', 'grok-3', 'flux-1.1', 'veo-3', 'imagen-4'
  ].some(newId => id.includes(newId));
}