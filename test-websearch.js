// Quick test for web search functionality
async function testWebSearch() {
  try {
    console.log('🧪 Testing web search integration...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TEST_TOKEN' // Replace with actual token
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What are the latest AI developments today?' }
        ],
        model: 'gpt-4o',
        forceWebSearch: true  // Force web search for testing
      })
    });
    
    const data = await response.json();
    
    console.log('✅ Response received:', {
      webSearchEnabled: data.webSearchEnabled,
      webSearchUsed: data.metadata?.webSearchUsed,
      webSearchResults: data.webSearchResults?.length || 0,
      content: data.content?.substring(0, 200) + '...'
    });
    
    if (data.webSearchResults && data.webSearchResults.length > 0) {
      console.log('🌐 Web search results:');
      data.webSearchResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title}`);
        console.log(`     URL: ${result.url}`);
        console.log(`     Snippet: ${result.snippet.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWebSearch();