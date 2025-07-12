# Copyright 2025 OmniX
# Web research sub-agent using Firecrawl

"""Web research sub-agent for conducting searches using Firecrawl."""

import os
import httpx
from typing import Dict, List, Any
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

MODEL = "gemini-2.5-pro"

async def firecrawl_web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
    """Search the web using Firecrawl API for current information.
    
    Args:
        query: Search query to find information
        num_results: Number of results to return (default 5)
        
    Returns:
        Dictionary with search results
    """
    api_key = os.getenv('FIRECRAWL_API_KEY')
    
    if not api_key:
        return {
            "success": False,
            "error": "Firecrawl API key not configured",
            "results": []
        }
    
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            "query": query,
            "pageOptions": {
                "onlyMainContent": True
            },
            "limit": num_results
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.firecrawl.dev/v1/search',
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                results = []
                
                for item in data.get('data', []):
                    results.append({
                        'title': item.get('metadata', {}).get('title', 'No title'),
                        'url': item.get('metadata', {}).get('sourceURL', ''),
                        'content': item.get('markdown', '')[:1000],  # Limit content length
                        'snippet': item.get('markdown', '')[:300]
                    })
                
                return {
                    "success": True,
                    "query": query,
                    "results": results,
                    "count": len(results)
                }
            else:
                return {
                    "success": False,
                    "error": f"Firecrawl API error: {response.status_code}",
                    "results": []
                }
                
    except Exception as e:
        return {
            "success": False,
            "error": f"Search failed: {str(e)}",
            "results": []
        }

# Create the Firecrawl tool using ADK FunctionTool
firecrawl_tool = FunctionTool(firecrawl_web_search)

# Create the web research agent
web_research_agent = LlmAgent(
    name="web_research_agent",
    model=MODEL,
    description="Conducts web research using Firecrawl to find current information",
    instruction="""
    You are a web research specialist. Your role is to:
    
    1. Take research queries and conduct thorough web searches
    2. Use the Firecrawl search tool to find current, relevant information
    3. Analyze and summarize the search results
    4. Return structured findings with sources
    
    When conducting research:
    - Search for multiple aspects of the topic
    - Look for recent information and current trends
    - Gather information from authoritative sources
    - Summarize key findings clearly
    - Always include source URLs
    
    Return your findings in this format:
    ## Research Results for: [Query]
    
    ### Key Findings:
    - [Finding 1]
    - [Finding 2]
    - [Finding 3]
    
    ### Detailed Information:
    [Comprehensive summary of findings]
    
    ### Sources:
    1. [Title] - [URL]
    2. [Title] - [URL]
    """,
    tools=[firecrawl_tool],
)