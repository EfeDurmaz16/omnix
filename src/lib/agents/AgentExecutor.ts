/**
 * Agent Execution Engine for OmniX
 * Handles autonomous AI agent task execution with tool integration
 */

import { 
  AgentConfiguration, 
  AgentExecution, 
  AgentResponse, 
  AgentToolCall,
  AgentMemory 
} from './types';
import { analyticsTracker } from '../analytics/AnalyticsTracker';
import ToolRegistry from './tools/ToolRegistry';

export interface AgentExecutorConfig {
  maxExecutionTime: number; // milliseconds
  maxSteps: number;
  maxCostPerExecution: number;
  enableParallelTools: boolean;
}

export class AgentExecutor {
  private config: AgentExecutorConfig;
  private activeExecutions: Map<string, AgentExecution> = new Map();

  constructor(config?: Partial<AgentExecutorConfig>) {
    this.config = {
      maxExecutionTime: 300000, // 5 minutes
      maxSteps: 20,
      maxCostPerExecution: 10.0, // $10 max per execution
      enableParallelTools: true,
      ...config
    };
  }

  /**
   * Execute an agent task
   */
  async executeTask(
    agent: AgentConfiguration,
    taskDescription: string,
    context?: Record<string, any>
  ): Promise<AgentExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: AgentExecution = {
      id: executionId,
      agentId: agent.id,
      userId: agent.userId,
      taskDescription,
      status: 'initializing',
      steps: [],
      startTime: new Date(),
      totalCost: 0,
      tokensUsed: 0
    };

    this.activeExecutions.set(executionId, execution);

    try {
      console.log(`🤖 Starting agent execution: ${agent.name} - ${taskDescription}`);
      
      // Update status to thinking
      execution.status = 'thinking';
      this.addExecutionStep(execution, 'thinking', 'Analyzing task and planning approach...');

      // Generate initial plan
      const planningResponse = await this.generateAgentResponse(agent, [
        {
          role: 'system',
          content: agent.systemPrompt
        },
        {
          role: 'user',
          content: `Task: ${taskDescription}\n\nContext: ${JSON.stringify(context || {})}\n\nPlease analyze this task and create a step-by-step plan. Then execute the first step.`
        }
      ]);

      execution.tokensUsed += planningResponse.metadata.tokensUsed;
      execution.totalCost += planningResponse.metadata.cost;

      this.addExecutionStep(execution, 'thinking', planningResponse.thinking);
      this.addExecutionStep(execution, 'response', planningResponse.content);

      // Execute the plan
      let currentStep = 0;
      let shouldContinue = planningResponse.shouldContinue;
      let conversationHistory = [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: `Task: ${taskDescription}\n\nContext: ${JSON.stringify(context || {})}` },
        { role: 'assistant', content: planningResponse.content }
      ];

      execution.status = 'executing';

      while (shouldContinue && currentStep < this.config.maxSteps && execution.totalCost < this.config.maxCostPerExecution) {
        currentStep++;
        
        // Check execution time limit
        const elapsed = Date.now() - execution.startTime.getTime();
        if (elapsed > this.config.maxExecutionTime) {
          throw new Error('Execution time limit exceeded');
        }

        // Execute tool calls if any
        if (planningResponse.toolCalls.length > 0) {
          for (const toolCall of planningResponse.toolCalls) {
            const toolResult = await this.executeToolCall(agent, toolCall);
            this.addExecutionStep(execution, 'tool-call', 
              `Tool: ${toolCall.tool}`, 
              toolCall.tool, 
              toolCall.parameters, 
              toolResult
            );

            // Add tool result to conversation
            conversationHistory.push({
              role: 'assistant',
              content: `Tool: ${toolCall.tool}\nInput: ${JSON.stringify(toolCall.parameters)}\nResult: ${JSON.stringify(toolResult)}`
            });
          }
        }

        // Get next response
        conversationHistory.push({
          role: 'user',
          content: 'Continue with the next step. If the task is complete, respond with shouldContinue: false.'
        });

        const nextResponse = await this.generateAgentResponse(agent, conversationHistory);
        
        execution.tokensUsed += nextResponse.metadata.tokensUsed;
        execution.totalCost += nextResponse.metadata.cost;

        this.addExecutionStep(execution, 'thinking', nextResponse.thinking);
        this.addExecutionStep(execution, 'response', nextResponse.content);

        conversationHistory.push({
          role: 'assistant',
          content: nextResponse.content
        });

        shouldContinue = nextResponse.shouldContinue;
        planningResponse = nextResponse; // For next iteration's tool calls
      }

