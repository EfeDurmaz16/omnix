/**
 * Agent Persistence Layer - Database operations for agents
 */

import { prisma } from '@/lib/db';
import { AgentConfiguration, AgentExecution } from './types';

export class AgentPersistence {
  
  /**
   * Save agent to database
   */
  static async saveAgent(agent: AgentConfiguration): Promise<AgentConfiguration> {
    try {
      const dbAgent = await prisma.agent.create({
        data: {
          id: agent.id,
          userId: agent.userId,
          name: agent.name,
          description: agent.description,
          avatar: agent.avatar,
          personality: agent.personality,
          availableTools: agent.availableTools,
          systemPrompt: agent.systemPrompt,
          maxTokens: agent.maxTokens,
          temperature: agent.temperature,
          topP: agent.topP,
          model: agent.model,
          enabled: agent.enabled,
          autoStart: agent.autoStart,
          triggerKeywords: agent.triggerKeywords,
          permissions: agent.permissions,
          templateId: agent.templateId
        }
      });
      
      console.log('💾 Agent saved to database:', dbAgent.id);
      return this.dbAgentToConfig(dbAgent);
    } catch (error) {
      console.error('❌ Failed to save agent to database:', error);
      throw error;
    }
  }

  /**
   * Get agent from database
   */
  static async getAgent(agentId: string): Promise<AgentConfiguration | null> {
    try {
      const dbAgent = await prisma.agent.findUnique({
        where: { id: agentId }
      });
      
      if (!dbAgent) {
        return null;
      }
      
      return this.dbAgentToConfig(dbAgent);
    } catch (error) {
      console.error('❌ Failed to get agent from database:', error);
      return null;
    }
  }

  /**
   * Get all agents for a user
   */
  static async getUserAgents(userId: string): Promise<AgentConfiguration[]> {
    try {
      const dbAgents = await prisma.agent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      
      return dbAgents.map(agent => this.dbAgentToConfig(agent));
    } catch (error) {
      console.error('❌ Failed to get user agents from database:', error);
      return [];
    }
  }

  /**
   * Update agent in database
   */
  static async updateAgent(agentId: string, updates: Partial<AgentConfiguration>): Promise<AgentConfiguration | null> {
    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
      if (updates.personality !== undefined) updateData.personality = updates.personality;
      if (updates.availableTools !== undefined) updateData.availableTools = updates.availableTools;
      if (updates.systemPrompt !== undefined) updateData.systemPrompt = updates.systemPrompt;
      if (updates.maxTokens !== undefined) updateData.maxTokens = updates.maxTokens;
      if (updates.temperature !== undefined) updateData.temperature = updates.temperature;
      if (updates.topP !== undefined) updateData.topP = updates.topP;
      if (updates.model !== undefined) updateData.model = updates.model;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.autoStart !== undefined) updateData.autoStart = updates.autoStart;
      if (updates.triggerKeywords !== undefined) updateData.triggerKeywords = updates.triggerKeywords;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
      
      const dbAgent = await prisma.agent.update({
        where: { id: agentId },
        data: updateData
      });
      
      console.log('💾 Agent updated in database:', dbAgent.id);
      return this.dbAgentToConfig(dbAgent);
    } catch (error) {
      console.error('❌ Failed to update agent in database:', error);
      return null;
    }
  }

  /**
   * Delete agent from database
   */
  static async deleteAgent(agentId: string): Promise<boolean> {
    try {
      await prisma.agent.delete({
        where: { id: agentId }
      });
      
      console.log('💾 Agent deleted from database:', agentId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete agent from database:', error);
      return false;
    }
  }

  /**
   * Save agent execution to database
   */
  static async saveExecution(execution: AgentExecution): Promise<AgentExecution> {
    try {
      const dbExecution = await prisma.agentExecution.create({
        data: {
          id: execution.id,
          agentId: execution.agentId,
          userId: execution.userId,
          status: execution.status as any,
          steps: execution.steps,
          totalCost: execution.totalCost,
          tokensUsed: execution.tokensUsed,
          result: execution.result,
          error: execution.error,
          startTime: execution.startTime,
          endTime: execution.endTime
        }
      });
      
      console.log('💾 Agent execution saved to database:', dbExecution.id);
      return this.dbExecutionToConfig(dbExecution);
    } catch (error) {
      console.error('❌ Failed to save execution to database:', error);
      throw error;
    }
  }

  /**
   * Update agent execution in database
   */
  static async updateExecution(executionId: string, updates: Partial<AgentExecution>): Promise<AgentExecution | null> {
    try {
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.steps !== undefined) updateData.steps = updates.steps;
      if (updates.totalCost !== undefined) updateData.totalCost = updates.totalCost;
      if (updates.tokensUsed !== undefined) updateData.tokensUsed = updates.tokensUsed;
      if (updates.result !== undefined) updateData.result = updates.result;
      if (updates.error !== undefined) updateData.error = updates.error;
      if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
      
      const dbExecution = await prisma.agentExecution.update({
        where: { id: executionId },
        data: updateData
      });
      
      return this.dbExecutionToConfig(dbExecution);
    } catch (error) {
      console.error('❌ Failed to update execution in database:', error);
      return null;
    }
  }

  /**
   * Convert database agent to AgentConfiguration
   */
  private static dbAgentToConfig(dbAgent: any): AgentConfiguration {
    return {
      id: dbAgent.id,
      name: dbAgent.name,
      description: dbAgent.description,
      avatar: dbAgent.avatar,
      personality: dbAgent.personality,
      availableTools: Array.isArray(dbAgent.availableTools) ? dbAgent.availableTools : [],
      systemPrompt: dbAgent.systemPrompt,
      maxTokens: dbAgent.maxTokens,
      temperature: dbAgent.temperature,
      topP: dbAgent.topP,
      model: dbAgent.model,
      enabled: dbAgent.enabled,
      autoStart: dbAgent.autoStart,
      triggerKeywords: Array.isArray(dbAgent.triggerKeywords) ? dbAgent.triggerKeywords : [],
      permissions: dbAgent.permissions,
      userId: dbAgent.userId,
      templateId: dbAgent.templateId,
      createdAt: dbAgent.createdAt.toISOString(),
      updatedAt: dbAgent.updatedAt.toISOString()
    };
  }

  /**
   * Convert database execution to AgentExecution
   */
  private static dbExecutionToConfig(dbExecution: any): AgentExecution {
    return {
      id: dbExecution.id,
      agentId: dbExecution.agentId,
      userId: dbExecution.userId,
      status: dbExecution.status,
      steps: Array.isArray(dbExecution.steps) ? dbExecution.steps : [],
      totalCost: dbExecution.totalCost,
      tokensUsed: dbExecution.tokensUsed,
      result: dbExecution.result,
      error: dbExecution.error,
      startTime: dbExecution.startTime,
      endTime: dbExecution.endTime
    };
  }
}