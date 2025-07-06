"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Star, 
  Zap, 
  Brain, 
  Image, 
  Video,
  Code,
  Music,
  Globe,
  TrendingUp,
  Crown,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Cache for models API response
let modelsCache: {
  data: any[] | null;
  timestamp: number;
  expiryTime: number;
} = {
  data: null,
  timestamp: 0,
  expiryTime: 5 * 60 * 1000 // 5 minutes cache
};

// Static model definitions (now using dynamic API data instead)
const LEGACY_ALL_MODELS = {
  // Premium/Flagship Models
  flagship: [
    {
      id: 'o3-pro',
      name: 'o3-pro',
      provider: 'OpenAI',
      description: 'Breakthrough reasoning model with exceptional problem-solving capabilities',
      price: '$200/1M tokens',
      capabilities: ['reasoning', 'math', 'code', 'research'],
      isNew: true,
      featured: true,
      performance: 95
    },
    {
      id: 'o3',
      name: 'o3',
      provider: 'OpenAI', 
      description: 'Advanced reasoning model for complex tasks',
      price: '$60/1M tokens',
      capabilities: ['reasoning', 'analysis', 'code'],
      isNew: true,
      featured: true,
      performance: 92
    },
    {
      id: 'claude-4-opus',
      name: 'Claude 4 Opus',
      provider: 'Anthropic',
      description: 'Next-generation Claude with enhanced reasoning and creativity',
      price: '$90/1M tokens',
      capabilities: ['reasoning', 'writing', 'analysis', 'code'],
      isNew: true,
      featured: true,
      performance: 94
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude 4 Sonnet',
      provider: 'Anthropic',
      description: 'Balanced Claude 4 model for production workloads',
      price: '$30/1M tokens',
      capabilities: ['general', 'writing', 'analysis'],
      isNew: true,
      featured: true,
      performance: 90
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      description: 'Advanced multimodal AI with 2M context window',
      price: '$35/1M tokens',
      capabilities: ['multimodal', 'reasoning', 'code', 'analysis'],
      isNew: true,
      featured: true,
      performance: 91
    },
    {
      id: 'llama-4-405b',
      name: 'LLaMA 4 405B',
      provider: 'Meta',
      description: 'Massive open-source model with state-of-the-art performance',
      price: '$45/1M tokens',
      capabilities: ['reasoning', 'code', 'general'],
      isNew: true,
      featured: true,
      performance: 89
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      provider: 'xAI',
      description: 'Real-time AI with web access and personality',
      price: '$25/1M tokens',
      capabilities: ['realtime', 'web', 'humor'],
      isNew: true,
      featured: true,
      performance: 87
    }
  ],

  // Cost-Effective Models
  efficient: [
    {
      id: 'gemini-flash-lite',
      name: 'Gemini Flash Lite',
      provider: 'Google',
      description: 'Ultra-fast, cost-effective model for high-volume tasks',
      price: '$0.019/1M tokens',
      capabilities: ['fast', 'general', 'cost-effective'],
      isNew: true,
      performance: 78
    },
    {
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      provider: 'DeepSeek',
      description: 'Highly efficient reasoning model',
      price: '$0.014/1M tokens',
      capabilities: ['reasoning', 'cost-effective', 'code'],
      isNew: true,
      performance: 82
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      description: 'Lightweight version of GPT-4o for quick tasks',
      price: '$0.15/1M tokens',
      capabilities: ['general', 'fast'],
      isNew: false,
      performance: 75
    }
  ],

  // Code Specialized Models
  coding: [
    {
      id: 'claude-3.5-computer-use',
      name: 'Claude 3.5 Computer Use',
      provider: 'Anthropic',
      description: 'Revolutionary AI that can interact with computer interfaces',
      price: '$15/1M tokens',
      capabilities: ['automation', 'computer-use', 'code'],
      isNew: true,
      featured: true,
      performance: 88
    },
    {
      id: 'codestral-mamba',
      name: 'Codestral Mamba',
      provider: 'Mistral',
      description: 'Advanced code generation and debugging model',
      price: '$8/1M tokens',
      capabilities: ['code', 'debugging', 'refactoring'],
      isNew: true,
      performance: 85
    },
    {
      id: 'deepseek-coder-v2.5',
      name: 'DeepSeek Coder V2.5',
      provider: 'DeepSeek',
      description: 'Specialized coding model with excellent performance',
      price: '$0.25/1M tokens',
      capabilities: ['code', 'debugging'],
      isNew: true,
      performance: 83
    }
  ],

  // Multimodal (Image/Video) Models
  multimodal: [
    {
      id: 'flux-1.1-pro-ultra',
      name: 'FLUX.1.1 Pro Ultra',
      provider: 'Black Forest Labs',
      description: 'State-of-the-art image generation model',
      price: '$0.055/image',
      capabilities: ['image-generation', 'artistic'],
      isNew: true,
      featured: true,
      performance: 95
    },
    {
      id: 'veo-3',
      name: 'Veo 3',
      provider: 'Google',
      description: 'Advanced video generation with improved motion consistency',
      price: '$0.20/second',
      capabilities: ['video-generation', 'animation'],
      isNew: true,
      featured: true,
      performance: 92
    },
    {
      id: 'kling-1.6',
      name: 'Kling 1.6',
      provider: 'Kuaishou',
      description: 'High-quality video generation model',
      price: '$0.15/second',
      capabilities: ['video-generation'],
      isNew: true,
      performance: 88
    },
    {
      id: 'midjourney-v7',
      name: 'Midjourney V7',
      provider: 'Midjourney',
      description: 'Latest artistic image generation model',
      price: '$0.08/image',
      capabilities: ['image-generation', 'artistic'],
      isNew: true,
      performance: 93
    }
  ],

  // Current Production Models
  current: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      description: 'Current flagship OpenAI model',
      price: '$5/1M tokens',
      capabilities: ['general', 'multimodal'],
      isNew: false,
      performance: 86
    },
    {
      id: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      description: 'Current production Claude model',
      price: '$3/1M tokens',
      capabilities: ['general', 'writing', 'analysis'],
      isNew: false,
      performance: 84
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'Google',
      description: 'Current Google flagship model',
      price: '$7/1M tokens',
      capabilities: ['general', 'multimodal'],
      isNew: false,
      performance: 81
    }
  ],

  // Alternative International Models
  alternative: [
    {
      id: 'ernie-4.0-turbo',
      name: 'ERNIE 4.0 Turbo',
      provider: 'Baidu',
      description: 'Advanced multilingual model with cultural understanding',
      price: '$2/1M tokens',
      capabilities: ['multilingual', 'cultural'],
      isNew: true,
      performance: 79
    },
    {
      id: 'qwen-2.5-max',
      name: 'Qwen 2.5 Max',
      provider: 'Alibaba',
      description: 'Large-scale model with strong reasoning capabilities',
      price: '$3/1M tokens',
      capabilities: ['reasoning', 'multilingual'],
      isNew: true,
      performance: 81
    },
    {
      id: 'yi-lightning',
      name: 'Yi Lightning',
      provider: '01.AI',
      description: 'Fast and efficient model for various tasks',
      price: '$0.12/1M tokens',
      capabilities: ['fast', 'general'],
      isNew: true,
      performance: 76
    }
  ]
};

