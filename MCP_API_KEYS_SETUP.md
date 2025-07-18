# MCP API Keys Setup Guide

## Current Status
- ✅ **Filesystem**: Working (no API key needed)
- ⚠️ **GitHub**: Connected but needs GITHUB_TOKEN for search results
- ❌ **Brave Search**: Needs BRAVE_API_KEY
- ❌ **PostgreSQL**: Needs DATABASE_URL

## Setup Instructions

### 1. GitHub (Needs API Token)
Your GitHub server is connected but needs authentication for full functionality.

**Get GitHub Token:**
1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "OmniX MCP Integration"
4. Select scopes: `repo`, `read:org`, `read:user`
5. Click "Generate token" and copy it
6. Add to your `.env` file:
   ```bash
   GITHUB_TOKEN=your_github_token_here
   ```

**Test Tools:**
- `search_repositories` - Search GitHub repositories
- `get_repository` - Get repository details
- `list_issues` - List repository issues

### 2. Brave Search API Key

**Get API Key:**
1. Go to [Brave Search API](https://api.search.brave.com/)
2. Sign up and get your API key
3. Add to your `.env` file:
   ```bash
   BRAVE_API_KEY=your_brave_api_key_here
   ```

**Test Tools:**
- `search` - Web search with privacy focus

### 3. PostgreSQL Database

**Setup Database:**
1. Use existing database or create new one
2. Add connection string to `.env`:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   ```

**Test Tools:**
- `query` - Execute SQL queries
- `list_tables` - List database tables
- `describe_table` - Get table schema

## Environment Variables Template

Create or update your `.env` file:

```bash
# GitHub (already working)
GITHUB_TOKEN=your_github_token_here

# Brave Search (optional)
BRAVE_API_KEY=your_brave_api_key_here

# PostgreSQL (optional)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Test After Setup

1. Restart your dev server: `npm run dev`
2. Visit: `http://localhost:3000/mcp-test`
3. Try enabling the new servers
4. Click tool badges to test functionality

## Expected Results After Setup

### With All API Keys:
- ✅ **Filesystem**: `connected` (12 tools)
- ✅ **GitHub**: `connected` (10+ tools)
- ✅ **Brave Search**: `connected` (search tools)
- ✅ **PostgreSQL**: `connected` (database tools)

### Without Optional API Keys:
- ❌ **Brave Search**: "BRAVE_API_KEY environment variable is required"
- ❌ **PostgreSQL**: "DATABASE_URL environment variable is required"

## Common Tools to Test

### Filesystem
- `read_file` - Read test.txt
- `list_directory` - List files in current directory
- `write_file` - Create new file

### GitHub
- `search_repositories` - Search: "MCP typescript"
- `get_repository` - Get: modelcontextprotocol/typescript-sdk

### Brave Search (with API key)
- `search` - Search: "MCP Model Context Protocol"

### PostgreSQL (with database)
- `query` - Query: "SELECT version();"