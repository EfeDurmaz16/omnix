/**
 * MCP Tool Adapter - Integrates MCP tools with OmniX agent framework
 */

import { mcpClient, MCPTool, MCPServerConfig } from './MCPClient';
import { ToolDefinition } from '../agents/tools/ToolRegistry';

export class MCPToolAdapter {
  /**
   * Convert MCP tool to OmniX ToolDefinition
   */
  static createToolDefinition(mcpTool: MCPTool): ToolDefinition {
    return {
      id: `mcp:${mcpTool.serverId}:${mcpTool.name}`,
      name: `MCP: ${mcpTool.name}`,
      description: mcpTool.description,
      category: 'data', // Default category, could be made configurable
      instance: {
        execute: async (params: any) => {
          console.log(`🔧 Executing MCP tool: ${mcpTool.name} on ${mcpTool.serverId}`);
          
          try {
            const result = await mcpClient.callTool(
              mcpTool.serverId, 
              mcpTool.name, 
              params
            );
            
            return {
              success: true,
              data: result,
              source: 'mcp',
              server: mcpTool.serverId,
              tool: mcpTool.name
            };
          } catch (error: any) {
            console.error(`❌ MCP tool execution failed:`, error);
            return {
              success: false,
              error: error.message,
              source: 'mcp',
              server: mcpTool.serverId,
              tool: mcpTool.name
            };
          }
        }
      },
      methods: {
        execute: {
          description: mcpTool.description,
          parameters: mcpTool.inputSchema ? [mcpTool.inputSchema] : ['any'],
          returnType: 'MCPToolResult'
        }
      }
    };
  }

  /**
   * Get category based on server config
   */
  static getCategoryForServer(serverId: string): ToolDefinition['category'] {
    // Map common server types to categories
    const serverName = serverId.toLowerCase();
    
    if (serverName.includes('github') || serverName.includes('git')) {
      return 'data';
    }
    if (serverName.includes('gmail') || serverName.includes('slack') || serverName.includes('discord')) {
      return 'communication';
    }
    if (serverName.includes('notion') || serverName.includes('database')) {
      return 'data';
    }
    if (serverName.includes('file') || serverName.includes('fs')) {
      return 'file';
    }
    if (serverName.includes('search') || serverName.includes('web')) {
      return 'web';
    }
    
    return 'data'; // Default
  }
}

/**
 * MCP Server Registry - Predefined server configurations
 */
