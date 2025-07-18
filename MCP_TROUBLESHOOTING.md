# MCP Integration Troubleshooting Guide

## Issue: "not_found" Status and Connection Errors

### Problem
MCP servers show "not_found" status and filesystem server fails with connection errors.

### Root Cause
The original filesystem server configuration was trying to access `/tmp` which doesn't exist on Windows systems.

### Solution ✅

**1. Setup Test Environment**
```bash
npm run setup:mcp
```
This creates the `test-mcp-files/` directory with sample files.

**2. Updated Configuration**
The filesystem server now uses `./test-mcp-files` instead of `/tmp`.

**3. Better Error Handling**
Added detailed error logging and retry mechanisms.

## Testing Steps

### Quick Test
```bash
# 1. Setup test environment
npm run setup:mcp

# 2. Start dev server
npm run dev

# 3. Visit test page
# http://localhost:3000/mcp-test

# 4. Click "Enable" on Filesystem server
# Should now show "connected" status with tools available
```

### Manual API Test
```bash
# Enable filesystem server
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"action": "enable_server", "serverId": "filesystem"}'

# Test reading our test file
curl -X POST http://localhost:3000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_tool",
    "serverId": "filesystem",
    "toolName": "read_file",
    "testArgs": {"path": "test.txt"}
  }'
```

## Expected Results After Fix

### Server Status
- ✅ **Filesystem**: `connected` with 4+ tools
- ❌ **GitHub**: `not_found` (needs GITHUB_TOKEN)
- ❌ **Brave Search**: `not_found` (needs BRAVE_API_KEY)  
- ❌ **PostgreSQL**: `not_found` (needs DATABASE_URL)

### Available Tools
- `read_file` - Read file contents
- `write_file` - Write to files
- `list_directory` - List directory contents
- `create_directory` - Create directories

### Test Files Created
- `test-mcp-files/test.txt` - Simple text file
- `test-mcp-files/sample.md` - Markdown file
- `test-mcp-files/data.json` - JSON data
- `test-mcp-files/subdir/nested.txt` - Nested file

## Common Issues & Solutions

### 1. "Connection closed" Error
**Cause**: Server process failed to start
**Solution**: 
- Check test directory exists: `ls test-mcp-files/`
- Verify MCP SDK installed: `npm list @modelcontextprotocol/sdk`
- Check server logs for detailed errors

### 2. "No tools found" Error
**Cause**: Server connected but tools not discovered
**Solution**: 
- Wait 3-5 seconds after enabling server
- Refresh the page
- Check server capabilities in browser console

### 3. Permission Errors
**Cause**: File system permissions
**Solution**:
- Ensure test directory is writable
- Run `npm run setup:mcp` again
- Check file permissions: `ls -la test-mcp-files/`

## Debug Commands

```bash
# Check if MCP server starts manually
npx -y @modelcontextprotocol/server-filesystem ./test-mcp-files

# Should show:
# Secure MCP Filesystem Server running on stdio
# Allowed directories: [ '/path/to/test-mcp-files' ]

# Run full test suite
npm run test:mcp

# Check server status
curl http://localhost:3000/api/mcp/servers | jq
```

## Next Steps After Fix

1. **Test Agent Integration**: Create agents that use MCP filesystem tools
2. **Add More Servers**: Configure GitHub, Notion, etc. with proper API keys
3. **Custom Workflows**: Build agents that combine MCP tools with other capabilities

## Agent Test Prompts

Once filesystem server is working:

```
"Use the MCP filesystem tools to read all files in the test-mcp-files directory and provide a summary of their contents."
```

```
"Create a new file called 'agent-output.txt' with a summary of the current time and list of available MCP tools."
```

```
"Read the data.json file and explain what MCP tools are available for testing."
```