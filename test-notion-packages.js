#!/usr/bin/env node

/**
 * Test Notion MCP Packages
 * Check if the Notion MCP packages exist and are accessible
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testNotionPackages() {
  console.log('🧪 Testing Notion MCP Packages...\n');

  const packages = [
    '@makenotion/notion-mcp-server',
    '@notionhq/notion-mcp-server',
    'notion-mcp-server',
    '@ramidecodes/mcp-server-notion'
  ];

  for (const pkg of packages) {
    try {
      console.log(`Testing: ${pkg}`);
      const { stdout, stderr } = await execAsync(`npx ${pkg} --help`, { timeout: 10000 });
      console.log(`✅ ${pkg} - Available`);
      if (stdout.includes('Usage:') || stdout.includes('Options:')) {
        console.log(`   Has help text - looks good!`);
      }
      console.log('');
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ ${pkg} - Not found in npm registry`);
      } else if (error.message.includes('timeout')) {
        console.log(`⏱️ ${pkg} - Timeout (might work but slow)`);
      } else {
        console.log(`❌ ${pkg} - Error: ${error.message.split('\n')[0]}`);
      }
      console.log('');
    }
  }

  console.log('🔍 Checking npm registry directly...');
  
  for (const pkg of packages) {
    try {
      const { stdout } = await execAsync(`npm view ${pkg} version`, { timeout: 5000 });
      if (stdout.trim()) {
        console.log(`✅ ${pkg} - Version: ${stdout.trim()}`);
      }
    } catch (error) {
      console.log(`❌ ${pkg} - Not in registry`);
    }
  }
}

testNotionPackages();