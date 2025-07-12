/**
 * Sequential Agent - ADK Pattern Implementation
 * Executes tasks in a sequential workflow
 */

import { Agent, AgentConfig, AgentContext, ExecutionResult, ExecutionStep } from '../core/Agent';

export class SequentialAgent extends Agent {
  private workflow: WorkflowStep[] = [];

  constructor(config: AgentConfig) {
    super(config);
  }

  /**
   * Define workflow steps
   */
  defineWorkflow(steps: WorkflowStep[]): void {
    this.workflow = steps;
  }

  /**
   * Execute the agent with sequential workflow
   */
  async execute(input: string, context?: Partial<AgentContext>): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    
    // Update context if provided
    if (context) {
      this.updateContext(context);
    }

    // Add user message to history
    this.addMessage({
      role: 'user',
      content: input,
      timestamp: startTime
    });

    const execution: ExecutionResult = {
      id: executionId,
      agentId: this.config.id,
      status: 'running',
      steps: [],
      finalResponse: '',
      context: this.getContext(),
      startTime,
      totalCost: 0,
      tokensUsed: 0
    };

    try {
      console.log(`🚀 Sequential Agent ${this.config.name} starting execution`);

      // Execute workflow steps sequentially
      for (let i = 0; i < this.workflow.length; i++) {
        const workflowStep = this.workflow[i];
        const step = this.createStep('workflow', `Executing step ${i + 1}: ${workflowStep.name}`);
        execution.steps.push(step);

        step.status = 'running';
        const stepStartTime = Date.now();

        try {
          const stepResult = await this.executeWorkflowStep(workflowStep, input, execution.steps);
          step.status = 'completed';
          step.duration = Date.now() - stepStartTime;
          
          // Update context with step result if needed
          if (stepResult.contextUpdate) {
            this.updateContext(stepResult.contextUpdate);
          }

        } catch (error) {
          step.status = 'failed';
          step.duration = Date.now() - stepStartTime;
          step.content += ` - Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          throw error;
        }
      }

      // Generate final response
      const responseStep = this.createStep('response', 'Generating final response');
      execution.steps.push(responseStep);
      
      responseStep.status = 'running';
      const responseStartTime = Date.now();
      
      execution.finalResponse = await this.generateFinalResponse(input, execution.steps);
      
      responseStep.status = 'completed';
      responseStep.duration = Date.now() - responseStartTime;
      responseStep.content = 'Final response generated successfully';

      // Add assistant message to history
      this.addMessage({
        role: 'assistant',
        content: execution.finalResponse,
        timestamp: new Date()
      });

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.context = this.getContext();
      execution.totalCost = this.calculateCost(execution.steps);
      execution.tokensUsed = this.calculateTokens(execution.steps);

      console.log(`✅ Sequential Agent execution completed: ${execution.id}`);
      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.context = this.getContext();
      
      console.error(`❌ Sequential Agent execution failed: ${error}`);
      return execution;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    workflowStep: WorkflowStep,
    input: string,
    previousSteps: ExecutionStep[]
  ): Promise<WorkflowStepResult> {
    switch (workflowStep.type) {
      case 'tool':
        return await this.executeToolStep(workflowStep, input);
      
      case 'thinking':
        return await this.executeThinkingStep(workflowStep, input, previousSteps);
      
      case 'conditional':
        return await this.executeConditionalStep(workflowStep, input, previousSteps);
      
      default:
        throw new Error(`Unknown workflow step type: ${(workflowStep as any).type}`);
    }
  }

  /**
   * Execute tool step
   */
  private async executeToolStep(step: WorkflowStep, input: string): Promise<WorkflowStepResult> {
    if (step.type !== 'tool' || !step.toolName) {
      throw new Error('Invalid tool step configuration');
    }

    const toolStep = this.createStep('tool-call', `Using tool: ${step.toolName}`);
    const toolInput = step.toolInputMapper ? step.toolInputMapper(input, this.getContext()) : { query: input };
    
    try {
      const result = await this.executeTool(step.toolName, toolInput, toolStep);
      
      return {
        success: true,
        result,
        contextUpdate: step.contextUpdater ? step.contextUpdater(result, this.getContext()) : {}
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }

  /**
   * Execute thinking step
   */
  private async executeThinkingStep(
    step: WorkflowStep,
    input: string,
    previousSteps: ExecutionStep[]
  ): Promise<WorkflowStepResult> {
    // Simulate thinking/analysis process
    const analysis = step.processor ? step.processor(input, previousSteps, this.getContext()) : {
      analysis: `Analyzed input: "${input}"`,
      nextAction: 'continue'
    };

    return {
      success: true,
      result: analysis
    };
  }

  /**
   * Execute conditional step
   */
  private async executeConditionalStep(
    step: WorkflowStep,
    input: string,
    previousSteps: ExecutionStep[]
  ): Promise<WorkflowStepResult> {
    if (step.type !== 'conditional' || !step.condition) {
      throw new Error('Invalid conditional step configuration');
    }

    const conditionResult = step.condition(input, previousSteps, this.getContext());
    
    return {
      success: true,
      result: { conditionMet: conditionResult },
      contextUpdate: { lastConditionResult: conditionResult }
    };
  }

  /**
   * Generate final response based on execution steps
   */
  private async generateFinalResponse(input: string, steps: ExecutionStep[]): Promise<string> {
    // Collect results from steps
    const toolResults = steps
      .filter(step => step.type === 'tool-call' && step.toolOutput)
      .map(step => step.toolOutput);

    if (toolResults.length === 0) {
      return `I've processed your request: "${input}". The task has been completed successfully.`;
    }

    // Generate response based on tool results
    let response = `I've completed your request: "${input}"\n\n`;
    
    // Add search results if any
    const searchResults = toolResults.find(result => result.results && Array.isArray(result.results));
    if (searchResults && searchResults.results.length > 0) {
      response += `## Research Findings\n\n`;
      searchResults.results.slice(0, 3).forEach((result: any, index: number) => {
        response += `**${index + 1}. ${result.title}**\n`;
        response += `${result.content || result.snippet}\n`;
        response += `Source: ${result.url}\n\n`;
      });
    }

    // Add email confirmation if any
    const emailResults = toolResults.find(result => result.success && result.to);
    if (emailResults) {
      response += `📧 Report has been sent to: ${emailResults.to}\n`;
    }

    return response;
  }

  /**
   * Calculate execution cost
   */
  private calculateCost(steps: ExecutionStep[]): number {
    return steps.length * 0.001; // Simple cost calculation
  }

  /**
   * Calculate tokens used
   */
  private calculateTokens(steps: ExecutionStep[]): number {
    return steps.reduce((total, step) => total + step.content.length, 0);
  }
}

// Workflow step interfaces
export interface WorkflowStep {
  name: string;
  type: 'tool' | 'thinking' | 'conditional';
  toolName?: string;
  toolInputMapper?: (input: string, context: AgentContext) => any;
  contextUpdater?: (result: any, context: AgentContext) => Partial<AgentContext>;
  processor?: (input: string, steps: ExecutionStep[], context: AgentContext) => any;
  condition?: (input: string, steps: ExecutionStep[], context: AgentContext) => boolean;
}

export interface WorkflowStepResult {
  success: boolean;
  result?: any;
  error?: string;
  contextUpdate?: Partial<AgentContext>;
}