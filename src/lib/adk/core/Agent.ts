/**
 * ADK-Inspired Agent Framework for TypeScript/Next.js
 * Based on Google Agent Development Kit patterns
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools: string[];
  userId: string;
}

export interface AgentContext {
  conversationHistory: Message[];
  userPreferences: Record<string, any>;
  sessionData: Record<string, any>;
  metadata: Record<string, any>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ExecutionStep {
  id: string;
  type: 'thinking' | 'tool-call' | 'response' | 'workflow';
  timestamp: Date;
  content: string;
  toolUsed?: string;
  toolInput?: any;
  toolOutput?: any;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ExecutionResult {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: ExecutionStep[];
  finalResponse: string;
  context: AgentContext;
  startTime: Date;
  endTime?: Date;
  totalCost: number;
  tokensUsed: number;
  error?: string;
}

export abstract class Agent {
  protected config: AgentConfig;
  protected context: AgentContext;
  protected tools: Map<string, any> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
    this.context = {
      conversationHistory: [],
      userPreferences: {},
      sessionData: {},
      metadata: {}
    };
  }

  /**
   * Abstract method for agent execution - must be implemented by subclasses
   */
  abstract execute(input: string, context?: Partial<AgentContext>): Promise<ExecutionResult>;

  /**
   * Register a tool with this agent
   */
  registerTool(name: string, tool: any): void {
    this.tools.set(name, tool);
  }

  /**
   * Get registered tool
   */
  getTool(name: string): any {
    return this.tools.get(name);
  }

  /**
   * Update agent context
   */
  updateContext(newContext: Partial<AgentContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Add message to conversation history
   */
  addMessage(message: Message): void {
    this.context.conversationHistory.push(message);
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get current context
   */
  getContext(): AgentContext {
    return { ...this.context };
  }

  /**
   * Reset agent context
   */
  resetContext(): void {
    this.context = {
      conversationHistory: [],
      userPreferences: {},
      sessionData: {},
      metadata: {}
    };
  }

  /**
   * Create execution step
   */
  protected createStep(
    type: ExecutionStep['type'],
    content: string,
    metadata?: Partial<ExecutionStep>
  ): ExecutionStep {
    return {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      content,
      status: 'pending',
      duration: 0,
      ...metadata
    };
  }

  /**
   * Execute a tool and return result
   */
  protected async executeTool(
    toolName: string,
    input: any,
    step: ExecutionStep
  ): Promise<any> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    step.status = 'running';
    step.toolUsed = toolName;
    step.toolInput = input;

    const startTime = Date.now();
    
    try {
      const result = await tool.execute(input);
      step.toolOutput = result;
      step.status = 'completed';
      step.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      step.status = 'failed';
      step.duration = Date.now() - startTime;
      step.content += ` - Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }
  }
}