      // Mark as completed
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = {
        finalResponse: planningResponse.content,
        stepsCompleted: currentStep,
        toolsUsed: execution.steps.filter(s => s.type === 'tool-call').map(s => s.toolUsed!),
        totalCost: execution.totalCost,
        tokensUsed: execution.tokensUsed
      };

      console.log(`✅ Agent execution completed: ${executionId} (${currentStep} steps, $${execution.totalCost.toFixed(4)})`);

      // Track analytics
      await analyticsTracker.trackModelUsage({
        userId: agent.userId,
        modelId: agent.model,
        provider: 'agent-executor',
        requestType: 'text',
        input: taskDescription,
        response: planningResponse.content,
        startTime: execution.startTime.getTime(),
        success: true,
        tokensUsed: execution.tokensUsed,
        cost: execution.totalCost,
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          stepsCompleted: currentStep,
          toolsUsed: execution.result.toolsUsed
        }
      });

      return execution;

    } catch (error) {
      console.error(`❌ Agent execution failed: ${executionId}`, error);
      
      execution.status = 'failed';
      execution.endTime = new Date();
      this.addExecutionStep(execution, 'error', 
        error instanceof Error ? error.message : 'Unknown error occurred'
      );

      // Track failed execution
      await analyticsTracker.trackModelUsage({
        userId: agent.userId,
        modelId: agent.model,
        provider: 'agent-executor',
        requestType: 'text',
        input: taskDescription,
        startTime: execution.startTime.getTime(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed: execution.tokensUsed,
        cost: execution.totalCost,
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          stepsCompleted: execution.steps.length
        }
      });

      return execution;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Generate agent response using configured model
   */
  private async generateAgentResponse(
    agent: AgentConfiguration,
    messages: any[]
  ): Promise<AgentResponse> {
    const startTime = performance.now();
    
    try {
      // Call the AI model API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: agent.model,
          maxTokens: agent.maxTokens,
          temperature: agent.temperature,
          topP: agent.topP,
          stream: false,
          agentMode: true,
          agentConfig: {
            availableTools: agent.availableTools,
            personality: agent.personality
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      const endTime = performance.now();

      // Parse response for tool calls and thinking
      const toolCalls = this.extractToolCalls(data.content);
      const thinking = this.extractThinking(data.content);
      const shouldContinue = this.shouldContinueExecution(data.content);

      return {
        id: `resp_${Date.now()}`,
        content: data.content,
        toolCalls,
        thinking,
        confidence: this.calculateConfidence(data.content),
        nextActions: this.extractNextActions(data.content),
        shouldContinue,
        metadata: {
          tokensUsed: data.tokensUsed || this.estimateTokens(messages, data.content),
          cost: data.cost || 0.002, // Estimated cost
          duration: endTime - startTime,
          model: agent.model
        }
      };

    } catch (error) {
      console.error('Failed to generate agent response:', error);
      throw error;
    }
  }

  /**
   * Execute a tool call
   */
  private async executeToolCall(
    agent: AgentConfiguration,
    toolCall: AgentToolCall
  ): Promise<any> {
    console.log(`🔧 Executing tool: ${toolCall.tool}`, toolCall.parameters);

    try {
      // Check if agent has permission to use this tool
      if (!agent.availableTools.includes(toolCall.tool)) {
        throw new Error(`Tool ${toolCall.tool} not available for this agent`);
      }

      // Check if tool exists in registry
      if (!ToolRegistry.hasTool(toolCall.tool)) {
        throw new Error(`Tool ${toolCall.tool} not found in registry`);
      }

      // Use execute method for all tools for now
      const methodName = 'execute';
      const parameters = [toolCall.parameters];

      // Execute tool through registry
      const result = await ToolRegistry.executeTool(
        toolCall.tool,
        methodName,
        Array.isArray(parameters) ? parameters : [parameters]
      );

      return {
        success: true,
        result,
        tool: toolCall.tool,
        method: methodName
      };

    } catch (error) {
      console.error(`Tool execution failed: ${toolCall.tool}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        tool: toolCall.tool
      };
    }
  }

  /**
   * Get available tools for agent
   */
  getAvailableTools(): string[] {
    return ToolRegistry.getAllTools().map(tool => tool.id);
  }

  /**
   * Get tool information
   */
  getToolInfo(toolId: string): any {
    return ToolRegistry.getTool(toolId);
  }

  /**
   * Helper methods
   */
  private addExecutionStep(
    execution: AgentExecution,
    type: 'thinking' | 'tool-call' | 'response' | 'error',
    content: string,
    toolUsed?: string,
    toolInput?: any,
    toolOutput?: any,
    error?: string
  ): void {
    execution.steps.push({
      id: `step_${execution.steps.length + 1}`,
      type,
      timestamp: new Date(),
      content,
      toolUsed,
      toolInput,
      toolOutput,
      error,
      duration: performance.now()
    });
  }

  private extractToolCalls(content: string): AgentToolCall[] {
    // Simple regex-based extraction - in production, use structured output
    const toolCallPattern = /TOOL_CALL:\s*(\w+)\s*\((.*?)\)/g;
    const toolCalls: AgentToolCall[] = [];
    let match;

    while ((match = toolCallPattern.exec(content)) !== null) {
      try {
        const tool = match[1];
        const paramsStr = match[2];
        const parameters = JSON.parse(`{${paramsStr}}`);
        
        toolCalls.push({
          tool,
          parameters,
          reasoning: `Using ${tool} to help with the task`
        });
      } catch (error) {
        console.warn('Failed to parse tool call:', match[0]);
      }
    }

    return toolCalls;
  }

  private extractThinking(content: string): string {
    const thinkingMatch = content.match(/THINKING:\s*(.*?)(?=\n\n|\n[A-Z]|$)/s);
    return thinkingMatch ? thinkingMatch[1].trim() : 'Processing task...';
  }

  private shouldContinueExecution(content: string): boolean {
    const continuePattern = /shouldContinue:\s*(true|false)/i;
    const match = content.match(continuePattern);
    if (match) {
      return match[1].toLowerCase() === 'true';
    }
    
    // Default logic: continue if no explicit completion markers
    const completionMarkers = [
      'task completed',
      'task complete',
      'finished',
      'done',
      'no further action needed'
    ];
    
    return !completionMarkers.some(marker => 
      content.toLowerCase().includes(marker)
    );
  }

  private calculateConfidence(content: string): number {
    // Simple heuristic - in production, use more sophisticated methods
    const confidenceMarkers = {
      'definitely': 0.9,
      'certainly': 0.9,
      'clearly': 0.8,
      'likely': 0.7,
      'probably': 0.7,
      'possibly': 0.5,
      'maybe': 0.4,
      'uncertain': 0.3,
      'unclear': 0.3
    };

    for (const [marker, confidence] of Object.entries(confidenceMarkers)) {
      if (content.toLowerCase().includes(marker)) {
        return confidence;
      }
    }

    return 0.75; // Default confidence
  }

  private extractNextActions(content: string): string[] {
    const actionPattern = /(?:next steps?|next actions?|todo):\s*(?:\n|-)?\s*(.*?)(?=\n\n|\n[A-Z]|$)/is;
    const match = content.match(actionPattern);
    
    if (match) {
      return match[1]
        .split(/\n|,|;/)
        .map(action => action.trim())
        .filter(action => action.length > 0)
        .slice(0, 5); // Limit to 5 actions
    }
    
    return [];
  }

  private estimateTokens(messages: any[], response: string): number {
    const totalText = JSON.stringify(messages) + response;
    return Math.ceil(totalText.length / 4); // Rough estimation
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): AgentExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): AgentExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'failed';
      execution.endTime = new Date();
      this.addExecutionStep(execution, 'error', 'Execution cancelled by user');
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AgentExecutorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🤖 Agent executor config updated:', this.config);
  }
}

// Singleton instance
export const agentExecutor = new AgentExecutor();