# MCP Test Prompts for OmniX

## Quick Test Commands

### 1. Start Your Dev Server
```bash
npm run dev
```

### 2. Open Test Page
Navigate to: **http://localhost:3000/mcp-test**

### 3. Or Use API Directly

#### Enable Filesystem Server
```bash
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"action": "enable_server", "serverId": "filesystem"}'
```

#### Test Reading Package.json
```bash
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_tool",
    "serverId": "filesystem",
    "toolName": "read_file",
    "testArgs": {"path": "package.json"}
  }'
```

#### Get Status
```bash
curl http://localhost:3000/api/mcp/servers
```

## Agent Test Prompts

Once you have MCP working, test these with your agents:

### Basic File Operations
```
"Use MCP filesystem tools to read our package.json file and tell me what dependencies we have installed."
```

### Project Analysis
```
"List all TypeScript files in the src/lib directory using MCP tools and provide a summary of our codebase structure."
```

### File Creation
```
"Create a new file called 'mcp-test-output.txt' with today's date and a summary of our MCP integration status."
```

## Expected Results

✅ **Filesystem server connects**
✅ **Tools like `read_file`, `list_directory` become available**
✅ **Agents can use MCP tools in their workflows**
✅ **Test page shows connected servers and tools**

## If Something Fails

1. Check the browser console for errors
2. Look at server logs in terminal
3. Verify MCP SDK is installed: `npm list @modelcontextprotocol/sdk`
4. Test with our test script: `node test-mcp-integration.js`