export class MCPServerRegistry {
  private static servers: MCPServerConfig[] = [
    {
      id: 'filesystem',
      name: 'Filesystem',
      description: 'Access local filesystem operations',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', './test-mcp-files'],
      enabled: false,
      category: 'utility'
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'GitHub repository operations',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''
      },
      enabled: false,
      category: 'development'
    },
    {
      id: 'brave-search',
      name: 'Brave Search',
      description: 'Privacy-focused web search (requires BRAVE_API_KEY)',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {
        BRAVE_API_KEY: process.env.BRAVE_API_KEY || ''
      },
      enabled: false,
      category: 'productivity'
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'PostgreSQL database operations (requires DATABASE_URL)',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: process.env.DATABASE_URL || ''
      },
      enabled: false,
      category: 'data'
    },
    {
      id: 'notion',
      name: 'Notion MCP (Official)',
      description: 'Official Notion MCP server by @notionhq',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: {
        OPENAPI_MCP_HEADERS: `{"Authorization": "Bearer ${process.env.NOTION_ACCESS_TOKEN || ''}", "Notion-Version": "2022-06-28"}`,
        NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN || ''
      },
      enabled: false,
      category: 'productivity'
    },
    {
      id: 'notion-ramide',
      name: 'Notion (Ramide)',
      description: 'Notion MCP server by @ramidecodes',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@ramidecodes/mcp-server-notion', '--api-key', process.env.NOTION_ACCESS_TOKEN || ''],
      env: {
        NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN || ''
      },
      enabled: false,
      category: 'productivity'
    }
  ];

  /**
   * Get all available server configurations
   */
  static getAllServers(): MCPServerConfig[] {
    return [...this.servers];
  }

  /**
   * Get server by ID
   */
  static getServer(id: string): MCPServerConfig | undefined {
    return this.servers.find(server => server.id === id);
  }

  /**
   * Add custom server configuration
   */
  static addServer(config: MCPServerConfig): void {
    this.servers.push(config);
  }

  /**
   * Update server configuration
   */
  static updateServer(id: string, updates: Partial<MCPServerConfig>): boolean {
    const index = this.servers.findIndex(server => server.id === id);
    if (index !== -1) {
      this.servers[index] = { ...this.servers[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Get servers by category
   */
  static getServersByCategory(category: MCPServerConfig['category']): MCPServerConfig[] {
    return this.servers.filter(server => server.category === category);
  }

  /**
   * Get enabled servers
   */
  static getEnabledServers(): MCPServerConfig[] {
    return this.servers.filter(server => server.enabled);
  }
}

/**
 * MCP Integration Manager - High-level interface for MCP operations
 */
export class MCPIntegrationManager {
  private static initialized = false;

  /**
   * Initialize MCP integration
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing MCP Integration...');

    // Add enabled servers
    const enabledServers = MCPServerRegistry.getEnabledServers();
    
    for (const serverConfig of enabledServers) {
      try {
        await mcpClient.addServer(serverConfig);
        console.log(`✅ Added MCP server: ${serverConfig.name}`);
      } catch (error) {
        console.error(`❌ Failed to add MCP server ${serverConfig.name}:`, error);
      }
    }

    this.initialized = true;
    console.log('🎉 MCP Integration initialized');
  }

  /**
   * Enable a server and connect to it
   */
  static async enableServer(serverId: string): Promise<void> {
    const serverConfig = MCPServerRegistry.getServer(serverId);
    if (!serverConfig) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Validate required environment variables
    const validationResult = this.validateServerConfig(serverConfig);
    if (!validationResult.isValid) {
      throw new Error(`Cannot enable ${serverConfig.name}: ${validationResult.error}`);
    }

    // Update configuration
    MCPServerRegistry.updateServer(serverId, { enabled: true });
    
    // Add to client and connect
    const enabledConfig = { ...serverConfig, enabled: true };
    await mcpClient.addServer(enabledConfig);
    
    console.log(`🔌 Enabled MCP server: ${serverConfig.name}`);
  }

  /**
   * Validate server configuration
   */
  static validateServerConfig(config: MCPServerConfig): { isValid: boolean; error?: string } {
    // Check required environment variables
    if (config.id === 'github' && !config.env?.GITHUB_PERSONAL_ACCESS_TOKEN) {
      return { isValid: false, error: 'GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN environment variable is required' };
    }
    
    if (config.id === 'brave-search' && !config.env?.BRAVE_API_KEY) {
      return { isValid: false, error: 'BRAVE_API_KEY environment variable is required' };
    }
    
    if (config.id === 'postgres' && !config.env?.POSTGRES_CONNECTION_STRING) {
      return { isValid: false, error: 'DATABASE_URL environment variable is required' };
    }
    
    if (config.id === 'notion' && !config.env?.NOTION_ACCESS_TOKEN) {
      return { isValid: false, error: 'NOTION_ACCESS_TOKEN environment variable is required' };
    }
    
    if (config.id === 'notion-ramide' && !config.env?.NOTION_ACCESS_TOKEN) {
      return { isValid: false, error: 'NOTION_ACCESS_TOKEN environment variable is required' };
    }

    return { isValid: true };
  }

  /**
   * Disable a server and disconnect from it
   */
  static async disableServer(serverId: string): Promise<void> {
    await mcpClient.disconnectFromServer(serverId);
    MCPServerRegistry.updateServer(serverId, { enabled: false });
    
    console.log(`🔌 Disabled MCP server: ${serverId}`);
  }

  /**
   * Get all available tools from all connected servers
   */
  static getAllMCPTools(): MCPTool[] {
    return mcpClient.getAllTools();
  }

  /**
   * Get tool definitions compatible with OmniX ToolRegistry
   */
  static getMCPToolDefinitions(): ToolDefinition[] {
    const mcpTools = mcpClient.getAllTools();
    return mcpTools.map(tool => MCPToolAdapter.createToolDefinition(tool));
  }

  /**
   * Get server status summary
   */
  static getStatusSummary(): {
    totalServers: number;
    connectedServers: number;
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
    servers: Array<{
      id: string;
      name: string;
      status: string;
      tools: number;
      resources: number;
      prompts: number;
    }>;
  } {
    const allServers = MCPServerRegistry.getAllServers();
    const connectedServers = mcpClient.getConnectedServers();
    
    return {
      totalServers: allServers.length,
      connectedServers: connectedServers.length,
      totalTools: mcpClient.getAllTools().length,
      totalResources: mcpClient.getAllResources().length,
      totalPrompts: mcpClient.getAllPrompts().length,
      servers: allServers.map(server => ({
        id: server.id,
        name: server.name,
        status: mcpClient.getServerStatus(server.id),
        tools: mcpClient.getServerTools(server.id).length,
        resources: mcpClient.getServerResources(server.id).length,
        prompts: mcpClient.getServerPrompts(server.id).length
      }))
    };
  }

  /**
   * Test MCP tool execution
   */
  static async testTool(serverId: string, toolName: string, testArgs: any = {}): Promise<any> {
    try {
      console.log(`🧪 Testing MCP tool: ${toolName} on ${serverId}`);
      
      // Provide default test parameters for common tools
      let finalTestArgs = testArgs;
      if (Object.keys(testArgs).length === 0) {
        finalTestArgs = this.getDefaultTestArgs(serverId, toolName);
      }
      
      const result = await mcpClient.callTool(serverId, toolName, finalTestArgs);
      console.log('✅ Test completed successfully');
      return { success: true, result };
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default test arguments for common tools
   */
  private static getDefaultTestArgs(serverId: string, toolName: string): any {
    const defaults: Record<string, Record<string, any>> = {
      filesystem: {
        read_file: { path: 'test.txt' },
        write_file: { path: 'test-output.txt', content: 'Test content from MCP' },
        list_directory: { path: '.' },
        create_directory: { path: 'test-dir' }
      },
      github: {
        search_repositories: { query: 'MCP typescript' },
        get_repository: { owner: 'modelcontextprotocol', repo: 'typescript-sdk' },
        list_issues: { owner: 'modelcontextprotocol', repo: 'typescript-sdk' }
      },
      'brave-search': {
        search: { query: 'MCP Model Context Protocol' }
      },
      postgres: {
        query: { sql: 'SELECT version();' }
      },
      notion: {
        'API-get-self': {},
        'API-get-user': { user_id: '3fcecb01-8d98-4ae4-bffc-b205558c90f4' },
        'API-search': { 
          query: 'test',
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          }
        },
        'API-get-page': { page_id: process.env.NOTION_PAGE_ID || '' },
        'API-list-databases': {}
      },
      'notion-ramide': {
        search: { query: 'test' },
        list_databases: {},
        read_page: { page_id: 'test' }
      }
    };

    return defaults[serverId]?.[toolName] || {};
  }

  /**
   * Cleanup all MCP connections
   */
  static async cleanup(): Promise<void> {
    await mcpClient.cleanup();
    this.initialized = false;
  }
}

export default MCPIntegrationManager;