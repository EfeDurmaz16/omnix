export interface AgentTool {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'database' | 'ai' | 'utility' | 'web' | 'file' | 'communication';
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    default?: any;
  }[];
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  enabled: boolean;
  rateLimitPerMinute?: number;
  cost?: number; // Credits per use
}

export interface AgentPersonality {
  name: string;
  role: string;
  expertise: string[];
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly' | 'professional';
  responseLength: 'concise' | 'detailed' | 'comprehensive';
  creativity: number; // 0-10 scale
  precision: number; // 0-10 scale
  proactiveness: number; // 0-10 scale
}

export interface AgentMemory {
  conversationHistory: {
    timestamp: Date;
    role: 'user' | 'agent';
    content: string;
    toolsUsed?: string[];
  }[];
  userPreferences: Record<string, any>;
  taskHistory: {
    taskId: string;
    description: string;
    status: 'completed' | 'failed' | 'pending';
    timestamp: Date;
    tools: string[];
    result?: any;
  }[];
  contextualKnowledge: Record<string, any>;
}

export interface AgentConfiguration {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  personality: AgentPersonality;
  availableTools: string[]; // Tool IDs
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  model: string; // AI model to use
  enabled: boolean;
  autoStart: boolean;
  triggerKeywords: string[];
  memory: AgentMemory;
  permissions: {
    canAccessInternet: boolean;
    canModifyFiles: boolean;
    canSendEmails: boolean;
    canMakePurchases: boolean;
    canAccessPrivateData: boolean;
    maxCostPerHour: number;
  };
  userId: string;
  templateId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  userId: string;
  taskDescription: string;
  status: 'initializing' | 'thinking' | 'executing' | 'waiting' | 'completed' | 'failed';
  steps: {
    id: string;
    type: 'thinking' | 'tool-call' | 'response' | 'error';
    timestamp: Date;
    content: string;
    toolUsed?: string;
    toolInput?: any;
    toolOutput?: any;
    error?: string;
    duration?: number;
  }[];
  result?: any;
  startTime: Date;
  endTime?: Date;
  totalCost: number;
  tokensUsed: number;
}

export interface AgentToolCall {
  tool: string;
  parameters: Record<string, any>;
  reasoning?: string;
}

export interface AgentResponse {
  id: string;
  content: string;
  toolCalls: AgentToolCall[];
  thinking: string;
  confidence: number; // 0-1 scale
  nextActions?: string[];
  shouldContinue: boolean;
  metadata: {
    tokensUsed: number;
    cost: number;
    duration: number;
    model: string;
  };
}

// Built-in tool categories
export const TOOL_CATEGORIES = {
  API: 'api',
  DATABASE: 'database',
  AI: 'ai',
  UTILITY: 'utility',
  WEB: 'web',
  FILE: 'file',
  COMMUNICATION: 'communication'
} as const;

// Temporary simplified templates to avoid import issues
export const AGENT_TEMPLATES: Partial<AgentConfiguration>[] = [
  {
    name: 'Research Assistant',
    description: 'Advanced research agent that can search the web, analyze information, and generate comprehensive reports',
    personality: {
      name: 'Research Assistant',
      role: 'Information Researcher',
      expertise: ['web search', 'data analysis', 'report writing', 'fact checking'],
      communicationStyle: 'professional',
      responseLength: 'detailed',
      creativity: 6,
      precision: 9,
      proactiveness: 8
    },
    availableTools: ['web-search', 'data-analyzer', 'gemini-ai', 'file-processing', 'email-sender'],
    systemPrompt: `You are a professional research assistant. Your capabilities include web search, data analysis, report generation, and fact-checking. Always provide evidence-based insights and cite sources when possible.`,
    model: 'gemini-2.0-flash-exp',
    temperature: 0.3,
    topP: 0.8,
    maxTokens: 8192
  },
  {
    name: 'Code Assistant',
    description: 'Expert programming assistant that can write, debug, and optimize code across multiple languages',
    personality: {
      name: 'Code Assistant',
      role: 'Software Developer',
      expertise: ['programming', 'debugging', 'code review', 'architecture', 'best practices'],
      communicationStyle: 'technical',
      responseLength: 'detailed',
      creativity: 7,
      precision: 10,
      proactiveness: 7
    },
    availableTools: ['gemini-ai', 'file-processing', 'web-search', 'email-sender'],
    systemPrompt: `You are an expert software developer. Write clean, efficient, maintainable code with proper error handling. Explain complex concepts clearly and follow industry best practices.`,
    model: 'gemini-2.0-flash-exp',
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 8192
  },
  {
    name: 'Data Analyst',
    description: 'Professional data analyst that can process, analyze, and visualize data to generate business insights',
    personality: {
      name: 'Data Analyst',
      role: 'Business Intelligence Analyst',
      expertise: ['data analysis', 'statistics', 'visualization', 'business intelligence', 'reporting'],
      communicationStyle: 'analytical',
      responseLength: 'comprehensive',
      creativity: 5,
      precision: 10,
      proactiveness: 8
    },
    availableTools: ['data-analyzer', 'file-processing', 'gemini-ai', 'email-sender'],
    systemPrompt: `You are a professional data analyst. Focus on actionable insights, use appropriate statistical methods, and present findings clearly with proper visualizations.`,
    model: 'gemini-2.0-flash-exp',
    temperature: 0.1,
    topP: 0.8,
    maxTokens: 8192
  }
];