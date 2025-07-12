/**
 * ADK Agent Registry - Central agent management
 * Replaces the old AgentManager with ADK patterns
 */

import { Agent, AgentConfig, AgentContext, ExecutionResult } from './core/Agent';
import { SequentialAgent, WorkflowStep } from './agents/SequentialAgent';
import { WebSearchTool } from './tools/WebSearchTool';
import { ADKEmailTool } from './tools/EmailTool';

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private tools: Map<string, any> = new Map();
  private templates: AgentTemplate[] = [];

  constructor() {
    this.initializeTools();
    this.initializeTemplates();
    console.log('🤖 ADK Agent Registry initialized');
  }

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    // Register ADK tools
    const webSearchTool = new WebSearchTool();
    const emailTool = new ADKEmailTool();

    this.tools.set('web-search', webSearchTool);
    this.tools.set('email-sender', emailTool);

    console.log(`🔧 Registered ${this.tools.size} ADK tools`);
  }

  /**
   * Initialize agent templates
   */
  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'research-assistant',
        name: 'Research Assistant',
        description: 'Specialized in web research and report generation',
        category: 'research',
        systemPrompt: 'You are a professional research assistant. You search the web for information and provide comprehensive reports.',
        tools: ['web-search', 'email-sender'],
        workflow: [
          {
            name: 'analyze-request',
            type: 'thinking',
            processor: (input, steps, context) => ({
              needsWebSearch: this.detectWebSearchNeed(input),
              emailRecipient: ADKEmailTool.extractEmailFromText(input),
              searchQuery: this.extractSearchQuery(input)
            })
          },
          {
            name: 'web-search',
            type: 'tool',
            toolName: 'web-search',
            toolInputMapper: (input, context) => ({
              query: this.extractSearchQuery(input),
              maxResults: 5
            }),
            contextUpdater: (result, context) => ({
              sessionData: {
                ...context.sessionData,
                searchResults: result.data?.results || []
              }
            })
          },
          {
            name: 'send-report',
            type: 'conditional',
            condition: (input, steps, context) => {
              return !!ADKEmailTool.extractEmailFromText(input);
            }
          }
        ],
        model: 'gemini-2.0-flash-exp',
        temperature: 0.3,
        maxTokens: 4000
      },
      {
        id: 'general-assistant',
        name: 'General Assistant',
        description: 'Versatile assistant for various tasks',
        category: 'general',
        systemPrompt: 'You are a helpful AI assistant capable of various tasks including research and communication.',
        tools: ['web-search', 'email-sender'],
        workflow: [
          {
            name: 'analyze-task',
            type: 'thinking',
            processor: (input, steps, context) => ({
              taskType: this.detectTaskType(input),
              requiredTools: this.detectRequiredTools(input)
            })
          }
        ],
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxTokens: 4000
      }
    ];

    console.log(`📋 Loaded ${this.templates.size} agent templates`);
  }

  /**
   * Create a new agent
   */
  async createAgent(
    userId: string,
    config: Partial<AgentConfig>,
    templateId?: string
  ): Promise<Agent> {
    let agentConfig: AgentConfig;

    if (templateId) {
      const template = this.templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      agentConfig = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || template.name,
        description: config.description || template.description,
        systemPrompt: config.systemPrompt || template.systemPrompt,
        model: config.model || template.model,
        temperature: config.temperature ?? template.temperature,
        maxTokens: config.maxTokens || template.maxTokens,
        tools: config.tools || template.tools,
        userId
      };
    } else {
      agentConfig = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || 'Custom Agent',
        description: config.description || 'Custom AI agent',
        systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
        model: config.model || 'gemini-2.0-flash-exp',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens || 4000,
        tools: config.tools || [],
        userId
      };
    }

    // Create agent instance (currently only Sequential agents)
    const agent = new SequentialAgent(agentConfig);

    // Register tools with the agent
    for (const toolName of agentConfig.tools) {
      const tool = this.tools.get(toolName);
      if (tool) {
        agent.registerTool(toolName, tool);
      }
    }

    // Set workflow if template has one
    if (templateId) {
      const template = this.templates.find(t => t.id === templateId);
      if (template?.workflow) {
        agent.defineWorkflow(template.workflow);
      }
    }

    // Store agent
    this.agents.set(agentConfig.id, agent);

    console.log(`✅ Created ADK agent: ${agentConfig.name} (${agentConfig.id})`);
    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents for a user
   */
  getUserAgents(userId: string): Agent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.getConfig().userId === userId);
  }

  /**
   * Execute agent task
   */
  async executeAgentTask(
    agentId: string,
    taskDescription: string,
    context?: Partial<AgentContext>
  ): Promise<ExecutionResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    console.log(`🚀 Executing ADK agent task: ${agent.getConfig().name}`);
    
    return await agent.execute(taskDescription, context);
  }

  /**
   * Delete agent
   */
  deleteAgent(agentId: string, userId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    if (agent.getConfig().userId !== userId) {
      throw new Error('Unauthorized: Cannot delete agent owned by another user');
    }

    this.agents.delete(agentId);
    console.log(`🗑️ Deleted ADK agent: ${agentId}`);
    return true;
  }

  /**
   * Get available templates
   */
  getTemplates(): AgentTemplate[] {
    return [...this.templates];
  }

  /**
   * Get available tools
   */
  getTools(): Array<{ name: string; description: string; category: string }> {
    return Array.from(this.tools.values()).map(tool => {
      const config = tool.getConfig();
      return {
        name: config.name,
        description: config.description,
        category: config.category
      };
    });
  }

  /**
   * Helper: Detect if web search is needed
   */
  private detectWebSearchNeed(input: string): boolean {
    const searchIndicators = [
      'research', 'find', 'search', 'look up', 'investigate',
      'latest', 'current', 'recent', 'news', 'update'
    ];
    const lowerInput = input.toLowerCase();
    return searchIndicators.some(indicator => lowerInput.includes(indicator));
  }

  /**
   * Helper: Extract search query from input
   */
  private extractSearchQuery(input: string): string {
    // Remove email and action words to create clean search query
    let query = input
      .replace(/send.*?to.*?@.*?\.(com|org|net|edu)/gi, '')
      .replace(/email|send|mail/gi, '')
      .replace(/research|find|search|look up|investigate/gi, '')
      .trim();

    if (query.length < 10) {
      query = input;
    }

    return query.substring(0, 100);
  }

  /**
   * Helper: Detect task type
   */
  private detectTaskType(input: string): string {
    if (this.detectWebSearchNeed(input)) return 'research';
    if (ADKEmailTool.extractEmailFromText(input)) return 'communication';
    return 'general';
  }

  /**
   * Helper: Detect required tools
   */
  private detectRequiredTools(input: string): string[] {
    const tools: string[] = [];
    
    if (this.detectWebSearchNeed(input)) {
      tools.push('web-search');
    }
    
    if (ADKEmailTool.extractEmailFromText(input)) {
      tools.push('email-sender');
    }
    
    return tools;
  }
}

// Agent template interface
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  tools: string[];
  workflow?: WorkflowStep[];
  model: string;
  temperature: number;
  maxTokens: number;
}

// Create singleton instance
export const adkAgentRegistry = new AgentRegistry();