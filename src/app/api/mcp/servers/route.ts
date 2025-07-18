/**
 * MCP Servers Management API
 * Manage MCP server configurations and connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { MCPServerRegistry } from '../../../../lib/mcp/MCPTool';
import { mcpClient } from '../../../../lib/mcp/MCPClient';

export async function GET() {
  try {
    const servers = MCPServerRegistry.getAllServers();
    const connectedServers = mcpClient.getConnectedServers();
    
    const serversWithStatus = servers.map(server => ({
      ...server,
      status: mcpClient.getServerStatus(server.id),
      tools: mcpClient.getServerTools(server.id),
      resources: mcpClient.getServerResources(server.id),
      prompts: mcpClient.getServerPrompts(server.id)
    }));

    return NextResponse.json({
      success: true,
      data: {
        servers: serversWithStatus,
        summary: {
          total: servers.length,
          enabled: servers.filter(s => s.enabled).length,
          connected: connectedServers.length,
          totalTools: mcpClient.getAllTools().length,
          totalResources: mcpClient.getAllResources().length,
          totalPrompts: mcpClient.getAllPrompts().length
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Failed to get MCP servers:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serverId, serverConfig } = body;

    switch (action) {
      case 'add_server':
        if (!serverConfig) {
          return NextResponse.json({
            success: false,
            error: 'serverConfig is required'
          }, { status: 400 });
        }
        
        MCPServerRegistry.addServer(serverConfig);
        
        if (serverConfig.enabled) {
          await mcpClient.addServer(serverConfig);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Server added successfully',
          data: serverConfig
        });

      case 'update_server':
        if (!serverId || !serverConfig) {
          return NextResponse.json({
            success: false,
            error: 'serverId and serverConfig are required'
          }, { status: 400 });
        }
        
        const updated = MCPServerRegistry.updateServer(serverId, serverConfig);
        if (!updated) {
          return NextResponse.json({
            success: false,
            error: 'Server not found'
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Server updated successfully'
        });

      case 'enable_server':
        if (!serverId) {
          return NextResponse.json({
            success: false,
            error: 'serverId is required'
          }, { status: 400 });
        }
        
        const server = MCPServerRegistry.getServer(serverId);
        if (!server) {
          return NextResponse.json({
            success: false,
            error: 'Server not found'
          }, { status: 404 });
        }
        
        MCPServerRegistry.updateServer(serverId, { enabled: true });
        await mcpClient.addServer({ ...server, enabled: true });
        
        return NextResponse.json({
          success: true,
          message: `Server ${serverId} enabled and connected`
        });

      case 'disable_server':
        if (!serverId) {
          return NextResponse.json({
            success: false,
            error: 'serverId is required'
          }, { status: 400 });
        }
        
        MCPServerRegistry.updateServer(serverId, { enabled: false });
        await mcpClient.disconnectFromServer(serverId);
        
        return NextResponse.json({
          success: true,
          message: `Server ${serverId} disabled and disconnected`
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ MCP server management failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}