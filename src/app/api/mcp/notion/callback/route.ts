/**
 * Notion OAuth Callback Handler
 * Processes OAuth callback and exchanges code for access token
 */

import { NextRequest, NextResponse } from 'next/server';

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || '';
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/mcp/notion/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/mcp-test?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/mcp-test?error=missing_code_or_state`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: NOTION_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Notion token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/mcp-test?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    
    // In a real app, you'd store this token securely in a database
    // For now, we'll just show it to the user
    console.log('✅ Notion OAuth successful:', {
      workspace_name: tokenData.workspace_name,
      workspace_id: tokenData.workspace_id,
      owner: tokenData.owner,
      access_token: tokenData.access_token.substring(0, 20) + '...'
    });

    // Create a success page with the token
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Notion Integration Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #16a34a; border: 1px solid #16a34a; padding: 20px; border-radius: 8px; background: #f0fdf4; }
            .token { background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; }
            .instructions { margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>🎉 Notion Integration Successful!</h2>
            <p><strong>Workspace:</strong> ${tokenData.workspace_name}</p>
            <p><strong>Owner:</strong> ${tokenData.owner?.user?.name || 'Unknown'}</p>
            
            <div class="instructions">
              <h3>📋 Next Steps:</h3>
              <ol>
                <li>Add this token to your <code>.env</code> file:</li>
                <div class="token">
                  NOTION_ACCESS_TOKEN=${tokenData.access_token}
                </div>
                <li>Add a page ID to your <code>.env</code> file:</li>
                <div class="token">
                  NOTION_PAGE_ID=your_page_id_here
                </div>
                <p><strong>How to get Page ID:</strong> Go to any Notion page, click "Share", then "Copy link". The page ID is the part after the last slash (before the ?v= if present).</p>
                <li>Restart your development server</li>
                <li>Go back to <a href="/mcp-test">MCP Test Page</a></li>
                <li>Enable the Notion server</li>
              </ol>
            </div>
          </div>
          
          <script>
            // Auto-close after 30 seconds
            setTimeout(() => {
              window.close();
            }, 30000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error: any) {
    console.error('❌ Notion OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/mcp-test?error=callback_failed`
    );
  }
}