/**
 * Agent Manager for OmniX
 * Handles agent CRUD operations, configuration, and lifecycle management
 */

import { 
  AgentConfiguration, 
  AgentExecution, 
  AgentMemory,
  AGENT_TEMPLATES 
} from './types';
import { agentExecutor } from './AgentExecutor';
import { AgentPersistence } from './AgentPersistence';

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

    // Save to database first
    const savedAgent = await AgentPersistence.saveAgent(agent);
    
    // Cache in memory
    this.agents.set(agentId, savedAgent);

    console.log(`✅ Agent created: ${savedAgent.name} (${agentId})`);
    return savedAgent;
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
    
    // Load from database
    agent = await AgentPersistence.getAgent(agentId);
    if (agent) {
      // Cache for future use
      this.agents.set(agentId, agent);
      return agent;
    }
    
    return undefined;
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId: string): Promise<AgentConfiguration[]> {
    // Always load fresh from database to ensure consistency
    const agents = await AgentPersistence.getUserAgents(userId);
    
    // Update cache
    agents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
    
    return agents;
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

    const updatedAgent: AgentConfiguration = {
      ...agent,
      ...updates,
      id: agentId, // Ensure ID doesn't change
      userId: agent.userId, // Ensure ownership doesn't change
      createdAt: agent.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

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

    // Remove from maps
    this.agents.delete(agentId);
    
    const userAgentList = this.userAgents.get(userId) || [];
    const updatedList = userAgentList.filter(id => id !== agentId);
    this.userAgents.set(userId, updatedList);

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
    
    const execution = await agentExecutor.executeTask(agent, taskDescription, context);
    this.executions.set(execution.id, execution);

    // Update agent memory with execution
    this.updateAgentMemory(agent, execution);

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
      return agentExecutor.cancelExecution(executionId);
    }
    return false;
  }

  /**
   * Get available agent templates
   */
  getAgentTemplates(): typeof AGENT_TEMPLATES {
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
  searchAgents(userId: string, query: string): AgentConfiguration[] {
    const userAgents = this.getUserAgents(userId);
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
  exportAgents(userId: string): any {
    const userAgents = this.getUserAgents(userId);
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

// Singleton instance
export const agentManager = new AgentManager();