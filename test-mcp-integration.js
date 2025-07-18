#!/usr/bin/env node

/**
 * Test MCP Integration
 * Quick test script to validate MCP setup
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Integration...\n');

  try {
    // Test 1: Basic MCP test
    console.log('1. Running MCP test suite...');
    const testResponse = await fetch(`${BASE_URL}/api/mcp/test`);
    const testData = await testResponse.json();
    
    if (testData.success) {
      console.log('✅ MCP test suite completed:');
      console.log(`   Total tests: ${testData.data.totalTests}`);
      console.log(`   Passed: ${testData.data.passed}`);
      console.log(`   Failed: ${testData.data.failed}`);
      if (testData.data.failed > 0) {
        console.log('   Failed tests:', testData.data.results.filter(r => !r.success).map(r => r.testName));
      }
    } else {
      console.log('❌ MCP test suite failed:', testData.error);
    }

    // Test 2: Get server list
    console.log('\n2. Getting MCP servers...');
    const serversResponse = await fetch(`${BASE_URL}/api/mcp/servers`);
    const serversData = await serversResponse.json();
    
    if (serversData.success) {
      console.log('✅ MCP servers retrieved:');
      console.log(`   Total: ${serversData.data.summary.total}`);
      console.log(`   Enabled: ${serversData.data.summary.enabled}`);
      console.log(`   Connected: ${serversData.data.summary.connected}`);
      console.log(`   Tools: ${serversData.data.summary.totalTools}`);
      
      console.log('\n   Available servers:');
      serversData.data.servers.forEach(server => {
        console.log(`     - ${server.name} (${server.id}): ${server.status} - ${server.tools.length} tools`);
      });
    } else {
      console.log('❌ Failed to get MCP servers:', serversData.error);
    }

    // Test 3: Enable filesystem server
    console.log('\n3. Enabling filesystem server...');
    const enableResponse = await fetch(`${BASE_URL}/api/mcp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'enable_server',
        serverId: 'filesystem'
      })
    });
    
    const enableData = await enableResponse.json();
    if (enableData.success) {
      console.log('✅ Filesystem server enabled');
      
      // Wait a bit for connection
      console.log('   Waiting for connection...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test a filesystem tool
      console.log('   Testing filesystem tool...');
      const toolTestResponse = await fetch(`${BASE_URL}/api/mcp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_tool',
          serverId: 'filesystem',
          toolName: 'read_file',
          testArgs: { path: 'package.json' }
        })
      });
      
      const toolTestData = await toolTestResponse.json();
      if (toolTestData.success && toolTestData.data.success) {
        console.log('✅ Filesystem tool test successful');
        console.log('   Result:', toolTestData.data.result);
      } else {
        console.log('❌ Filesystem tool test failed:', toolTestData.data?.error || toolTestData.error);
      }
      
    } else {
      console.log('❌ Failed to enable filesystem server:', enableData.error);
    }

    // Test 4: Get final status
    console.log('\n4. Getting final status...');
    const statusResponse = await fetch(`${BASE_URL}/api/mcp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_status'
      })
    });
    
    const statusData = await statusResponse.json();
    if (statusData.success) {
      console.log('✅ Final MCP status:');
      console.log('   Servers:', statusData.data.connectedServers);
      console.log('   Total tools:', statusData.data.totalTools);
      console.log('   Total resources:', statusData.data.totalResources);
    }

    console.log('\n🎉 MCP Integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMCPIntegration();
}

module.exports = { testMCPIntegration };