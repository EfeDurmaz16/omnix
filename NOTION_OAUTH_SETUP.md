# Notion OAuth Setup for MCP Integration

## Overview
This guide shows how to set up Notion OAuth integration for MCP, allowing seamless connection to Notion workspaces.

## Setup Steps

### 1. Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "Create new integration"
3. Fill in the details:
   - **Name**: OmniX MCP Integration
   - **Logo**: Optional
   - **Associated workspace**: Select your workspace
4. Click "Submit"

### 2. Configure OAuth Settings

1. In your integration settings, go to "OAuth Domain & URIs"
2. Add redirect URI: `http://localhost:3000/api/mcp/notion/callback`
3. For production, add: `https://yourdomain.com/api/mcp/notion/callback`
4. Save the settings

### 3. Get OAuth Credentials

1. Copy the "OAuth client ID" 
2. Copy the "OAuth client secret"
3. Add to your `.env` file:
   ```bash
   NOTION_CLIENT_ID=your_oauth_client_id_here
   NOTION_CLIENT_SECRET=your_oauth_client_secret_here
   NOTION_REDIRECT_URI=http://localhost:3000/api/mcp/notion/callback
   ```

### 4. Test the Integration

1. Restart your dev server: `npm run dev`
2. Go to: `http://localhost:3000/mcp-test`
3. Find the Notion server card
4. Click "Connect to Notion" button
5. Complete OAuth flow in popup window
6. Copy the generated token to your `.env` file:
   ```bash
   NOTION_ACCESS_TOKEN=your_access_token_here
   ```
7. Restart server and enable Notion server

## Features After Setup

### Available Tools
- `search` - Search across your Notion workspace
- `read_page` - Read specific Notion pages
- `create_page` - Create new pages
- `update_page` - Update existing pages
- `list_databases` - List available databases
- `query_database` - Query database content

### Test Prompts
```
"Use Notion MCP to search for pages about 'project planning' in my workspace."
```

```
"Create a new page in my Notion workspace with a summary of today's tasks."
```

```
"List all databases in my Notion workspace and show their properties."
```

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure the redirect URI in Notion settings matches exactly
   - Check for typos in the URL

2. **"OAuth client not configured"**
   - Verify `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET` are set
   - Restart the development server

3. **"Access token expired"**
   - Notion tokens don't expire, but you may need to re-authenticate
   - Click "Connect to Notion" again to get a new token

### Environment Variables Checklist

```bash
# Required for OAuth flow
NOTION_CLIENT_ID=your_oauth_client_id_here
NOTION_CLIENT_SECRET=your_oauth_client_secret_here
NOTION_REDIRECT_URI=http://localhost:3000/api/mcp/notion/callback

# Generated after OAuth flow
NOTION_ACCESS_TOKEN=your_access_token_here

# For notion-mcp-server (required)
NOTION_PAGE_ID=your_page_id_here
```

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables for all sensitive data
- The access token gives full access to the connected workspace
- Regularly rotate tokens in production environments

## Production Deployment

For production deployment:

1. Update redirect URI in Notion settings
2. Set production environment variables
3. Ensure HTTPS is used for all OAuth flows
4. Consider implementing token refresh logic
5. Add proper error handling and logging

## Next Steps

After successful setup:
1. Create agents that leverage Notion data
2. Build workflows that sync between Notion and other tools
3. Use Notion as a knowledge base for AI agents
4. Implement automated content creation workflows