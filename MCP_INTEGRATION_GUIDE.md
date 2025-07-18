# OmniX MCP Integration Guide

## Overview

This guide explains how to use the Model Context Protocol (MCP) integration in OmniX. MCP allows AI agents to connect to external tools and data sources through a standardized interface.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that standardizes how AI applications connect to external tools, data sources, and services. Think of it as "USB-C for AI" - it provides a universal interface for AI systems to interact with the world around them.

## Features

- ✅ **MCP Client Infrastructure**: Full TypeScript MCP client with support for stdio and SSE transports
- ✅ **Tool Integration**: Seamless integration with OmniX's existing agent framework
- ✅ **Server Management**: Enable/disable MCP servers dynamically
- ✅ **Test Suite**: Comprehensive testing and validation tools
- ✅ **Web UI**: Management interface at `/mcp-test`
- ✅ **API Endpoints**: RESTful API for MCP operations

## Available MCP Servers

### Built-in Servers

1. **Filesystem Server**
   - **ID**: `filesystem`
   - **Description**: Access local filesystem operations
   - **Tools**: `read_file`, `write_file`, `list_directory`, `create_directory`
   - **Use Cases**: File management, document processing, code analysis

2. **GitHub Server** (Coming Soon)
   - **ID**: `github`
   - **Description**: GitHub repository operations
   - **Tools**: Repository management, issue tracking, PR management
   - **Setup**: Requires `GITHUB_TOKEN` environment variable

3. **Brave Search Server** (Coming Soon)
   - **ID**: `brave-search`
   - **Description**: Privacy-focused web search
   - **Tools**: Web search, content extraction
   - **Setup**: Requires `BRAVE_API_KEY` environment variable

4. **PostgreSQL Server** (Coming Soon)
   - **ID**: `postgres`
   - **Description**: Database operations
   - **Tools**: Query execution, schema management
   - **Setup**: Requires `DATABASE_URL` environment variable

## Quick Start

### 1. Test the Integration

Navigate to the test page:
```
http://localhost:3000/mcp-test
```

### 2. Enable Filesystem Server

```bash
# Using the test script
node test-mcp-integration.js

# Or via API
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"action": "enable_server", "serverId": "filesystem"}'
```

### 3. Test a Tool

```bash
# Test reading a file
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_tool",
    "serverId": "filesystem",
    "toolName": "read_file",
    "testArgs": {"path": "package.json"}
  }'
```

## API Endpoints

### MCP Test API

#### `GET /api/mcp/test`
Run comprehensive MCP test suite.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTests": 7,
    "passed": 6,
    "failed": 1,
    "results": [...],
    "summary": "MCP Tests Complete: 6/7 tests passed"
  }
}
```

#### `POST /api/mcp/test`
Execute specific MCP actions.

**Actions:**
- `enable_server` - Enable and connect to a server
- `disable_server` - Disable and disconnect from a server
- `test_tool` - Test a specific tool
- `get_status` - Get MCP status summary
- `get_test_report` - Get detailed test report

**Example - Enable Server:**
```json
{
  "action": "enable_server",
  "serverId": "filesystem"
}
```

**Example - Test Tool:**
```json
{
  "action": "test_tool",
  "serverId": "filesystem",
  "toolName": "read_file",
  "testArgs": {"path": "package.json"}
}
```

### MCP Servers API

#### `GET /api/mcp/servers`
Get all MCP server configurations and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "servers": [...],
    "summary": {
      "total": 4,
      "enabled": 1,
      "connected": 1,
      "totalTools": 3,
      "totalResources": 0,
      "totalPrompts": 0
    }
  }
}
```

#### `POST /api/mcp/servers`
Manage MCP server configurations.

**Actions:**
- `add_server` - Add new server configuration
- `update_server` - Update existing server
- `enable_server` - Enable server
- `disable_server` - Disable server

## Agent Integration

MCP tools are automatically integrated into the OmniX agent framework:

```typescript
// MCP tools appear in the tool registry with 'mcp' category
const mcpTools = ToolRegistry.getToolsByCategory('mcp');

// Agents can use MCP tools like any other tool
const agent = await agentFramework.createAgent(userId, {
  name: 'File Manager Agent',
  capabilities: [
    {
      id: 'mcp_filesystem',
      name: 'Filesystem Operations',
      type: 'data',
      // ... other config
    }
  ]
});
```

## Test Prompts

### Filesystem Operations

1. **Read Configuration File**
   ```
   "Use the filesystem MCP server to read our package.json file and tell me about the project dependencies."
   ```

2. **List Project Structure**
   ```
   "List all files in the src/ directory using the MCP filesystem tools and provide a summary of the project structure."
   ```

3. **Create and Write File**
   ```
   "Create a new file called 'test-output.txt' with the current timestamp and some sample content using MCP tools."
   ```

### Advanced Agent Workflows

1. **Document Analysis Agent**
   ```
   "Create an agent that uses MCP filesystem tools to read all markdown files in the project, analyze their content, and generate a comprehensive documentation index."
   ```

2. **Code Review Agent**
   ```
   "Build an agent that uses MCP to read TypeScript files, analyze code patterns, and suggest improvements based on best practices."
   ```

3. **Project Health Agent**
   ```
   "Design an agent that uses MCP filesystem tools to check project health by analyzing package.json, README files, and code structure."
   ```

## Troubleshooting

### Common Issues

1. **Server Connection Failed**
   - Check that MCP server dependencies are installed
   - Verify environment variables are set correctly
   - Check server logs for detailed error messages

2. **Tool Execution Failed**
   - Ensure the tool exists on the connected server
   - Verify tool parameters match the expected schema
   - Check file permissions for filesystem operations

3. **Import Errors**
   - Run `npm install` to ensure MCP SDK is installed
   - Check TypeScript compilation for type errors
   - Verify import paths are correct

### Debug Commands

```bash
# Check MCP server status
curl http://localhost:3000/api/mcp/servers

# Run specific tests
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"action": "get_status"}'

# Get detailed test report
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"action": "get_test_report"}'
```

## Adding New MCP Servers

To add a new MCP server to OmniX:

1. **Add Server Configuration**
   ```typescript
   MCPServerRegistry.addServer({
     id: 'my-custom-server',
     name: 'My Custom Server',
     description: 'Custom MCP server for specific tasks',
     type: 'stdio',
     command: 'npx',
     args: ['my-mcp-server'],
     enabled: false,
     category: 'utility'
   });
   ```

2. **Enable and Connect**
   ```typescript
   await MCPIntegrationManager.enableServer('my-custom-server');
   ```

3. **Test Integration**
   ```bash
   curl -X POST http://localhost:3000/api/mcp/test \
     -H "Content-Type: application/json" \
     -d '{"action": "enable_server", "serverId": "my-custom-server"}'
   ```

## Environment Variables

Set these environment variables to enable additional MCP servers:

```bash
# GitHub integration
GITHUB_TOKEN=your_github_personal_access_token

# Brave Search integration
BRAVE_API_KEY=your_brave_search_api_key

# PostgreSQL integration
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## Next Steps

1. **Enable Additional Servers**: Set up environment variables and enable GitHub, Brave Search, or PostgreSQL servers
2. **Custom Agents**: Create specialized agents that leverage MCP tools for specific workflows
3. **Custom Servers**: Develop your own MCP servers for domain-specific integrations
4. **Production Deployment**: Configure MCP servers for production environments

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Available MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [OmniX Agent Framework](./ARCHITECTURE.md)

---

**Need Help?** Check the test page at `/mcp-test` or run the test script: `node test-mcp-integration.js`