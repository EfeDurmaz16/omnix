/**
 * MCP Test API Endpoint
 * Test and validate MCP integration
 */

import { NextRequest, NextResponse } from 'next/server';
import MCPTestRunner from '../../../../lib/mcp/MCPTestRunner';
import MCPIntegrationManager, { MCPServerRegistry } from '../../../../lib/mcp/MCPTool';

export async function GET() {
  try {
    console.log('🧪 Starting MCP test suite...');
    
    const testResults = await MCPTestRunner.runAllTests();
    
    return NextResponse.json({
      success: true,
      data: testResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ MCP test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serverId, toolName, testArgs } = body;

    switch (action) {
      case 'enable_server':
        if (!serverId) {
          return NextResponse.json({
            success: false,
            error: 'serverId is required'
          }, { status: 400 });
        }
        
        try {
          await MCPIntegrationManager.enableServer(serverId);
          return NextResponse.json({
            success: true,
            message: `Server ${serverId} enabled successfully`
          });
        } catch (error: any) {
          console.error(`❌ Failed to enable server ${serverId}:`, error);
          return NextResponse.json({
            success: false,
            error: error.message,
            details: error.stack
          }, { status: 500 });
        }

      case 'disable_server':
        if (!serverId) {
          return NextResponse.json({
            success: false,
            error: 'serverId is required'
          }, { status: 400 });
        }
        
        await MCPIntegrationManager.disableServer(serverId);
        return NextResponse.json({
          success: true,
          message: `Server ${serverId} disabled successfully`
        });

      case 'test_tool':
        if (!serverId || !toolName) {
          return NextResponse.json({
            success: false,
            error: 'serverId and toolName are required'
          }, { status: 400 });
        }
        
        const testResult = await MCPIntegrationManager.testTool(
          serverId, 
          toolName, 
          testArgs || {}
        );
        
        return NextResponse.json({
          success: true,
          data: testResult
        });

      case 'get_status':
        const status = MCPIntegrationManager.getStatusSummary();
        return NextResponse.json({
          success: true,
          data: status
        });

      case 'get_test_report':
        const report = MCPTestRunner.generateReport();
        return NextResponse.json({
          success: true,
          data: { report }
        });

      case 'debug_notion':
        return NextResponse.json({
          success: true,
          data: {
            env_vars: {
              NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID ? 'Set' : 'Not set',
              NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET ? 'Set' : 'Not set',
              NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN ? 'Set' : 'Not set',
              NOTION_PAGE_ID: process.env.NOTION_PAGE_ID ? 'Set' : 'Not set'
            },
            server_config: MCPServerRegistry.getServer('notion'),
            validation: MCPIntegrationManager.validateServerConfig(MCPServerRegistry.getServer('notion')!)
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ MCP API action failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}