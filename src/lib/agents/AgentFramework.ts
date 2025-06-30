import { getModelRouter } from '../model-router';
import { contextManager } from '../context/AdvancedContextManager';
import { GenerateRequest } from '../providers/base';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  type: 'search' | 'analysis' | 'creation' | 'automation' | 'communication' | 'data';
  parameters: Record<string, any>;
  requiredModels?: string[];
  costPerExecution?: number;
}

export interface AgentPersonality {
  name: string;
  description: string;
  communicationStyle: 'formal' | 'casual' | 'technical' | 'creative' | 'analytical';
  expertise: string[];
  constraints: string[];
  systemPrompt: string;
}

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  description: string;
  personality: AgentPersonality;
  capabilities: AgentCapability[];
  preferredModel: string;
  fallbackModel: string;
  maxTokensPerTask: number;
  maxCostPerDay: number;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  totalExecutions: number;
  totalCost: number;
}

export interface AgentTask {
  id: string;
  agentId: string;
  userId: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  cost?: number;
  model?: string;
  executionLog: AgentExecutionStep[];
}

export interface AgentExecutionStep {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  success: boolean;
  cost?: number;
  duration?: number;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  conversationId: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AgentFramework {
  private modelRouter = getModelRouter();
  private activeAgents: Map<string, AgentConfig> = new Map();
  private runningTasks: Map<string, AgentTask> = new Map();
  private taskQueue: AgentTask[] = [];
  private readonly MAX_CONCURRENT_TASKS = 5;

  /**
   * Create a new AI agent
   */
  async createAgent(
    userId: string,
    config: Omit<AgentConfig, 'id' | 'userId' | 'createdAt' | 'totalExecutions' | 'totalCost'>
  ): Promise<AgentConfig> {
    const agent: AgentConfig = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: new Date(),
      totalExecutions: 0,
      totalCost: 0,
      ...config
    };

    this.activeAgents.set(agent.id, agent);
    await this.persistAgent(agent);

    console.log(`🤖 Created agent: ${agent.name} (${agent.id})`);
    return agent;
  }

