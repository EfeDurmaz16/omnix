# Firecrawl web search tool
import os
import httpx
from typing import Dict, Any

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
                        'title': item.get('title', 'No title'),
                        'url': item.get('url', ''),
                        'content': item.get('description', '')[:1000],  # Limit content length
                        'snippet': item.get('description', '')[:300]
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