interface ModelSearchProps {
  onModelSelect: (modelId: string) => void;
  currentModel: string;
  onClose: () => void;
}

export function AdvancedModelSearch({ onModelSelect, currentModel, onClose }: ModelSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCapability, setSelectedCapability] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [apiModels, setApiModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Check if we have valid cached data
        const now = Date.now();
        if (modelsCache.data && (now - modelsCache.timestamp) < modelsCache.expiryTime) {
          console.log('📋 Using cached models data');
          setApiModels(modelsCache.data);
          return;
        }

        console.log('🔄 Fetching fresh models data');
        setIsLoading(true);
        
        const response = await fetch('/api/models');
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Raw API response:', data);
          
          // Extract models from the nested provider structure
          let models: any[] = [];
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
                capabilities: model.capabilities || [],
                description: getModelDescription(model),
                price: getModelPrice(model),
                category: getModelCategory(model),
                performance: getModelPerformance(model.id),
                isNew: isNewModel(model.id),
                featured: isFeaturedModel(model.id)
              }))
            );
            
            // Remove duplicates by model ID (keep first occurrence)
            const seen = new Set();
            models = allModels.filter(model => {
              if (seen.has(model.id)) {
                console.log(`🔄 Removing duplicate model: ${model.id}`);
                return false;
              }
              seen.add(model.id);
              return true;
            });
          }
          
          console.log('🎯 Processed models:', models.length);
          
          // Update cache
          modelsCache = {
            data: models,
            timestamp: now,
            expiryTime: 5 * 60 * 1000 // 5 minutes
          };
          
          setApiModels(models);
          console.log('✅ Models fetched and cached:', models.length);
        } else {
          console.error('❌ Failed to fetch models:', response.status);
          // Fall back to empty array if API fails
          setApiModels([]);
        }
      } catch (error) {
        console.error('❌ Error fetching models:', error);
        // Fall back to empty array if there's an error
        setApiModels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Helper functions to determine model properties
  const getModelDescription = (model: any) => {
    if (model.id.includes('o3')) return 'Advanced reasoning model for complex problem-solving';
    if (model.id.includes('o1')) return 'Reasoning model with step-by-step thinking';
    if (model.id.includes('gpt-4')) return 'Large multimodal model for various tasks';
    if (model.id.includes('claude')) return 'Anthropic model for analysis and writing';
    if (model.id.includes('gemini')) return 'Google multimodal model with large context';
    return model.description || 'AI model for text generation and analysis';
  };

  const getModelPrice = (model: any) => {
    const input = model.inputCost || model.inputCostPer1kTokens || 0;
    const output = model.outputCost || model.outputCostPer1kTokens || 0;
    return `$${input.toFixed(3)}-${output.toFixed(3)}/1K tokens`;
  };

  const getModelCapabilities = (model: any) => {
    const caps: string[] = ['general']; // All models have general capability
    if (model.capabilities) {
      model.capabilities.forEach((cap: { type: string; supported: boolean }) => {
        if (cap.supported) {
          if (cap.type === 'text-generation') caps.push('general');
          if (cap.type === 'function-calling') caps.push('tools');
          if (cap.type === 'image-analysis') caps.push('multimodal');
          if (cap.type === 'code-generation') caps.push('code');
          if (cap.type === 'reasoning') caps.push('reasoning');
        }
      });
    }
    
    // Add capabilities based on model type and name
    if (model.type === 'multimodal') caps.push('multimodal');
    if (model.id.includes('code') || model.id.includes('coder')) caps.push('code');
    if (model.id.includes('mini') || model.id.includes('flash')) caps.push('fast', 'cost-effective');
    if (model.id.includes('o1') || model.id.includes('o3')) caps.push('reasoning');
    if (model.id.includes('claude')) caps.push('writing');
    
    return [...new Set(caps)]; // Remove duplicates
  };

  const isNewModel = (modelId: string) => {
    return ['o3', 'o4-mini', 'o3-pro', 'o3-mini', 'o1-pro', 'gpt-4.1'].some(id => modelId.includes(id));
  };

  const isFeaturedModel = (modelId: string) => {
    return ['o3', 'o3-pro', 'gpt-4o', 'claude-sonnet-4', 'gemini-2.5-pro'].some(id => modelId.includes(id));
  };

  const getModelPerformance = (modelId: string) => {
    if (modelId.includes('o3-pro')) return 95;
    if (modelId.includes('o3')) return 92;
    if (modelId.includes('o1-pro')) return 90;
    if (modelId.includes('o1')) return 88;
    if (modelId.includes('gpt-4.1')) return 85;
    if (modelId.includes('gpt-4o')) return 84;
    if (modelId.includes('claude-4')) return 90;
    if (modelId.includes('gemini-2.5')) return 87;
    return 80;
  };

  const getModelCategory = (model: any) => {
    if (model.id.includes('o3') || model.id.includes('o1') || model.id.includes('claude-4')) return 'flagship';
    if (model.id.includes('mini') || model.id.includes('flash') || model.id.includes('nano')) return 'efficient';
    if (model.capabilities?.some((cap: any) => cap.type === 'code-generation')) return 'coding';
    if (model.type === 'multimodal') return 'multimodal';
    return 'current';
  };

  const categories = [
    { id: 'all', name: 'All Models', icon: Globe },
    { id: 'flagship', name: 'Flagship', icon: Crown },
    { id: 'efficient', name: 'Cost-Effective', icon: Zap },
    { id: 'coding', name: 'Code Specialized', icon: Code },
    { id: 'multimodal', name: 'Image & Video', icon: Image },
    { id: 'current', name: 'Current Production', icon: Star },
    { id: 'alternative', name: 'International', icon: Globe }
  ];

  const capabilities = [
    'all', 'reasoning', 'code', 'multimodal', 'image-generation', 
    'video-generation', 'general', 'fast', 'cost-effective', 'writing'
  ];

  const filteredModels = useMemo(() => {
    let models = apiModels;

    // Filter by category
    if (selectedCategory !== 'all') {
      models = models.filter(model => getModelCategory(model) === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      models = models.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (model.description && model.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getModelCapabilities(model).some((cap: string) => cap.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by capability
    if (selectedCapability !== 'all') {
      models = models.filter(model =>
        getModelCapabilities(model).includes(selectedCapability)
      );
    }

    // Sort models
    models.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return getModelPerformance(b.id) - getModelPerformance(a.id);
        case 'price':
          const aPrice = parseFloat((a.price || '0').replace(/[^0-9.]/g, ''));
          const bPrice = parseFloat((b.price || '0').replace(/[^0-9.]/g, ''));
          return aPrice - bPrice;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return models;
  }, [apiModels, searchQuery, selectedCategory, selectedCapability, sortBy]);

  const getCapabilityIcon = (capability: string) => {
    const icons: Record<string, any> = {
      reasoning: Brain,
      code: Code,
      multimodal: Image,
      'image-generation': Image,
      'video-generation': Video,
      fast: Zap,
      general: Globe
    };
    return icons[capability] || Globe;
  };

  return (
    <div className="p-6 max-h-[80vh] bg-white dark:bg-black overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Choose AI Model</h2>
          <p className="text-muted-foreground">
            Select from {apiModels.length} available models • Current: {currentModel}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models, providers, or capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </Button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={selectedCapability}
            onChange={(e) => setSelectedCapability(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {capabilities.map(cap => (
              <option key={cap} value={cap}>
                {cap === 'all' ? 'All Capabilities' : cap.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="performance">Sort by Performance</option>
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Models Grid */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading available models...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model, index) => (
              <ModelCard
                key={`${model.id}-${index}`}
                model={model}
                isSelected={currentModel === model.id}
                onClick={() => onModelSelect(model.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredModels.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No models found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts */}
      <div className="mt-4 text-xs text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl/Cmd + K</kbd> to search • <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to close
      </div>
    </div>
  );
}

interface ModelCardProps {
  model: any;
  isSelected: boolean;
  onClick: () => void;
}

function ModelCard({ model, isSelected, onClick }: ModelCardProps) {
  // Check if this is an image or video model that will redirect
  const imageModels = ['dall-e-3', 'dall-e-2', 'gpt-image-1', 'imagen-4.0-fast-generate', 'imagen-4.0-generate-preview-06-06', 'imagen-4.0-ultra-generate-preview-06-06', 'imagen-4.0-fast-generate-preview-06-06', 'imagen-3.0-generate-002'];
  const videoModels = ['veo-2.0-generate-001', 'veo-3.0-generate-preview', 'seedance-v1-pro-i2v-720p'];
  
  const isImageModel = imageModels.includes(model.id);
  const isVideoModel = videoModels.includes(model.id);
  const willRedirect = isImageModel || isVideoModel;
  
  // Compute capabilities for this model
  const getModelCapabilities = (model: any) => {
    const caps: string[] = ['general']; // All models have general capability
    if (model.capabilities) {
      model.capabilities.forEach((cap: { type: string; supported: boolean }) => {
        if (cap.supported) {
          if (cap.type === 'text-generation') caps.push('general');
          if (cap.type === 'function-calling') caps.push('tools');
          if (cap.type === 'image-analysis') caps.push('multimodal');
          if (cap.type === 'code-generation') caps.push('code');
          if (cap.type === 'reasoning') caps.push('reasoning');
        }
      });
    }
    
    // Add capabilities based on model type and name
    if (model.type === 'multimodal') caps.push('multimodal');
    if (model.id.includes('code') || model.id.includes('coder')) caps.push('code');
    if (model.id.includes('mini') || model.id.includes('flash')) caps.push('fast', 'cost-effective');
    if (model.id.includes('o1') || model.id.includes('o3')) caps.push('reasoning');
    if (model.id.includes('claude')) caps.push('writing');
    
    return [...new Set(caps)]; // Remove duplicates
  };
  
  const capabilities = getModelCapabilities(model);
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border hover:border-primary/50 hover:shadow-sm'
        }
        ${willRedirect ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">{model.name}</h3>
            {isImageModel && (
              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                <Image className="h-3 w-3 mr-1" />
                Images
              </Badge>
            )}
            {isVideoModel && (
              <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                <Video className="h-3 w-3 mr-1" />
                Videos
              </Badge>
            )}
            {model.isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
            {model.featured && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
          </div>
          <p className="text-xs text-muted-foreground">{model.provider}</p>
        </div>
        
        <div className="text-right">
          <div className="text-xs font-medium">{model.price}</div>
          <div className="text-xs text-muted-foreground">Performance: {model.performance}%</div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {model.description}
      </p>

      <div className="flex flex-wrap gap-1">
        {capabilities.slice(0, 3).map((capability: string) => (
          <Badge key={capability} variant="outline" className="text-xs">
            {capability.replace('-', ' ')}
          </Badge>
        ))}
        {capabilities.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{capabilities.length - 3}
          </Badge>
        )}
      </div>

      {willRedirect && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
            <span>Opens {isImageModel ? 'Image' : 'Video'} Generation</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </div>
      )}

      {isSelected && !willRedirect && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="flex items-center justify-center text-primary text-sm font-medium">
            <span>Currently Selected</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </div>
      )}
    </motion.div>
  );
} 