  /**
   * Execute a task with a specific agent
   */
  async executeTask(
    agentId: string,
    taskDescription: string,
    input: any,
    priority: AgentTask['priority'] = 'medium'
  ): Promise<AgentTask> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.isActive) {
      throw new Error(`Agent ${agent.name} is not active`);
    }

    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      userId: agent.userId,
      description: taskDescription,
      priority,
      status: 'pending',
      input,
      executionLog: [],
    };

    // Add to queue based on priority
    this.addToQueue(task);
    await this.processTaskQueue();

    return task;
  }

  /**
   * Process the task queue
   */
  private async processTaskQueue(): Promise<void> {
    if (this.runningTasks.size >= this.MAX_CONCURRENT_TASKS) {
      return;
    }

    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const nextTask = this.taskQueue.shift();
    if (!nextTask) {
      return;
    }

    this.runTask(nextTask).catch(error => {
      console.error('Task execution error:', error);
      nextTask.status = 'failed';
      nextTask.error = error.message;
    });
  }

  /**
   * Run a specific task
   */
  private async runTask(task: AgentTask): Promise<void> {
    const agent = this.activeAgents.get(task.agentId);
    if (!agent) {
      throw new Error(`Agent ${task.agentId} not found`);
    }

    task.status = 'in_progress';
    task.startTime = new Date();
    this.runningTasks.set(task.id, task);

    try {
      // Log start
      this.addExecutionStep(task, 'task_started', `Starting task: ${task.description}`, true);

      // Check daily cost limit
      if (agent.totalCost >= agent.maxCostPerDay) {
        throw new Error('Daily cost limit exceeded');
      }

      // Create agent context
      const agentContext = await this.createAgentContext(agent, task);

      // Execute the task with the agent's capabilities
      const result = await this.executeAgentTask(agent, task, agentContext);

      task.output = result;
      task.status = 'completed';
      task.endTime = new Date();

      // Update agent statistics
      agent.totalExecutions++;
      agent.lastUsed = new Date();

      this.addExecutionStep(task, 'task_completed', 'Task completed successfully', true);

    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.endTime = new Date();
      
      this.addExecutionStep(task, 'task_failed', error.message, false);
    } finally {
      this.runningTasks.delete(task.id);
      await this.persistTask(task);
      await this.persistAgent(agent);

      // Process next task in queue
      this.processTaskQueue();
    }
  }

  /**
   * Execute the actual agent task
   */
  private async executeAgentTask(
    agent: AgentConfig,
    task: AgentTask,
    context: string
  ): Promise<any> {
    // Build the agent's system prompt
    const systemPrompt = this.buildAgentPrompt(agent, task, context);

    // Prepare the request
    const request: GenerateRequest = {
      model: agent.preferredModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.formatTaskInput(task) }
      ],
      userId: agent.userId,
      temperature: this.getAgentTemperature(agent.personality.communicationStyle),
      maxTokens: agent.maxTokensPerTask
    };

    let response;
    try {
      response = await this.modelRouter.generateText(request);
    } catch (error) {
      // Try fallback model
      console.log(`Fallback to ${agent.fallbackModel} for agent ${agent.name}`);
      request.model = agent.fallbackModel;
      response = await this.modelRouter.generateText(request);
    }

    // Log execution step
    const cost = await this.modelRouter.estimateCost(request);
    task.cost = (task.cost || 0) + cost;
    agent.totalCost += cost;

    this.addExecutionStep(
      task, 
      'model_execution', 
      `Generated response using ${response.model}`, 
      true, 
      cost
    );

    // Process the response based on agent capabilities
    return this.processAgentResponse(agent, task, response.content);
  }

  /**
   * Build agent-specific prompt
   */
  private buildAgentPrompt(agent: AgentConfig, task: AgentTask, context: string): string {
    let prompt = `${agent.personality.systemPrompt}\n\n`;
    
    prompt += `**Agent Identity:**\n`;
    prompt += `Name: ${agent.personality.name}\n`;
    prompt += `Expertise: ${agent.personality.expertise.join(', ')}\n`;
    prompt += `Communication Style: ${agent.personality.communicationStyle}\n\n`;

    prompt += `**Available Capabilities:**\n`;
    agent.capabilities.forEach(cap => {
      prompt += `- ${cap.name}: ${cap.description}\n`;
    });

    prompt += `\n**Constraints:**\n`;
    agent.personality.constraints.forEach(constraint => {
      prompt += `- ${constraint}\n`;
    });

    prompt += `\n**Context:**\n${context}\n\n`;
    prompt += `**Task:** ${task.description}\n\n`;
    prompt += `Provide a detailed response that accomplishes the task using your available capabilities.`;

    return prompt;
  }

  /**
   * Create context for the agent
   */
  private async createAgentContext(agent: AgentConfig, task: AgentTask): Promise<string> {
    // Get user's conversation context for personalization
    const userContexts = await contextManager.getUserContexts(agent.userId);
    const recentContext = userContexts.slice(0, 3);

    let context = `**User Context:**\n`;
    if (recentContext.length > 0) {
      context += `Recent conversations: ${recentContext.map(c => c.title).join(', ')}\n`;
    }

    context += `\n**Agent History:**\n`;
    context += `Total executions: ${agent.totalExecutions}\n`;
    context += `Last used: ${agent.lastUsed?.toISOString() || 'Never'}\n`;

    return context;
  }

  /**
   * Format task input for the model
   */
  private formatTaskInput(task: AgentTask): string {
    if (typeof task.input === 'string') {
      return task.input;
    }
    return JSON.stringify(task.input, null, 2);
  }

  /**
   * Process agent response based on capabilities
   */
  private processAgentResponse(agent: AgentConfig, task: AgentTask, response: string): any {
    // For now, return the raw response
    // In the future, this could involve:
    // - Parsing structured outputs
    // - Executing specific capabilities
    // - Formatting results based on task type
    
    return {
      response,
      agent: agent.name,
      capabilities_used: agent.capabilities.map(c => c.name),
      execution_time: task.endTime && task.startTime 
        ? task.endTime.getTime() - task.startTime.getTime() 
        : 0
    };
  }

  /**
   * Get temperature based on communication style
   */
  private getAgentTemperature(style: AgentPersonality['communicationStyle']): number {
    switch (style) {
      case 'creative': return 0.9;
      case 'casual': return 0.7;
      case 'formal': return 0.3;
      case 'technical': return 0.2;
      case 'analytical': return 0.1;
      default: return 0.5;
    }
  }

  /**
   * Add execution step to task log
   */
  private addExecutionStep(
    task: AgentTask,
    action: string,
    details: string,
    success: boolean,
    cost?: number,
    duration?: number
  ): void {
    const step: AgentExecutionStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      action,
      details,
      success,
      cost,
      duration
    };

    task.executionLog.push(step);
  }

  /**
   * Add task to queue based on priority
   */
  private addToQueue(task: AgentTask): void {
    this.taskQueue.push(task);
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentConfig | null> {
    return this.activeAgents.get(agentId) || null;
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId: string): Promise<AgentConfig[]> {
    return Array.from(this.activeAgents.values()).filter(agent => agent.userId === userId);
  }

  /**
   * Get task status
   */
  async getTask(taskId: string): Promise<AgentTask | null> {
    return this.runningTasks.get(taskId) || null;
  }

  /**
   * Update agent configuration
   */
  async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const updatedAgent = { ...agent, ...updates };
    this.activeAgents.set(agentId, updatedAgent);
    await this.persistAgent(updatedAgent);

    return updatedAgent;
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<void> {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.isActive = false;
      await this.persistAgent(agent);
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageCost: number;
    averageExecutionTime: number;
    totalCost: number;
  }> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // TODO: Implement metrics calculation from stored tasks
    return {
      totalExecutions: agent.totalExecutions,
      successRate: 0.95, // Placeholder
      averageCost: agent.totalCost / Math.max(agent.totalExecutions, 1),
      averageExecutionTime: 5000, // Placeholder
      totalCost: agent.totalCost
    };
  }

  /**
   * Persistence methods (implement with your database)
   */
  private async persistAgent(agent: AgentConfig): Promise<void> {
    console.log('💾 Persisting agent:', agent.name);
    // TODO: Store in database
  }

  private async persistTask(task: AgentTask): Promise<void> {
    console.log('💾 Persisting task:', task.id);
    // TODO: Store in database
  }
}

