/**
 * Tool Registry - Maps tool names to their implementations
 */

// Import real tools
import { EmailTool, defaultEmailConfig } from './EmailTool';
import { DataAnalysisTool } from './DataAnalysisTool';
import { FileProcessingTool } from './FileProcessingTool';
import { FirecrawlWebSearch } from '../../search/FirecrawlWebSearch';
import { GeminiTool, defaultGeminiConfig } from './GeminiTool';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'communication' | 'data' | 'web' | 'file' | 'ai';
  instance: any;
  methods: {
    [methodName: string]: {
      description: string;
      parameters: any[];
      returnType: string;
    };
  };
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    // Initialize real tools
    const emailTool = new EmailTool(defaultEmailConfig);
    const webSearchTool = new FirecrawlWebSearch();
    const geminiTool = new GeminiTool(defaultGeminiConfig);

    // Web Search Tool - using Firecrawl
    this.tools.set('web-search', {
      id: 'web-search',
      name: 'Web Search',
      description: 'Search the web using Firecrawl',
      category: 'web',
      instance: {
        execute: async (params: any) => {
          console.log('🔍 Web search executing:', params);
          const query = params.query || params.q || JSON.stringify(params);
          const options = {
            maxResults: params.maxResults || 5,
            language: params.language || 'en'
          };
          
          const results = await webSearchTool.searchWeb(query, options);
          console.log('🔍 Web search results:', results.length);
          
          return {
            success: true,
            results,
            query,
            count: results.length
          };
        }
      },
      methods: {
        execute: {
          description: 'Search the web for information',
          parameters: ['SearchQuery'],
          returnType: 'SearchResults'
        }
      }
    });

    // Email Tool
    this.tools.set('email-sender', {
      id: 'email-sender',
      name: 'Email Sender',
      description: 'Send emails using SMTP',
      category: 'communication',
      instance: {
        execute: async (params: any) => {
          console.log('📧 Email sending executing:', params);
          
          const emailOptions = {
            to: params.to || params.recipient || 'user@example.com',
            subject: params.subject || 'Report from AI Agent',
            text: params.text || params.content || params.body || 'Generated report',
            html: params.html || `<p>${params.text || params.content || params.body || 'Generated report'}</p>`
          };
          
          const result = await emailTool.sendEmail(emailOptions);
          console.log('📧 Email result:', result);
          
          return {
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            to: emailOptions.to
          };
        }
      },
      methods: {
        execute: {
          description: 'Send email with content',
          parameters: ['EmailOptions'],
          returnType: 'EmailResult'
        }
      }
    });

    // Data Analysis Tool
    this.tools.set('data-analyzer', {
      id: 'data-analyzer',
      name: 'Data Analyzer',
      description: 'Analyze data and generate insights',
      category: 'data',
      instance: {
        execute: async (params: any) => {
          console.log('📊 Data analysis executing:', params);
          
          if (!params.data || !Array.isArray(params.data)) {
            return {
              success: false,
              error: 'Data array is required for analysis'
            };
          }
          
          const analysis = DataAnalysisTool.analyzeData(params.data);
          console.log('📊 Analysis completed');
          
          return {
            success: true,
            analysis
          };
        }
      },
      methods: {
        execute: {
          description: 'Analyze dataset',
          parameters: ['DataArray'],
          returnType: 'AnalysisResult'
        }
      }
    });

    // File Processing Tool
    this.tools.set('file-processing', {
      id: 'file-processing',
      name: 'File Processor',
      description: 'Process and manipulate files',
      category: 'file',
      instance: {
        execute: async (params: any) => {
          console.log('📁 File processing executing:', params);
          
          if (params.action === 'list') {
            const files = await FileProcessingTool.listFiles(params.directory);
            return { success: true, files };
          } else if (params.action === 'process' && params.filePath) {
            const result = await FileProcessingTool.processTextFile(params.filePath);
            return result;
          }
          
          return {
            success: false,
            error: 'Invalid file processing parameters'
          };
        }
      },
      methods: {
        execute: {
          description: 'Process files',
          parameters: ['FileOptions'],
          returnType: 'ProcessingResult'
        }
      }
    });

    // Gemini AI Tool
    this.tools.set('gemini-ai', {
      id: 'gemini-ai',
      name: 'Gemini AI',
      description: 'Direct integration with Google Gemini AI',
      category: 'ai',
      instance: {
        execute: async (params: any) => {
          console.log('🤖 Gemini AI executing:', params);
          
          const prompt = params.prompt || params.query || JSON.stringify(params);
          const context = params.context || '';
          
          const result = await geminiTool.generate(prompt, context);
          console.log('🤖 Gemini response generated');
          
          return {
            success: !result.error,
            response: result.text,
            error: result.error,
            usage: result.usage
          };
        }
      },
      methods: {
        execute: {
          description: 'Generate AI response',
          parameters: ['PromptOptions'],
          returnType: 'AIResponse'
        }
      }
    });

    this.initialized = true;
    console.log('🔧 Tool registry initialized with', this.tools.size, 'real tools');
  }

  /**
   * Get tool by ID
   */
  static getTool(toolId: string): ToolDefinition | undefined {
    this.initialize();
    return this.tools.get(toolId);
  }

  /**
   * Get all tools
   */
  static getAllTools(): ToolDefinition[] {
    this.initialize();
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  static getToolsByCategory(category: string): ToolDefinition[] {
    this.initialize();
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Check if tool exists
   */
  static hasTool(toolId: string): boolean {
    this.initialize();
    return this.tools.has(toolId);
  }

  /**
   * Execute tool method
   */
  static async executeTool(
    toolId: string,
    methodName: string,
    parameters: any[]
  ): Promise<any> {
    this.initialize();
    
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const method = tool.methods[methodName];
    if (!method) {
      throw new Error(`Method not found: ${methodName} in tool ${toolId}`);
    }

    const instance = tool.instance;
    if (!instance[methodName]) {
      throw new Error(`Method implementation not found: ${methodName} in tool ${toolId}`);
    }

    try {
      console.log(`🔧 Executing ${toolId}.${methodName}`, parameters);
      const result = await instance[methodName](...parameters);
      console.log(`✅ Tool execution completed: ${toolId}.${methodName}`);
      return result;
    } catch (error) {
      console.error(`❌ Tool execution failed: ${toolId}.${methodName}`, error);
      throw error;
    }
  }

  /**
   * Get tool usage statistics
   */
  static getToolStats(): Record<string, any> {
    this.initialize();
    return {
      totalTools: this.tools.size,
      categories: this.getToolsByCategory('communication').length + 
                  this.getToolsByCategory('data').length +
                  this.getToolsByCategory('web').length +
                  this.getToolsByCategory('file').length +
                  this.getToolsByCategory('ai').length,
      toolsByCategory: {
        communication: this.getToolsByCategory('communication').length,
        data: this.getToolsByCategory('data').length,
        web: this.getToolsByCategory('web').length,
        file: this.getToolsByCategory('file').length,
        ai: this.getToolsByCategory('ai').length
      }
    };
  }
}

// Initialize on import
ToolRegistry.initialize();

export default ToolRegistry;