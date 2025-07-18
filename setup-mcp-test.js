#!/usr/bin/env node

/**
 * Setup script for MCP testing environment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up MCP test environment...');

// Create test directory structure
const testDir = path.join(process.cwd(), 'test-mcp-files');

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
  console.log('✅ Created test-mcp-files directory');
} else {
  console.log('✅ test-mcp-files directory already exists');
}

// Create sample files for testing
const sampleFiles = [
  {
    name: 'test.txt',
    content: 'This is a test file for MCP integration.\nCreated at: ' + new Date().toISOString()
  },
  {
    name: 'sample.md',
    content: '# MCP Test File\n\nThis is a markdown file for testing MCP filesystem operations.\n\n## Features\n- File reading\n- Directory listing\n- File creation'
  },
  {
    name: 'data.json',
    content: JSON.stringify({
      name: 'MCP Test Data',
      version: '1.0.0',
      description: 'Sample JSON data for MCP testing',
      tools: ['read_file', 'write_file', 'list_directory'],
      timestamp: new Date().toISOString()
    }, null, 2)
  }
];

sampleFiles.forEach(file => {
  const filePath = path.join(testDir, file.name);
  fs.writeFileSync(filePath, file.content);
  console.log(`✅ Created ${file.name}`);
});

// Create a subdirectory for testing
const subDir = path.join(testDir, 'subdir');
if (!fs.existsSync(subDir)) {
  fs.mkdirSync(subDir);
  fs.writeFileSync(path.join(subDir, 'nested.txt'), 'This is a nested file for testing directory operations.');
  console.log('✅ Created subdir with nested.txt');
}

console.log('\n🎉 MCP test environment setup complete!');
console.log('📁 Files created in test-mcp-files/:');
console.log('   - test.txt');
console.log('   - sample.md');
console.log('   - data.json');
console.log('   - subdir/nested.txt');
console.log('\n🧪 Now you can test MCP integration:');
console.log('   1. Start your dev server: npm run dev');
console.log('   2. Visit: http://localhost:3000/mcp-test');
console.log('   3. Click "Enable" on the Filesystem server');
console.log('   4. Click on tool badges to test them');