// Predefined agent templates
export const AGENT_TEMPLATES: Partial<AgentConfig>[] = [
  {
    name: 'Research Assistant',
    description: 'Helps with research tasks, data analysis, and information gathering',
    personality: {
      name: 'Research Assistant',
      description: 'Analytical and thorough research specialist',
      communicationStyle: 'analytical',
      expertise: ['research', 'data analysis', 'fact-checking', 'synthesis'],
      constraints: ['Verify information from multiple sources', 'Cite sources when possible'],
      systemPrompt: 'You are a meticulous research assistant. Provide detailed, well-sourced information and always fact-check your responses.'
    },
    capabilities: [
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the internet for current information',
        type: 'search',
        parameters: {}
      },
      {
        id: 'data_analysis',
        name: 'Data Analysis',
        description: 'Analyze datasets and generate insights',
        type: 'analysis',
        parameters: {}
      }
    ],
    preferredModel: 'gpt-4o',
    fallbackModel: 'claude-3.5-sonnet',
    maxTokensPerTask: 4000,
    maxCostPerDay: 5.0,
    isActive: true
  },
  {
    name: 'Creative Writer',
    description: 'Assists with creative writing, storytelling, and content creation',
    personality: {
      name: 'Creative Writer',
      description: 'Imaginative and expressive creative writing specialist',
      communicationStyle: 'creative',
      expertise: ['storytelling', 'poetry', 'creative writing', 'character development'],
      constraints: ['Maintain originality', 'Respect creative boundaries'],
      systemPrompt: 'You are a creative writing assistant. Help users craft compelling stories, develop characters, and express ideas creatively.'
    },
    capabilities: [
      {
        id: 'story_generation',
        name: 'Story Generation',
        description: 'Create original stories and narratives',
        type: 'creation',
        parameters: {}
      },
      {
        id: 'character_development',
        name: 'Character Development',
        description: 'Develop detailed character profiles and arcs',
        type: 'creation',
        parameters: {}
      }
    ],
    preferredModel: 'claude-3.5-sonnet',
    fallbackModel: 'gpt-4o',
    maxTokensPerTask: 6000,
    maxCostPerDay: 3.0,
    isActive: true
  },
  {
    name: 'Code Reviewer',
    description: 'Reviews code, suggests improvements, and helps with debugging',
    personality: {
      name: 'Code Reviewer',
      description: 'Technical expert focused on code quality and best practices',
      communicationStyle: 'technical',
      expertise: ['programming', 'code review', 'debugging', 'best practices'],
      constraints: ['Follow security best practices', 'Suggest modern, maintainable solutions'],
      systemPrompt: 'You are a senior software engineer specializing in code review. Provide constructive feedback, identify potential issues, and suggest improvements.'
    },
    capabilities: [
      {
        id: 'code_analysis',
        name: 'Code Analysis',
        description: 'Analyze code for bugs, performance, and best practices',
        type: 'analysis',
        parameters: {}
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Generate documentation and comments for code',
        type: 'creation',
        parameters: {}
      }
    ],
    preferredModel: 'gpt-4o',
    fallbackModel: 'claude-3.5-sonnet',
    maxTokensPerTask: 5000,
    maxCostPerDay: 4.0,
    isActive: true
  }
];

// Singleton instance
export const agentFramework = new AgentFramework(); 