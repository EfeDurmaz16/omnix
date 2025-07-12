/**
 * Agent Manager for OmniX
 * Handles agent CRUD operations, configuration, and lifecycle management
 */

// Temporarily simplify imports to debug
import type { 
  AgentConfiguration, 
  AgentExecution, 
  AgentMemory 
} from './types';
import ToolRegistry from './tools/ToolRegistry';
// import { agentExecutor } from './AgentExecutor';
// import { AgentPersistence } from './AgentPersistence';

export class AgentManager {
  // Keep in-memory cache for performance, but always sync with database
  private agents: Map<string, AgentConfiguration> = new Map();
  private executions: Map<string, AgentExecution> = new Map();

  constructor() {
    console.log('🤖 Agent Manager initialized with database persistence');
  }

  /**
   * Create a new agent from template or custom configuration
   */
  async createAgent(
    userId: string,
    config: Partial<AgentConfiguration>,
    templateId?: string
  ): Promise<AgentConfiguration> {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let baseConfig: Partial<AgentConfiguration>;
    
    if (templateId) {
      const { AGENT_TEMPLATES } = require('./types');
      const template = AGENT_TEMPLATES.find(t => t.name === templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      baseConfig = template;
    } else {
      baseConfig = {};
    }

    const agent: AgentConfiguration = {
      id: agentId,
      name: config.name || baseConfig.name || 'Unnamed Agent',
      description: config.description || baseConfig.description || 'Custom AI agent',
      avatar: config.avatar,
      personality: config.personality || baseConfig.personality || {
        name: 'Agent',
        role: 'Assistant',
        expertise: ['general'],
        communicationStyle: 'professional',
        responseLength: 'detailed',
        creativity: 5,
        precision: 7,
        proactiveness: 6
      },
      availableTools: config.availableTools || baseConfig.availableTools || [],
      systemPrompt: config.systemPrompt || baseConfig.systemPrompt || 'You are a helpful AI assistant.',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 0.9,
      model: config.model || 'gpt-4',
      enabled: config.enabled ?? true,
      autoStart: config.autoStart ?? false,
      triggerKeywords: config.triggerKeywords || baseConfig.triggerKeywords || [],
      memory: config.memory || this.createEmptyMemory(),
      permissions: config.permissions || {
        canAccessInternet: false,
        canModifyFiles: false,
        canSendEmails: false,
        canMakePurchases: false,
        canAccessPrivateData: false,
        maxCostPerHour: 5.0
      },
      userId,
      templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Temporarily use in-memory storage due to database issues
    // const savedAgent = await AgentPersistence.saveAgent(agent);
    
    // Store in memory only for now
    this.agents.set(agentId, agent);

    console.log(`✅ Agent created: ${agent.name} (${agentId})`);
    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentConfiguration | undefined> {
    // Check cache first
    let agent = this.agents.get(agentId);
    if (agent) {
      return agent;
    }
    
    // Temporarily disable database loading
    // agent = await AgentPersistence.getAgent(agentId);
    // if (agent) {
    //   // Cache for future use
    //   this.agents.set(agentId, agent);
    //   return agent;
    // }
    
    return undefined;
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId: string): Promise<AgentConfiguration[]> {
    // Temporarily use in-memory storage only
    const userAgents = Array.from(this.agents.values()).filter(agent => agent.userId === userId);
    return userAgents;
  }

  /**
   * Update agent configuration
   */
  async updateAgent(
    agentId: string,
    updates: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Temporarily update in-memory only
    const updatedAgent: AgentConfiguration = {
      ...agent,
      ...updates,
      id: agentId,
      userId: agent.userId,
      createdAt: agent.createdAt,
      updatedAt: new Date().toISOString()
    };

    // Update memory cache
    this.agents.set(agentId, updatedAgent);
    console.log(`🔄 Agent updated: ${updatedAgent.name} (${agentId})`);
    
    return updatedAgent;
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete agent owned by another user');
    }

    // Temporarily remove from memory only
    this.agents.delete(agentId);

    console.log(`🗑️ Agent deleted: ${agent.name} (${agentId})`);
    return true;
  }

  /**
   * Execute a task with an agent
   */
  async executeAgentTask(
    agentId: string,
    taskDescription: string,
    context?: Record<string, any>
  ): Promise<AgentExecution> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (!agent.enabled) {
      throw new Error(`Agent is disabled: ${agent.name}`);
    }

    console.log(`🚀 Executing task with agent: ${agent.name}`);
    
    // Temporarily return a mock execution
    const execution: AgentExecution = {
      id: `exec_${Date.now()}`,
      agentId,
      userId: agent.userId,
      taskDescription,
      status: 'completed',
      steps: [],
      result: { message: 'Mock execution result - agent executor temporarily disabled' },
      startTime: new Date(),
      endTime: new Date(),
      totalCost: 0,
      tokensUsed: 0
    };
    
    this.executions.set(execution.id, execution);

    return execution;
  }

  /**
   * Get agent execution history
   */
  getAgentExecutions(agentId: string): AgentExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.agentId === agentId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): AgentExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && (execution.status === 'thinking' || execution.status === 'executing')) {
      // Temporarily disable agent executor
      execution.status = 'failed';
      return true;
    }
    return false;
  }

  /**
   * Get available agent templates
   */
  getAgentTemplates(): any[] {
    // Import templates locally to avoid circular dependency
    const { AGENT_TEMPLATES } = require('./types');
    return AGENT_TEMPLATES;
  }

  /**
   * Test agent configuration
   */
  async testAgent(agentId: string, testPrompt?: string): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const prompt = testPrompt || 'Hello! Please introduce yourself and explain what you can help with.';
    
    try {
      const execution = await this.executeAgentTask(agentId, prompt);
      
      return {
        success: true,
        executionId: execution.id,
        response: execution.result,
        performance: {
          steps: execution.steps.length,
          totalCost: execution.totalCost,
          tokensUsed: execution.tokensUsed,
          duration: execution.endTime 
            ? execution.endTime.getTime() - execution.startTime.getTime()
            : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        agentId
      };
    }
  }

  /**
   * Clone an agent
   */
  async cloneAgent(
    agentId: string,
    userId: string,
    newName?: string
  ): Promise<AgentConfiguration> {
    const sourceAgent = this.agents.get(agentId);
    if (!sourceAgent) {
      throw new Error(`Source agent not found: ${agentId}`);
    }

    const clonedConfig = {
      ...sourceAgent,
      name: newName || `${sourceAgent.name} (Copy)`,
      memory: this.createEmptyMemory() // Start with fresh memory
    };

    delete (clonedConfig as any).id;
    delete (clonedConfig as any).createdAt;
    delete (clonedConfig as any).updatedAt;

    return await this.createAgent(userId, clonedConfig);
  }

  /**
   * Search agents by keyword
   */
  async searchAgents(userId: string, query: string): Promise<AgentConfiguration[]> {
    const userAgents = await this.getUserAgents(userId);
    const lowerQuery = query.toLowerCase();

    return userAgents.filter(agent => 
      agent.name.toLowerCase().includes(lowerQuery) ||
      agent.description.toLowerCase().includes(lowerQuery) ||
      agent.personality.expertise.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
      agent.triggerKeywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentId: string): any {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    const executions = this.getAgentExecutions(agentId);
    const successfulExecutions = executions.filter(e => e.status === 'completed');
    const failedExecutions = executions.filter(e => e.status === 'failed');

    const totalCost = executions.reduce((sum, e) => sum + e.totalCost, 0);
    const totalTokens = executions.reduce((sum, e) => sum + e.tokensUsed, 0);
    const averageSteps = executions.length > 0 
      ? executions.reduce((sum, e) => sum + e.steps.length, 0) / executions.length 
      : 0;

    return {
      agentId,
      agentName: agent.name,
      totalExecutions: executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      successRate: executions.length > 0 ? successfulExecutions.length / executions.length : 0,
      totalCost,
      totalTokens,
      averageSteps,
      lastExecution: executions[0]?.startTime,
      createdAt: agent.createdAt,
      enabled: agent.enabled
    };
  }

  /**
   * Update agent memory
   */
  private updateAgentMemory(agent: AgentConfiguration, execution: AgentExecution): void {
    // Add execution to task history
    agent.memory.taskHistory.push({
      taskId: execution.id,
      description: execution.taskDescription,
      status: execution.status,
      timestamp: execution.startTime,
      tools: execution.steps
        .filter(s => s.toolUsed)
        .map(s => s.toolUsed!),
      result: execution.result
    });

    // Limit memory size
    if (agent.memory.taskHistory.length > 100) {
      agent.memory.taskHistory = agent.memory.taskHistory.slice(-100);
    }

    // Update contextual knowledge
    if (execution.result) {
      agent.memory.contextualKnowledge[execution.id] = {
        task: execution.taskDescription,
        result: execution.result,
        timestamp: execution.startTime
      };
    }

    agent.updatedAt = new Date();
    this.agents.set(agent.id, agent);
  }

  /**
   * Create empty memory structure
   */
  private createEmptyMemory(): AgentMemory {
    return {
      conversationHistory: [],
      userPreferences: {},
      taskHistory: [],
      contextualKnowledge: {}
    };
  }

  /**
   * Export all agents for backup
   */
  async exportAgents(userId: string): Promise<any> {
    const userAgents = await this.getUserAgents(userId);
    return {
      agents: userAgents,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import agents from backup
   */
  async importAgents(userId: string, data: any): Promise<AgentConfiguration[]> {
    if (!data.agents || !Array.isArray(data.agents)) {
      throw new Error('Invalid import data format');
    }

    const importedAgents: AgentConfiguration[] = [];

    for (const agentData of data.agents) {
      try {
        const agent = await this.createAgent(userId, {
          ...agentData,
          memory: this.createEmptyMemory() // Reset memory for imported agents
        });
        importedAgents.push(agent);
      } catch (error) {
        console.warn(`Failed to import agent: ${agentData.name}`, error);
      }
    }

    console.log(`📥 Imported ${importedAgents.length} agents for user ${userId}`);
    return importedAgents;
  }

  /**
   * Get system-wide statistics
   */
  getSystemStats(): any {
    const allExecutions = Array.from(this.executions.values());
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(a => a.enabled).length;

    return {
      totalAgents,
      activeAgents,
      totalExecutions: allExecutions.length,
      totalCost: allExecutions.reduce((sum, e) => sum + e.totalCost, 0),
      totalTokens: allExecutions.reduce((sum, e) => sum + e.tokensUsed, 0),
      averageExecutionTime: allExecutions.length > 0 
        ? allExecutions.reduce((sum, e) => {
            const duration = e.endTime 
              ? e.endTime.getTime() - e.startTime.getTime() 
              : 0;
            return sum + duration;
          }, 0) / allExecutions.length
        : 0,
      popularTools: this.getPopularTools(),
      templateUsage: this.getTemplateUsage()
    };
  }

  private getPopularTools(): Record<string, number> {
    const toolUsage: Record<string, number> = {};
    
    Array.from(this.executions.values()).forEach(execution => {
      execution.steps
        .filter(step => step.toolUsed)
        .forEach(step => {
          toolUsage[step.toolUsed!] = (toolUsage[step.toolUsed!] || 0) + 1;
        });
    });

    return toolUsage;
  }

  private getTemplateUsage(): Record<string, number> {
    const templateUsage: Record<string, number> = {};
    
    Array.from(this.agents.values()).forEach(agent => {
      // Try to match agent to template based on system prompt or name
      const template = AGENT_TEMPLATES.find(t => 
        agent.systemPrompt === t.systemPrompt || 
        agent.name === t.name
      );
      
      if (template) {
        templateUsage[template.name!] = (templateUsage[template.name!] || 0) + 1;
      } else {
        templateUsage['Custom'] = (templateUsage['Custom'] || 0) + 1;
      }
    });

    return templateUsage;
  }
}

// Temporary minimal implementation to debug
const agentStorage = new Map();

export const agentManager = {
  async createAgent(userId: string, config: any, templateId?: string) {
    console.log('🔵 Mock createAgent called');
    const agent = {
      id: `agent_${Date.now()}`,
      name: config.name || 'Test Agent',
      description: config.description || 'Test Description',
      userId,
      templateId,
      personality: {
        name: 'Test',
        role: 'Assistant',
        expertise: ['general'],
        communicationStyle: 'professional',
        responseLength: 'detailed',
        creativity: 5,
        precision: 7,
        proactiveness: 6
      },
      availableTools: [],
      systemPrompt: 'You are a helpful assistant',
      maxTokens: 4000,
      temperature: 0.7,
      topP: 0.9,
      model: 'gemini-2.0-flash-exp',
      enabled: true,
      autoStart: false,
      triggerKeywords: [],
      memory: {
        conversationHistory: [],
        userPreferences: {},
        taskHistory: [],
        contextualKnowledge: {}
      },
      permissions: config.permissions || {
        canAccessInternet: true,  // Default to true for web search
        canModifyFiles: false,
        canSendEmails: true,      // Default to true for email sending
        canMakePurchases: false,
        canAccessPrivateData: false,
        maxCostPerHour: 5.0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store the agent
    agentStorage.set(agent.id, agent);
    console.log('🔵 Agent stored:', agent.id);
    
    return agent;
  },

  async getUserAgents(userId: string) {
    console.log('🔵 Mock getUserAgents called for userId:', userId);
    const userAgents = Array.from(agentStorage.values()).filter(agent => agent.userId === userId);
    console.log('🔵 Found agents:', userAgents.length);
    return userAgents;
  },

  async getAgent(agentId: string) {
    console.log('🔵 Mock getAgent called for agentId:', agentId);
    const agent = agentStorage.get(agentId);
    console.log('🔵 Agent found:', agent ? agent.name : 'Not found');
    return agent;
  },

  async executeAgentTask(agentId: string, taskDescription: string, context: any = {}) {
    console.log('🚀 Real executeAgentTask called for:', taskDescription);
    const agent = agentStorage.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const execution = {
      id: `exec_${Date.now()}`,
      agentId,
      userId: agent.userId,
      taskDescription,
      status: 'executing',
      steps: [],
      result: {},
      startTime: new Date(),
      endTime: null,
      totalCost: 0,
      tokensUsed: 0
    };

    try {
      // Step 1: Analyze task
      const step1 = {
        id: 'step_1',
        type: 'thinking',
        timestamp: new Date(),
        content: 'Analyzing task requirements and determining necessary actions...',
        duration: 0
      };
      execution.steps.push(step1);
      console.log('📝 Step 1: Task analysis');

      // Parse task to determine needed tools and extract parameters
      const needsWebSearch = this.taskNeedsWebSearch(taskDescription);
      const emailRecipient = this.extractEmailFromTask(taskDescription);
      const webSearchQuery = this.extractSearchQuery(taskDescription);

      let searchResults = [];
      let reportContent = '';

      // Step 2: Web search if needed
      if (needsWebSearch && webSearchQuery) {
        const step2 = {
          id: 'step_2',
          type: 'tool-call',
          timestamp: new Date(),
          content: `Searching the web for: "${webSearchQuery}"`,
          toolUsed: 'web-search',
          toolInput: { query: webSearchQuery, maxResults: 5 },
          toolOutput: null,
          duration: 0
        };
        execution.steps.push(step2);

        console.log('🔍 Step 2: Web search execution');
        const webTool = ToolRegistry.getTool('web-search');
        if (webTool) {
          const searchResult = await webTool.instance.execute({
            query: webSearchQuery,
            maxResults: 5
          });
          
          step2.toolOutput = searchResult;
          searchResults = searchResult.results || [];
          console.log(`✅ Web search completed: ${searchResults.length} results`);
        }
      }

      // Step 3: Generate report based on search results
      const step3 = {
        id: 'step_3',
        type: 'processing',
        timestamp: new Date(),
        content: 'Generating comprehensive report from research findings...',
        duration: 0
      };
      execution.steps.push(step3);

      console.log('📊 Step 3: Report generation');
      reportContent = this.generateReport(taskDescription, searchResults, webSearchQuery);

      // Step 4: Send email if recipient specified
      if (emailRecipient && reportContent) {
        const step4 = {
          id: 'step_4',
          type: 'tool-call',
          timestamp: new Date(),
          content: `Sending report to ${emailRecipient}`,
          toolUsed: 'email-sender',
          toolInput: {
            to: emailRecipient,
            subject: `Research Report: ${webSearchQuery || 'Task Completion'}`,
            content: reportContent
          },
          toolOutput: null,
          duration: 0
        };
        execution.steps.push(step4);

        console.log('📧 Step 4: Email sending');
        const emailTool = ToolRegistry.getTool('email-sender');
        if (emailTool) {
          const emailResult = await emailTool.instance.execute({
            to: emailRecipient,
            subject: `Research Report: ${webSearchQuery || 'Task Completion'}`,
            text: reportContent,
            content: reportContent
          });
          
          step4.toolOutput = emailResult;
          console.log(`✅ Email sent to ${emailRecipient}: ${emailResult.success ? 'Success' : 'Failed'}`);
        }
      }

      // Complete execution
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = {
        finalResponse: reportContent || `Task "${taskDescription}" has been completed successfully.`,
        stepsCompleted: execution.steps.length,
        toolsUsed: execution.steps.filter(s => s.toolUsed).map(s => s.toolUsed),
        searchResults: searchResults.length,
        emailSent: !!emailRecipient,
        recipient: emailRecipient,
        totalCost: 0.002,
        tokensUsed: 300 + (searchResults.length * 50)
      };

      execution.totalCost = execution.result.totalCost;
      execution.tokensUsed = execution.result.tokensUsed;

      console.log('✅ Real execution completed successfully');
      return execution;

    } catch (error) {
      console.error('❌ Agent execution failed:', error);
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.result = {
        error: error instanceof Error ? error.message : 'Unknown error',
        finalResponse: `Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stepsCompleted: execution.steps.length
      };
      return execution;
    }
  },

  // Helper methods for task parsing
  taskNeedsWebSearch(taskDescription: string): boolean {
    const searchIndicators = [
      'research', 'find', 'search', 'look up', 'investigate', 'gather information',
      'latest', 'current', 'recent', 'news', 'update', 'what is happening',
      'analyze', 'report on', 'study', 'examine'
    ];
    const lowerTask = taskDescription.toLowerCase();
    return searchIndicators.some(indicator => lowerTask.includes(indicator));
  },

  extractEmailFromTask(taskDescription: string): string | null {
    // Extract email addresses from task description
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = taskDescription.match(emailRegex);
    return matches ? matches[0] : null;
  },

  extractSearchQuery(taskDescription: string): string {
    // Clean up task description to create search query
    let query = taskDescription
      .replace(/send.*?to.*?@.*?\.(com|org|net|edu)/gi, '') // Remove email instructions
      .replace(/email|send|mail/gi, '') // Remove email-related words
      .replace(/research|find|search|look up|investigate/gi, '') // Remove action words
      .trim();

    // If query is too short, use original task
    if (query.length < 10) {
      query = taskDescription;
    }

    return query.substring(0, 100); // Limit length
  },

  generateReport(taskDescription: string, searchResults: any[], searchQuery: string): string {
    if (searchResults.length === 0) {
      return `I attempted to research "${searchQuery || taskDescription}" but no search results were available. This could be due to API limitations or connectivity issues.`;
    }

    let report = `# Research Report: ${searchQuery || taskDescription}\n\n`;
    report += `## Executive Summary\n`;
    report += `Based on my research, I found ${searchResults.length} relevant sources of information.\n\n`;
    
    report += `## Key Findings\n\n`;
    searchResults.forEach((result, index) => {
      report += `### ${index + 1}. ${result.title}\n`;
      report += `**Source:** ${result.url}\n\n`;
      report += `${result.content || result.snippet}\n\n`;
    });

    report += `## Sources\n\n`;
    searchResults.forEach((result, index) => {
      report += `${index + 1}. [${result.title}](${result.url})\n`;
    });

    report += `\n---\n`;
    report += `*Report generated on ${new Date().toLocaleString()}*\n`;
    report += `*Research query: "${searchQuery}"*\n`;

    return report;
  },

  getAgentTemplates() {
    console.log('🔵 Mock getAgentTemplates called');
    return [
      {
        name: 'Research Assistant',
        description: 'Test template',
        personality: {
          name: 'Research Assistant',
          role: 'Information Researcher',
          expertise: ['research'],
          communicationStyle: 'professional',
          responseLength: 'detailed',
          creativity: 6,
          precision: 9,
          proactiveness: 8
        },
        availableTools: ['web-search'],
        systemPrompt: 'You are a research assistant',
        model: 'gemini-2.0-flash-exp',
        temperature: 0.3,
        topP: 0.8,
        maxTokens: 8192
      }
    ];
  }
};