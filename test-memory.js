// Simple test script to call the cache clear endpoint
const userId = 'user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU';

async function clearCaches() {
  try {
    console.log('🧹 Clearing caches...');
    
    const response = await fetch('http://localhost:3000/api/debug/clear-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You might need to add auth headers here
      }
    });
    
    const result = await response.json();
    console.log('Cache clear result:', result);
    
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

async function testMemory() {
  try {
    console.log('🧠 Testing memory with "who am i" query...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You might need to add auth headers here
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'who am i' }],
        model: 'gpt-4o',
        stream: false,
        includeMemory: true
      })
    });
    
    const result = await response.json();
    console.log('Chat response metadata:', result.metadata);
    
  } catch (error) {
    console.error('Failed to test memory:', error);
  }
}

// Run the tests
(async () => {
  await clearCaches();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  await testMemory();
})();