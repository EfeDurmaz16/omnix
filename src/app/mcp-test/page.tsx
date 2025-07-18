'use client';

/**
 * MCP Test Page - Simple UI to test MCP integration
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MCPTestResult {
  testName: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

interface MCPServer {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: string;
  tools: any[];
  resources: any[];
  prompts: any[];
}

export default function MCPTestPage() {
  const [testResults, setTestResults] = useState<MCPTestResult[]>([]);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    loadServers();
    loadStatus();
  }, []);

  const loadServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers');
      const data = await response.json();
      
      if (data.success) {
        setServers(data.data.servers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' })
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const runTests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/test');
      const data = await response.json();
      
      if (data.success) {
        setTestResults(data.data.results);
        await loadServers(); // Refresh servers
        await loadStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleServer = async (serverId: string, enable: boolean) => {
    try {
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enable ? 'enable_server' : 'disable_server',
          serverId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadServers();
        await loadStatus();
        alert(`✅ ${enable ? 'Enabled' : 'Disabled'} ${serverId} server successfully!`);
      } else {
        console.error('Server toggle failed:', data);
        alert(`❌ Failed to ${enable ? 'enable' : 'disable'} ${serverId} server:\n\n${data.error}\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
      alert(`❌ Request failed: ${error}`);
    }
  };

  const testTool = async (serverId: string, toolName: string) => {
    try {
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_tool',
          serverId,
          toolName,
          testArgs: {} // Use default test args from MCPTool
        })
      });
      
      const data = await response.json();
      
      // Show result in a more user-friendly way
      const resultText = data.success 
        ? `✅ Success!\n\nResult: ${JSON.stringify(data.data.result, null, 2)}`
        : `❌ Failed!\n\nError: ${data.data?.error || data.error}`;
      
      alert(`Tool: ${toolName} on ${serverId}\n\n${resultText}`);
    } catch (error) {
      console.error('Failed to test tool:', error);
      alert(`❌ Request failed: ${error}`);
    }
  };

  const connectToNotion = async () => {
    try {
      // First check if OAuth is configured
      const checkResponse = await fetch('/api/mcp/notion/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' })
      });
      
      const checkData = await checkResponse.json();
      
      if (!checkData.success || !checkData.data.configured) {
        alert(`❌ Notion OAuth not configured!\n\n` +
              `Please follow these steps:\n\n` +
              `1. Go to https://www.notion.so/my-integrations\n` +
              `2. Create a new integration\n` +
              `3. Set OAuth redirect URI to: http://localhost:3000/api/mcp/notion/callback\n` +
              `4. Add to your .env file:\n` +
              `   NOTION_CLIENT_ID=your_client_id\n` +
              `   NOTION_CLIENT_SECRET=your_client_secret\n` +
              `5. Restart your dev server\n\n` +
              `See NOTION_OAUTH_SETUP.md for detailed instructions.`);
        return;
      }
      
      // Open Notion OAuth in a new window
      const authUrl = '/api/mcp/notion/auth?action=start&userId=default';
      const popup = window.open(authUrl, 'notion-auth', 'width=500,height=600');
      
      // Poll for popup closure
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Refresh the page data
          loadServers();
          loadStatus();
        }
      }, 1000);
      
      // Close popup after 5 minutes
      setTimeout(() => {
        if (popup && !popup.closed) {
          popup.close();
          clearInterval(checkClosed);
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Failed to connect to Notion:', error);
      alert('Failed to connect to Notion');
    }
  };

  const executeAgentTask = async (taskDescription: string) => {
    const resultDiv = document.getElementById('agentResult');
    const resultPre = resultDiv?.querySelector('pre');
    
    if (resultDiv && resultPre) {
      resultDiv.classList.remove('hidden');
      resultPre.textContent = 'Creating agent and executing task...';
    }
    
    try {
      // First, try to create an agent for MCP testing
      if (resultPre) {
        resultPre.textContent = 'Creating MCP test agent...';
      }
      
      const createResponse = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'mcp-assistant',
          config: {
            name: 'MCP_Test_Agent',
            description: 'Agent for testing MCP integrations with Notion and other services',
            tools: ['mcp:notion:API-search', 'mcp:notion:API-get-page', 'mcp:notion:API-create-page', 'mcp:notion:API-list-databases'],
            mcpEnabled: true
          }
        })
      });
      
      let agentId = 'mcp-assistant'; // Default fallback
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        agentId = createData.data?.id || createData.id || 'research-assistant';
        if (resultPre) {
          resultPre.textContent = `Agent created: ${agentId}\nExecuting task...`;
        }
      } else {
        // If creation fails, try with a known template ID
        if (resultPre) {
          resultPre.textContent = 'Using default research-assistant template...\nExecuting task...';
        }
      }
      
      // Execute the task
      const response = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentId,
          taskDescription: taskDescription,
          context: {
            availableTools: ['mcp:notion:API-search', 'mcp:notion:API-get-page', 'mcp:notion:API-create-page', 'mcp:notion:API-list-databases'],
            mcpEnabled: true
          }
        })
      });
      
      const data = await response.json();
      
      if (resultPre) {
        resultPre.textContent = JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.error('Agent task failed:', error);
      if (resultPre) {
        resultPre.textContent = `Error: ${error}`;
      }
    }
  };

  const debugNotion = async () => {
    try {
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'debug_notion' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const debug = data.data;
        alert(`🔍 Notion Debug Info:\n\n` +
              `Environment Variables:\n` +
              `- NOTION_CLIENT_ID: ${debug.env_vars.NOTION_CLIENT_ID}\n` +
              `- NOTION_CLIENT_SECRET: ${debug.env_vars.NOTION_CLIENT_SECRET}\n` +
              `- NOTION_ACCESS_TOKEN: ${debug.env_vars.NOTION_ACCESS_TOKEN}\n\n` +
              `Server Config: ${debug.server_config ? 'Found' : 'Not found'}\n` +
              `Validation: ${debug.validation.isValid ? 'Valid' : debug.validation.error}`);
      } else {
        alert(`❌ Debug failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Debug failed:', error);
      alert(`❌ Debug request failed: ${error}`);
    }
  };

  const toggleServerExpansion = (serverId: string) => {
    setExpandedServers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serverId)) {
        newSet.delete(serverId);
      } else {
        newSet.add(serverId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      connected: "default",
      disconnected: "secondary",
      not_found: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">MCP Integration Test</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={debugNotion}
          >
            Debug Notion
          </Button>
          <Button onClick={runTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>
      </div>

      {status && (
        <Card>
          <CardHeader>
            <CardTitle>MCP Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{status.connectedServers}</div>
                <div className="text-sm text-muted-foreground">Connected Servers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{status.totalTools}</div>
                <div className="text-sm text-muted-foreground">Total Tools</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{status.totalResources}</div>
                <div className="text-sm text-muted-foreground">Total Resources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{status.totalPrompts}</div>
                <div className="text-sm text-muted-foreground">Total Prompts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="servers" className="w-full">
        <TabsList>
          <TabsTrigger value="servers">MCP Servers</TabsTrigger>
          <TabsTrigger value="agent">Agent Tasks</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          <div className="grid gap-4">
            {servers.map((server) => (
              <Card key={server.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {server.name}
                        {getStatusBadge(server.status)}
                        {server.id === 'github' && server.status === 'connected' && (
                          <Badge variant="outline">
                            {server.tools.length > 0 ? 'Authenticated' : 'No Auth'}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{server.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {(server.id === 'notion' || server.id === 'notion-ramide') && !server.enabled && (
                        <Button
                          variant="outline"
                          onClick={() => connectToNotion()}
                          className="bg-black text-white hover:bg-gray-800"
                        >
                          Connect to Notion
                        </Button>
                      )}
                      <Button
                        variant={server.enabled ? "destructive" : "default"}
                        onClick={() => toggleServer(server.id, !server.enabled)}
                      >
                        {server.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Tools:</strong> {server.tools.length}
                      {server.tools.length > 0 && (
                        <div className="mt-1">
                          {(expandedServers.has(server.id) ? server.tools : server.tools.slice(0, 6)).map((tool: any) => (
                            <Badge
                              key={tool.name}
                              variant="outline"
                              className="mr-1 mb-1 cursor-pointer text-xs"
                              onClick={() => testTool(server.id, tool.name)}
                            >
                              {tool.name}
                            </Badge>
                          ))}
                          {server.tools.length > 6 && (
                            <Badge 
                              variant="secondary" 
                              className="cursor-pointer mr-1 mb-1"
                              onClick={() => toggleServerExpansion(server.id)}
                            >
                              {expandedServers.has(server.id) 
                                ? 'Show Less' 
                                : `+${server.tools.length - 6} more`
                              }
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <strong>Resources:</strong> {server.resources.length}
                    </div>
                    <div>
                      <strong>Prompts:</strong> {server.prompts.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Agent Tasks with MCP</CardTitle>
              <p className="text-sm text-muted-foreground">
                Try natural language commands that use your connected MCP tools
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Example Commands:</label>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• "Search my Notion workspace for pages about 'project planning'"</div>
                    <div>• "Get the content of page {process.env.NOTION_PAGE_ID || 'your-page-id'}"</div>
                    <div>• "Create a new page titled 'MCP Test' in my Notion workspace"</div>
                    <div>• "List all databases in my Notion workspace"</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="agentTask" className="text-sm font-medium">Task Description:</label>
                  <textarea
                    id="agentTask"
                    placeholder="Enter a natural language task that uses MCP tools..."
                    className="w-full p-3 border rounded-md min-h-[100px]"
                    defaultValue=""
                  />
                </div>
                
                <Button 
                  onClick={() => {
                    const textarea = document.getElementById('agentTask') as HTMLTextAreaElement;
                    if (textarea?.value.trim()) {
                      executeAgentTask(textarea.value.trim());
                    } else {
                      alert('Please enter a task description');
                    }
                  }}
                  className="w-full"
                >
                  Execute Agent Task
                </Button>
                
                <div id="agentResult" className="hidden p-4 bg-muted rounded-md">
                  <strong>Agent Result:</strong>
                  <pre className="mt-2 text-sm overflow-auto whitespace-pre-wrap"></pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No test results yet. Click "Run All Tests" to start testing.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {testResults.map((test, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{test.testName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={test.success ? "default" : "destructive"}>
                          {test.success ? 'PASS' : 'FAIL'}
                        </Badge>
                        <Badge variant="outline">{test.duration}ms</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {test.success && test.result && (
                      <div>
                        <strong>Result:</strong>
                        <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-auto">
                          {JSON.stringify(test.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!test.success && test.error && (
                      <div>
                        <strong>Error:</strong>
                        <p className="mt-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                          {test.error}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}