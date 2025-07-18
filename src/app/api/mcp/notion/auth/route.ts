/**
 * Notion OAuth Integration for MCP
 * Handles OAuth flow for Notion MCP server
 */

import { NextRequest, NextResponse } from 'next/server';

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/mcp/notion/callback';

// Temporary storage for OAuth state (in production, use a database)
const oauthStates = new Map<string, { userId?: string; timestamp: number }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'start') {
      // Check if OAuth is configured
      if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
        return NextResponse.json({
          success: false,
          error: 'Notion OAuth not configured. Please set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in your .env file.',
          setup_required: true
        }, { status: 400 });
      }
      
      // Start OAuth flow
      const state = generateRandomState();
      const userId = searchParams.get('userId') || 'default';
      
      // Store state
      oauthStates.set(state, { 
        userId, 
        timestamp: Date.now() 
      });
      
      // Clean up old states (older than 10 minutes)
      cleanupOldStates();
      
      const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
        `client_id=${NOTION_CLIENT_ID}&` +
        `response_type=code&` +
        `owner=user&` +
        `redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}&` +
        `state=${state}`;
      
      return NextResponse.redirect(authUrl);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('❌ Notion OAuth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'get_status') {
      return NextResponse.json({
        success: true,
        data: {
          configured: !!(NOTION_CLIENT_ID && NOTION_CLIENT_SECRET),
          hasToken: !!process.env.NOTION_ACCESS_TOKEN,
          clientId: NOTION_CLIENT_ID ? NOTION_CLIENT_ID.substring(0, 8) + '...' : 'Not configured'
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('❌ Notion OAuth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function cleanupOldStates(): void {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > tenMinutes) {
      oauthStates.delete(state);
    }
  }
}