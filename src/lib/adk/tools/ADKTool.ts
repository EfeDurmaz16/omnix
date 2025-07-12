/**
 * ADK Tool Interface and Base Implementation
 * Standardized tool pattern for ADK agents
 */

export interface ToolConfig {
  name: string;
  description: string;
  category: 'web' | 'communication' | 'data' | 'file' | 'ai';
  parameters: ToolParameter[];
  requiredPermissions?: string[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    cost?: number;
    tokensUsed?: number;
    [key: string]: any;
  };
}

export abstract class ADKTool {
  protected config: ToolConfig;

  constructor(config: ToolConfig) {
    this.config = config;
  }

  /**
   * Abstract execute method - must be implemented by subclasses
   */
  abstract execute(parameters: Record<string, any>): Promise<ToolResult>;

  /**
   * Get tool configuration
   */
  getConfig(): ToolConfig {
    return { ...this.config };
  }

  /**
   * Validate input parameters
   */
  protected validateParameters(parameters: Record<string, any>): void {
    for (const param of this.config.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Required parameter missing: ${param.name}`);
      }

      if (param.name in parameters) {
        const value = parameters[param.name];
        if (!this.isValidType(value, param.type)) {
          throw new Error(`Invalid type for parameter ${param.name}. Expected ${param.type}`);
        }
      }
    }
  }

  /**
   * Check if value matches expected type
   */
  private isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Create standardized tool result
   */
  protected createResult(
    success: boolean,
    data?: any,
    error?: string,
    metadata?: Record<string, any>
  ): ToolResult {
    return {
      success,
      data,
      error,
      metadata: {
        executionTime: 0,
        cost: 0,
        tokensUsed: 0,
        ...metadata
      }
    };
  }
}