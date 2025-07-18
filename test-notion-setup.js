#!/usr/bin/env node

/**
 * Test Notion OAuth Setup
 * Checks if Notion OAuth is properly configured
 */

const fetch = require('node-fetch');

async function testNotionSetup() {
  const BASE_URL = 'http://localhost:3000';
  
  console.log('🧪 Testing Notion OAuth Setup...\n');

  try {
    // Check OAuth configuration
    console.log('1. Checking OAuth configuration...');
    const statusResponse = await fetch(`${BASE_URL}/api/mcp/notion/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' })
    });
    
    const statusData = await statusResponse.json();
    console.log('OAuth Status:', statusData);
    
    if (!statusData.success || !statusData.data.configured) {
      console.log('\n❌ Notion OAuth not configured!');
      console.log('\n📋 Setup Instructions:');
      console.log('1. Go to https://www.notion.so/my-integrations');
      console.log('2. Create a new integration');
      console.log('3. Set OAuth redirect URI to: http://localhost:3000/api/mcp/notion/callback');
      console.log('4. Add to your .env file:');
      console.log('   NOTION_CLIENT_ID=your_client_id');
      console.log('   NOTION_CLIENT_SECRET=your_client_secret');
      console.log('5. Restart your dev server');
      console.log('\nSee NOTION_OAUTH_SETUP.md for detailed instructions.');
      return;
    }
    
    console.log('✅ OAuth configuration looks good!');
    console.log('🎉 Ready to connect to Notion!');
    console.log('\nNext steps:');
    console.log('1. Go to http://localhost:3000/mcp-test');
    console.log('2. Click "Connect to Notion" button');
    console.log('3. Complete OAuth flow');
    console.log('4. Copy the access token to your .env file');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 Make sure your dev server is running: npm run dev');
  }
}

testNotionSetup();