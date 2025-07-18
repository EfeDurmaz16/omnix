#!/usr/bin/env node

/**
 * Test GitHub MCP Server specifically
 */

const fetch = require('node-fetch');

async function testGitHubMCP() {
  const BASE_URL = 'http://localhost:3000';
  
  console.log('🧪 Testing GitHub MCP Server...\n');

  try {
    // 1. Get server status
    console.log('1. Getting server status...');
    const statusResponse = await fetch(`${BASE_URL}/api/mcp/servers`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      const githubServer = statusData.data.servers.find(s => s.id === 'github');
      if (githubServer) {
        console.log('GitHub Server Status:', githubServer.status);
        console.log('GitHub Tools Count:', githubServer.tools.length);
        console.log('Available Tools:', githubServer.tools.map(t => t.name).join(', '));
      }
    }

    // 2. Test search_repositories with debugging
    console.log('\n2. Testing search_repositories...');
    const searchResponse = await fetch(`${BASE_URL}/api/mcp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test_tool',
        serverId: 'github',
        toolName: 'search_repositories',
        testArgs: { query: 'nextjs' }
      })
    });
    
    const searchData = await searchResponse.json();
    console.log('Search Result:', JSON.stringify(searchData, null, 2));

    // 3. Test get_repository
    console.log('\n3. Testing get_repository...');
    const repoResponse = await fetch(`${BASE_URL}/api/mcp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test_tool',
        serverId: 'github',
        toolName: 'get_repository',
        testArgs: { owner: 'vercel', repo: 'next.js' }
      })
    });
    
    const repoData = await repoResponse.json();
    console.log('Repository Result:', JSON.stringify(repoData, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGitHubMCP();