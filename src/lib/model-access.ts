export interface PlanAccess {
  text: string[];
  image: string[];
  video: string[];
  maxTokens: number;
  dailyLimit: number;
  features: string[];
}

export const PLAN_MODEL_ACCESS: Record<string, PlanAccess> = {
  demo: {
    text: [
      'gpt-3.5-turbo', 
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gemini-2.0-flash-001',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'llama-4-scout-17b-16e-instruct-maas',
      'llama-4-maverick-17b-128e-instruct-maas'
    ],
    image: [],
    video: [],
    maxTokens: 2000,
    dailyLimit: 100,
    features: [
      'Demo access to text models',
      'Extended conversation history',
      'Standard response speed'
    ]
  },
  free: {
    text: [
      'gpt-3.5-turbo', 
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gemini-2.0-flash-001', 
      'claude-3-5-haiku-20241022',
      'llama-4-scout-17b-16e-instruct-maas'
    ],
    image: [],
    video: [],
    maxTokens: 1000,
    dailyLimit: 50,
    features: [
      'Basic text generation',
      'Limited conversation history',
      'Standard response speed'
    ]
  },
  pro: {
    text: [
      'gpt-4',
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'llama-4-scout-17b-16e-instruct-maas',
      'llama-4-maverick-17b-128e-instruct-maas',
      'mistral-small-2503@001',
      'gemini-2.0-flash-001',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ],
    image: ['dall-e-3', 'dall-e-2'],
    video: ['seedance-v1-pro-i2v-720p'], // Add Wavespeed models for Pro users
    maxTokens: 4000,
    dailyLimit: 1000,
    features: [
      'Advanced text generation',
      'Image generation',
      'Basic video generation (Wavespeed)',
      'File upload support',
      'Extended conversation history',
      'Priority processing',
      'All prompt modes'
    ]
  },
  ultra: {
    text: ['all'], // access to all text models
    image: ['all'], // access to all image models
    video: ['all'], // access to all video models
    maxTokens: 8000,
    dailyLimit: 5000,
    features: [
      'Access to all AI models',
      'Advanced image generation',
      'Video generation (beta)',
      'Unlimited conversation history',
      'Highest priority processing',
      'Advanced prompt modes',
      'Custom model imports',
      'API access',
      'Team collaboration'
    ]
  }
} as const;

export function checkModelAccess(userPlan: string, modelId: string, modelType: 'text' | 'image' | 'video'): boolean {
  const plan = userPlan?.toLowerCase() || 'free';
  const access = PLAN_MODEL_ACCESS[plan];
  
  if (!access) return false;
  
  const allowedModels = access[modelType];
  
  // Check if allowedModels exists and is an array
  if (!allowedModels || !Array.isArray(allowedModels)) {
    return false;
  }
  
  // Check if user has access to all models of this type
  if (allowedModels.includes('all')) {
    return true;
  }
  
  // Check if specific model is allowed
  return allowedModels.includes(modelId);
}

export function getUserPlanLimits(userPlan: string): PlanAccess {
  const plan = userPlan?.toLowerCase() || 'free';
  return PLAN_MODEL_ACCESS[plan] || PLAN_MODEL_ACCESS.free;
}

export function getAvailableModelsForPlan(userPlan: string, allModels: any[]): any[] {
  const plan = userPlan?.toLowerCase() || 'free';
  const access = PLAN_MODEL_ACCESS[plan];
  
  console.log('🔍 Filtering models for plan:', plan);
  console.log('📊 Input models:', allModels.length);
  console.log('📋 Plan access config:', access);
  
  if (!access) return [];
  
  const filteredModels = allModels.filter(model => {
    // Map model types: multimodal models should be checked as text models for plan access
    let modelType: 'text' | 'image' | 'video';
    
    if (model.type === 'multimodal' || model.type === 'text') {
      modelType = 'text';
    } else if (model.type === 'image') {
      modelType = 'image';
    } else if (model.type === 'video') {
      modelType = 'video';
    } else {
      // Default to text for unknown types
      modelType = 'text';
    }
    
    const hasAccess = checkModelAccess(plan, model.id, modelType);
    console.log(`🔑 Model: ${model.id} (${model.type} -> ${modelType}) - Access: ${hasAccess}`);
    
    return hasAccess;
  });
  
  console.log('✅ Final filtered models:', filteredModels.length);
  return filteredModels;
}

export function canUsePromptMode(userPlan: string, mode: string): boolean {
  const plan = userPlan?.toLowerCase() || 'free';
  
  // Free users can only use 'flash' mode
  if (plan === 'free') {
    return mode === 'flash';
  }
  
  // Pro and Ultra users can use all modes
  return ['flash', 'think', 'ultra-think'].includes(mode);
}

export function getMaxTokensForPlan(userPlan: string, mode: string): number {
  const plan = userPlan?.toLowerCase() || 'free';
  const access = PLAN_MODEL_ACCESS[plan];
  
  if (!access) return 1000;
  
  // Adjust max tokens based on mode for Pro/Ultra users
  if (plan === 'pro' || plan === 'ultra') {
    switch (mode) {
      case 'flash': return Math.min(1000, access.maxTokens);
      case 'think': return Math.min(2000, access.maxTokens);
      case 'ultra-think': return access.maxTokens;
      default: return access.maxTokens;
    }
  }
  
  return access.maxTokens;
}

export function getPlanBadgeColor(plan: string): string {
  switch (plan?.toLowerCase()) {
    case 'pro':
      return 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 text-blue-300';
    case 'ultra':
      return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 text-purple-300';
    default:
      return 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-400/30 text-slate-300';
  }
} 