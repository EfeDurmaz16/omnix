/**
 * MCP Client Infrastructure for OmniX
 * Provides standardized interface to connect with MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  type: 'sse' | 'stdio' | 'websocket';
  endpoint?: string; // For SSE/WebSocket
  command?: string;  // For stdio
  args?: string[];   // For stdio
  env?: Record<string, string>;
  enabled: boolean;
  category: 'productivity' | 'development' | 'communication' | 'data' | 'utility';
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  serverId: string;
}

export class MCPClient {
  private clients: Map<string, Client> = new Map();
  private servers: Map<string, MCPServerConfig> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();

  /**
   * Add a new MCP server configuration
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    this.servers.set(config.id, config);
    
    if (config.enabled) {
      await this.connectToServer(config.id);
    }
    
    console.log(`📡 Added MCP server: ${config.name} (${config.id})`);
  }

  /**
   * Connect to an MCP server
   */
  async connectToServer(serverId: string): Promise<void> {
    let config = this.servers.get(serverId);
    
    // If not found in local servers, try to get from registry
    if (!config) {
      // Import dynamically to avoid circular dependency
      const { MCPServerRegistry } = await import('./MCPTool');
      const registryConfig = MCPServerRegistry.getServer(serverId);
      if (registryConfig && registryConfig.enabled) {
        config = registryConfig;
        this.servers.set(serverId, config); // Add to local cache
      }
    }
    
    if (!config) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (!config.enabled) {
      throw new Error(`Server ${serverId} is disabled`);
    }

    try {
      console.log(`🔌 Connecting to MCP server: ${config.name}`);
      console.log(`   Command: ${config.command} ${config.args?.join(' ')}`);
      
      let transport;
      
      switch (config.type) {
        case 'sse':
          if (!config.endpoint) {
            throw new Error('SSE endpoint required');
          }
          transport = new SSEClientTransport(new URL(config.endpoint));
          break;
          
        case 'stdio':
          if (!config.command) {
            throw new Error('Command required for stdio transport');
          }
          
          console.log(`🔧 Creating stdio transport for ${config.name}:`);
          console.log(`   Command: ${config.command}`);
          console.log(`   Args: ${config.args?.join(' ')}`);
          console.log(`   Env vars: ${Object.keys(config.env || {}).join(', ')}`);
          
          transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env
          });
          break;
          
        default:
          throw new Error(`Unsupported transport type: ${config.type}`);
      }

      const client = new Client(
        { name: "omnix-client", version: "1.0.0" },
        { capabilities: {} }
      );

      await client.connect(transport);
      this.clients.set(serverId, client);

      // Discover capabilities
      await this.discoverServerCapabilities(serverId);
      
      console.log(`✅ Connected to MCP server: ${config.name}`);
      
    } catch (error: any) {
      console.error(`❌ Failed to connect to MCP server ${config.name}:`, error);
      console.error(`   Error details:`, {
        message: error.message,
        code: error.code,
        data: error.data
      });
      
      // Provide helpful error messages
      if (error.code === -32000) {
        console.error(`   💡 Connection closed - this often means:`);
        console.error(`      - The server process failed to start`);
        console.error(`      - The server command or arguments are incorrect`);
        console.error(`      - Required dependencies are missing`);
        console.error(`      - File/directory permissions issue`);
      }
      
      throw error;
    }
  }

  /**
   * Discover what tools, resources, and prompts a server provides
   */
  private async discoverServerCapabilities(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) return;

    try {
      // Discover tools
      const toolsResponse = await client.listTools();
      for (const tool of toolsResponse.tools) {
        const mcpTool: MCPTool = {
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema,
          serverId
        };
        this.tools.set(`${serverId}:${tool.name}`, mcpTool);
      }

      // Discover resources
      try {
        const resourcesResponse = await client.listResources();
        for (const resource of resourcesResponse.resources) {
          const mcpResource: MCPResource = {
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            serverId
          };
          this.resources.set(`${serverId}:${resource.uri}`, mcpResource);
        }
      } catch (error) {
        // Resources might not be supported
        console.log(`Server ${serverId} doesn't support resources`);
      }

      // Discover prompts
      try {
        const promptsResponse = await client.listPrompts();
        for (const prompt of promptsResponse.prompts) {
          const mcpPrompt: MCPPrompt = {
            name: prompt.name,
            description: prompt.description || '',
            arguments: prompt.arguments,
            serverId
          };
          this.prompts.set(`${serverId}:${prompt.name}`, mcpPrompt);
        }
      } catch (error) {
        // Prompts might not be supported
        console.log(`Server ${serverId} doesn't support prompts`);
      }

      console.log(`🔍 Discovered capabilities for ${serverId}:`, {
        tools: toolsResponse.tools.length,
        resources: this.getServerResources(serverId).length,
        prompts: this.getServerPrompts(serverId).length
      });

    } catch (error) {
      console.error(`Failed to discover capabilities for ${serverId}:`, error);
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId: string, toolName: string, arguments_: any): Promise<any> {
    let client = this.clients.get(serverId);
    
    // Try to reconnect if not connected
    if (!client) {
      console.log(`🔄 Attempting to reconnect to server ${serverId}`);
      try {
        await this.connectToServer(serverId);
        client = this.clients.get(serverId);
      } catch (error) {
        console.error(`❌ Failed to reconnect to server ${serverId}:`, error);
      }
    }
    
    if (!client) {
      throw new Error(`Not connected to server ${serverId}`);
    }

    const toolKey = `${serverId}:${toolName}`;
    const tool = this.tools.get(toolKey);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found on server ${serverId}`);
    }

    try {
      console.log(`🔧 Calling MCP tool: ${toolName} on ${serverId}`, arguments_);
      const response = await client.callTool({
        name: toolName,
        arguments: arguments_
      });
      
      console.log(`🔍 Raw response from ${toolName}:`, JSON.stringify(response, null, 2));

      // Handle different content types
      if (response.content && Array.isArray(response.content)) {
        const processedContent = response.content.map(item => {
          if (item.type === 'text') {
            // Try to parse JSON if it looks like JSON
            try {
              if (item.text.trim().startsWith('{') || item.text.trim().startsWith('[')) {
                return JSON.parse(item.text);
              }
            } catch (e) {
              // If JSON parsing fails, return as text
              console.log(`📝 Tool returned text (not JSON): ${item.text.substring(0, 100)}...`);
            }
            return item.text;
          }
          return item;
        });
        
        // If we have a single item, return it directly
        if (processedContent.length === 1) {
          return processedContent[0];
        }
        
        return processedContent;
      }

      console.log('🔍 Full response:', JSON.stringify(response, null, 2));
      return response.content;
    } catch (error: any) {
      console.error(`❌ Tool call failed: ${toolName}`, error);
      
      // Provide more helpful error messages
      if (error.code === -32603) {
        console.error(`   💡 Invalid input - check tool parameters`);
        if (error.message.includes('Required')) {
          console.error(`   💡 Missing required parameter in tool call`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get a resource from an MCP server
   */
  async getResource(serverId: string, uri: string): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server ${serverId}`);
    }

    try {
      const response = await client.readResource({ uri });
      return response.contents;
    } catch (error) {
      console.error(`❌ Failed to get resource ${uri}:`, error);
      throw error;
    }
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(serverId: string, promptName: string, arguments_?: any): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server ${serverId}`);
    }

    try {
      const response = await client.getPrompt({
        name: promptName,
        arguments: arguments_
      });
      return response.messages;
    } catch (error) {
      console.error(`❌ Failed to get prompt ${promptName}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from a server
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
      
      // Remove tools, resources, and prompts from this server
      for (const [key, tool] of this.tools.entries()) {
        if (tool.serverId === serverId) {
          this.tools.delete(key);
        }
      }
      for (const [key, resource] of this.resources.entries()) {
        if (resource.serverId === serverId) {
          this.resources.delete(key);
        }
      }
      for (const [key, prompt] of this.prompts.entries()) {
        if (prompt.serverId === serverId) {
          this.prompts.delete(key);
        }
      }
      
      console.log(`🔌 Disconnected from MCP server: ${serverId}`);
    }
  }

  /**
   * Get all available tools
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverId: string): MCPTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.serverId === serverId);
  }

  /**
   * Get all available resources
   */
  getAllResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get resources from a specific server
   */
  getServerResources(serverId: string): MCPResource[] {
    return Array.from(this.resources.values()).filter(resource => resource.serverId === serverId);
  }

  /**
   * Get all available prompts
   */
  getAllPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Get prompts from a specific server
   */
  getServerPrompts(serverId: string): MCPPrompt[] {
    return Array.from(this.prompts.values()).filter(prompt => prompt.serverId === serverId);
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): MCPServerConfig[] {
    return Array.from(this.servers.values()).filter(server => 
      server.enabled && this.clients.has(server.id)
    );
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): 'connected' | 'disconnected' | 'not_found' {
    if (!this.servers.has(serverId)) {
      return 'not_found';
    }
    return this.clients.has(serverId) ? 'connected' : 'disconnected';
  }

  /**
   * Clean up all connections
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up MCP connections...');
    
    for (const [serverId] of this.clients) {
      await this.disconnectFromServer(serverId);
    }
    
    this.servers.clear();
    console.log('✅ MCP cleanup complete');
  }
}

// Singleton instance
export const mcpClient = new MCPClient();