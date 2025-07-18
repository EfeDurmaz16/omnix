/**
 * MCP Test Runner - Test and validate MCP integration
 */

import MCPIntegrationManager, { MCPServerRegistry } from './MCPTool';
import { mcpClient } from './MCPClient';

export interface MCPTestResult {
  testName: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

export class MCPTestRunner {
  private static results: MCPTestResult[] = [];

  /**
   * Run a single test and record the result
   */
  private static async runTest(
    testName: string, 
    testFn: () => Promise<any>
  ): Promise<MCPTestResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      console.log(`🧪 Running test: ${testName}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: MCPTestResult = {
        testName,
        success: true,
        result,
        duration,
        timestamp
      };
      
      this.results.push(testResult);
      console.log(`✅ Test passed: ${testName} (${duration}ms)`);
      return testResult;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const testResult: MCPTestResult = {
        testName,
        success: false,
        error: error.message,
        duration,
        timestamp
      };
      
      this.results.push(testResult);
      console.log(`❌ Test failed: ${testName} - ${error.message} (${duration}ms)`);
      return testResult;
    }
  }

  /**
   * Test filesystem server connection
   */
  static async testFilesystemServer(): Promise<MCPTestResult[]> {
    console.log('🧪 Testing Filesystem MCP Server...');
    const tests: MCPTestResult[] = [];

    // Test 1: Enable filesystem server
    tests.push(await this.runTest('Enable filesystem server', async () => {
      await MCPIntegrationManager.enableServer('filesystem');
      return 'Server enabled successfully';
    }));

    // Wait longer for connection to establish and retry if needed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Retry connection if no tools found
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      const tools = mcpClient.getServerTools('filesystem');
      if (tools.length > 0) {
        break;
      }
      
      console.log(`⏳ Waiting for filesystem server tools... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      retryCount++;
    }

    // Test 2: List available tools
    tests.push(await this.runTest('List filesystem tools', async () => {
      const tools = mcpClient.getServerTools('filesystem');
      if (tools.length === 0) {
        throw new Error('No tools found for filesystem server');
      }
      return { toolCount: tools.length, tools: tools.map(t => t.name) };
    }));

    // Test 3: Test read_file tool (if available)
    tests.push(await this.runTest('Test read_file tool', async () => {
      const tools = mcpClient.getServerTools('filesystem');
      const readFileTool = tools.find(t => t.name === 'read_file');
      
      if (!readFileTool) {
        throw new Error('read_file tool not available');
      }

      // Try to read test.txt from our test directory
      const result = await mcpClient.callTool('filesystem', 'read_file', {
        path: 'test.txt'
      });
      
      return { 
        fileRead: true, 
        contentLength: result?.[0]?.text?.length || 0,
        type: typeof result
      };
    }));

    // Test 4: Test list_directory tool (if available)
    tests.push(await this.runTest('Test list_directory tool', async () => {
      const tools = mcpClient.getServerTools('filesystem');
      const listDirTool = tools.find(t => t.name === 'list_directory');
      
      if (!listDirTool) {
        throw new Error('list_directory tool not available');
      }

      const result = await mcpClient.callTool('filesystem', 'list_directory', {
        path: '.'
      });
      
      return { 
        directoryListed: true, 
        itemCount: result?.[0]?.text ? JSON.parse(result[0].text).length : 0
      };
    }));

    return tests;
  }

  /**
   * Test basic MCP functionality
   */
  static async testBasicMCPFunctionality(): Promise<MCPTestResult[]> {
    console.log('🧪 Testing Basic MCP Functionality...');
    const tests: MCPTestResult[] = [];

    // Test 1: Initialize MCP
    tests.push(await this.runTest('Initialize MCP Integration', async () => {
      await MCPIntegrationManager.initialize();
      return 'MCP Integration initialized';
    }));

    // Test 2: Get server registry
    tests.push(await this.runTest('Get server registry', async () => {
      const servers = MCPServerRegistry.getAllServers();
      return { 
        serverCount: servers.length, 
        servers: servers.map(s => ({ id: s.id, name: s.name, enabled: s.enabled }))
      };
    }));

    // Test 3: Get status summary
    tests.push(await this.runTest('Get status summary', async () => {
      const status = MCPIntegrationManager.getStatusSummary();
      return status;
    }));

    return tests;
  }

  /**
   * Run comprehensive MCP tests
   */
  static async runAllTests(): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    results: MCPTestResult[];
    summary: string;
  }> {
    console.log('🧪 Starting comprehensive MCP tests...');
    this.results = []; // Clear previous results

    // Run all test suites
    const basicTests = await this.testBasicMCPFunctionality();
    const filesystemTests = await this.testFilesystemServer();

    const allResults = [...basicTests, ...filesystemTests];
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;

    const summary = `MCP Tests Complete: ${passed}/${allResults.length} tests passed`;
    
    console.log('📊 Test Summary:');
    console.log(`   Total: ${allResults.length}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('❌ Failed tests:');
      allResults.filter(r => !r.success).forEach(test => {
        console.log(`   - ${test.testName}: ${test.error}`);
      });
    }

    return {
      totalTests: allResults.length,
      passed,
      failed,
      results: allResults,
      summary
    };
  }

  /**
   * Get all test results
   */
  static getTestResults(): MCPTestResult[] {
    return [...this.results];
  }

  /**
   * Clear test results
   */
  static clearResults(): void {
    this.results = [];
  }

  /**
   * Generate test report
   */
  static generateReport(): string {
    const results = this.getTestResults();
    if (results.length === 0) {
      return 'No test results available. Run tests first.';
    }

    let report = '# MCP Integration Test Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Total Tests:** ${results.length}\n`;
    report += `**Passed:** ${results.filter(r => r.success).length}\n`;
    report += `**Failed:** ${results.filter(r => !r.success).length}\n\n`;

    report += '## Test Results\n\n';
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      report += `### ${index + 1}. ${status} ${result.testName}\n`;
      report += `**Duration:** ${result.duration}ms\n`;
      report += `**Timestamp:** ${result.timestamp.toISOString()}\n`;
      
      if (result.success && result.result) {
        report += `**Result:** \`\`\`json\n${JSON.stringify(result.result, null, 2)}\n\`\`\`\n`;
      }
      
      if (!result.success && result.error) {
        report += `**Error:** ${result.error}\n`;
      }
      
      report += '\n';
    });

    return report;
  }
}

export default MCPTestRunner;