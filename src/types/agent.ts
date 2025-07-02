// Client-safe agent types
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  personality: AgentPersonality;
  capabilities: AgentCapability[];
  model?: string;
  preferredModel?: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  maxTokensPerTask?: number;
  maxCostPerDay?: number;
  systemPrompt?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface AgentPersonality {
  name?: string;
  description?: string;
  tone?: 'friendly' | 'professional' | 'creative' | 'analytical' | 'supportive';
  style?: 'concise' | 'detailed' | 'conversational' | 'formal';
  communicationStyle?: 'casual' | 'formal' | 'friendly' | 'professional';
  expertise: string[];
  traits?: string[];
  constraints?: string[];
  systemPrompt?: string;
}

export interface AgentCapability {
  id?: string;
  type: 'text-generation' | 'analysis' | 'research' | 'coding' | 'creative-writing' | 'data-processing';
  name: string;
  description: string;
  enabled: boolean;
}

export const AGENT_TEMPLATES: AgentConfig[] = [
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Helps with academic research, fact-checking, and analysis',
    personality: {
      tone: 'professional',
      style: 'detailed',
      expertise: ['research', 'analysis', 'fact-checking'],
      traits: ['thorough', 'analytical', 'reliable']
    },
    capabilities: [
      {
        id: 'research-analysis',
        type: 'research',
        name: 'Research & Analysis',
        description: 'Comprehensive research and analysis capabilities',
        enabled: true
      },
      {
        id: 'report-writing',
        type: 'text-generation',
        name: 'Report Writing',
        description: 'Generate detailed research reports',
        enabled: true
      }
    ],
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2000,
    systemPrompt: 'You are a professional research assistant. Provide thorough, well-researched responses with citations when possible.',
    isActive: false,
    createdAt: new Date(),
    usageCount: 0
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Assists with creative writing, storytelling, and content creation',
    personality: {
      tone: 'creative',
      style: 'conversational',
      expertise: ['writing', 'storytelling', 'creativity'],
      traits: ['imaginative', 'expressive', 'inspiring']
    },
    capabilities: [
      {
        id: 'creative-writing',
        type: 'creative-writing',
        name: 'Creative Writing',
        description: 'Generate creative content and stories',
        enabled: true
      },
      {
        id: 'content-creation',
        type: 'text-generation',
        name: 'Content Creation',
        description: 'Create engaging written content',
        enabled: true
      }
    ],
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.8,
    maxTokens: 3000,
    systemPrompt: 'You are a creative writing assistant. Help users create engaging, imaginative content with flair and creativity.',
    isActive: false,
    createdAt: new Date(),
    usageCount: 0
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code, suggests improvements, and helps with debugging',
    personality: {
      tone: 'professional',
      style: 'concise',
      expertise: ['programming', 'debugging', 'best-practices'],
      traits: ['precise', 'helpful', 'thorough']
    },
    capabilities: [
      {
        id: 'code-analysis',
        type: 'coding',
        name: 'Code Analysis',
        description: 'Analyze and review code quality',
        enabled: true
      },
      {
        id: 'debugging',
        type: 'analysis',
        name: 'Debugging',
        description: 'Help identify and fix bugs',
        enabled: true
      }
    ],
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2500,
    systemPrompt: 'You are a senior code reviewer. Provide constructive feedback on code quality, suggest improvements, and help debug issues.',
    isActive: false,
    createdAt: new Date(),
    usageCount: 0
  }
];