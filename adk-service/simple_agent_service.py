#!/usr/bin/env python3
"""
Simple Agent Service Implementation
Uses Google GenAI API directly without ADK complexity
"""

import os
import asyncio
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Check for Google API key
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    print("⚠️  Warning: GOOGLE_API_KEY not found in environment variables")
    print("⚠️  Please add GOOGLE_API_KEY to your .env file")
    print("⚠️  Get your API key from: https://aistudio.google.com/apikey")
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    print(f"✅ Google API key configured: {GOOGLE_API_KEY[:10]}...")

# Pydantic models
class AgentConfig(BaseModel):
    name: str
    description: str
    model: str = "gemini-1.5-flash"
    temperature: float = 0.7
    max_tokens: int = 4000
    tools: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    personality: Optional[Dict[str, Any]] = None
    permissions: Optional[Dict[str, Any]] = None
    userId: str

class AgentCreateRequest(BaseModel):
    templateId: Optional[str] = None
    config: AgentConfig

class AgentExecuteRequest(BaseModel):
    agentId: str
    taskDescription: str
    context: Optional[Dict[str, Any]] = None
    userId: str

# In-memory storage
agents_store: Dict[str, Dict[str, Any]] = {}
executions_store: Dict[str, Dict[str, Any]] = {}

# MCP Tool Functions
def notion_search(query: str) -> dict:
    """Search Notion workspace for pages and content."""
    import requests
    
    try:
        response = requests.post('http://localhost:3000/api/mcp/test', 
            json={
                "action": "test_tool",
                "serverId": "notion", 
                "toolName": "API-post-search",
                "testArgs": {"query": query}
            },
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            if data.get('success'):
                return {
                    "query": query,
                    "results": data.get('data', {}).get('result', {}),
                    "source": "notion_workspace"
                }
        
        return {
            "query": query,
            "error": "Failed to search Notion workspace",
            "source": "notion_workspace"
        }
        
    except Exception as e:
        return {
            "query": query,
            "error": f"Notion search error: {str(e)}",
            "source": "notion_workspace"
        }

def notion_get_page(page_id: str) -> dict:
    """Get content from a specific Notion page."""
    import requests
    
    try:
        response = requests.post('http://localhost:3000/api/mcp/test',
            json={
                "action": "test_tool",
                "serverId": "notion",
                "toolName": "API-get-page", 
                "testArgs": {"page_id": page_id}
            },
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            if data.get('success'):
                return {
                    "page_id": page_id,
                    "content": data.get('data', {}).get('result', {}),
                    "source": "notion_workspace"
                }
        
        return {
            "page_id": page_id,
            "error": "Failed to get Notion page",
            "source": "notion_workspace"
        }
        
    except Exception as e:
        return {
            "page_id": page_id,
            "error": f"Notion page error: {str(e)}",
            "source": "notion_workspace"
        }

def notion_list_databases() -> dict:
    """List all databases in the Notion workspace."""
    import requests
    
    try:
        response = requests.post('http://localhost:3000/api/mcp/test',
            json={
                "action": "test_tool",
                "serverId": "notion",
                "toolName": "API-post-search",
                "testArgs": {}
            },
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            if data.get('success'):
                return {
                    "databases": data.get('data', {}).get('result', {}),
                    "source": "notion_workspace"
                }
        
        return {
            "error": "Failed to list Notion databases",
            "source": "notion_workspace"
        }
        
    except Exception as e:
        return {
            "error": f"Notion database error: {str(e)}",
            "source": "notion_workspace"
        }

# Agent templates
AGENT_TEMPLATES = {
    "mcp-assistant": {
        "name": "MCP_Integration_Assistant", 
        "description": "Specialized assistant for working with MCP tools like Notion workspace",
        "system_prompt": """You are an MCP Integration Assistant specialized in working with Model Context Protocol tools, particularly Notion workspace integration.

Your primary capabilities include:
- Searching Notion workspaces for specific content
- Retrieving and analyzing Notion page content
- Listing and exploring Notion databases
- Helping users manage and interact with their Notion data

When users ask to search for something, always prioritize searching their Notion workspace first using notion_search before falling back to web search. 

Be precise about whether you're searching Notion workspace or the web, and clearly indicate the source of your information.

Always provide helpful suggestions for organizing and utilizing Notion content effectively.""",
        "tools": ["notion_search", "notion_get_page", "notion_list_databases"],
        "personality": {
            "communication_style": "helpful",
            "expertise_level": "expert", 
            "response_style": "detailed"
        }
    }
}

# FastAPI app
app = FastAPI(
    title="Simple Agent Service",
    description="Simple agent execution service using Google GenAI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/agents")
async def create_agent(request: AgentCreateRequest):
    """Create a new agent."""
    try:
        agent_id = f"agent_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        # Get template if specified
        template = None
        if request.templateId and request.templateId in AGENT_TEMPLATES:
            template = AGENT_TEMPLATES[request.templateId]
            print(f"🔧 Using template: {request.templateId}")
        
        # Create agent data
        agent_data = {
            "id": agent_id,
            "name": request.config.name or (template["name"] if template else "Default Agent"),
            "description": request.config.description,
            "model": request.config.model,
            "system_prompt": request.config.system_prompt or (template["system_prompt"] if template else "You are a helpful AI assistant."),
            "tools": request.config.tools or (template["tools"] if template else []),
            "userId": request.config.userId,
            "created_at": datetime.now().isoformat(),
            "template_id": request.templateId
        }
        
        agents_store[agent_id] = agent_data
        
        print(f"✅ Created simple agent: {agent_data['name']} ({agent_id})")
        
        return {
            "success": True,
            "data": {
                "id": agent_id,
                "name": agent_data["name"],
                "description": agent_data["description"],
                "created_at": agent_data["created_at"]
            }
        }
        
    except Exception as e:
        print(f"❌ Error creating agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create agent: {str(e)}"
        )

@app.post("/agents/execute")
async def execute_agent(request: AgentExecuteRequest):
    """Execute an agent task using simple GenAI API."""
    try:
        agent_id = request.agentId
        
        # Check if agent exists
        if agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent_data = agents_store[agent_id]
        
        execution_id = f"exec_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        print(f"🤖 Executing simple agent: {agent_data['name']}")
        print(f"📝 Task: {request.taskDescription[:100]}...")
        
        start_time = datetime.now()
        
        # Use simple GenAI API directly
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create system prompt that includes tool instructions
        system_prompt = f"""You are {agent_data['name']}: {agent_data['description']}

{agent_data['system_prompt']}

Available tools for Notion workspace:
1. notion_search(query) - Search Notion workspace for pages
2. notion_get_page(page_id) - Get content from specific page
3. notion_list_databases() - List all databases in workspace

When asked to search Notion workspace, use notion_search function.
When asked to get page content, use notion_get_page function.
When asked to list databases, use notion_list_databases function.

IMPORTANT: Always call the appropriate function and return the actual results.
"""
        
        # Execute the task
        response = model.generate_content(f"{system_prompt}\n\nUser Task: {request.taskDescription}")
        
        # Check if the response contains function calls we need to execute
        final_response = response.text
        tool_results = []
        
        # Simple pattern matching to detect tool calls
        if "notion_search" in response.text.lower() or "search" in request.taskDescription.lower():
            # Extract query and call notion_search
            print("🔍 Detected notion_search request")
            query = request.taskDescription.split("about")[-1].strip().strip("'\"")
            if not query or query == request.taskDescription:
                # Try different extraction patterns
                for keyword in ["for", "about", "containing"]:
                    if keyword in request.taskDescription:
                        query = request.taskDescription.split(keyword)[-1].strip().strip("'\"")
                        break
                else:
                    query = "project planning"  # fallback
            
            result = notion_search(query)
            tool_results.append({"tool": "notion_search", "query": query, "result": result})
            
            # Generate final response with results
            follow_up = model.generate_content(f"Based on this Notion search result: {result}\n\nProvide a helpful summary for the user who asked: {request.taskDescription}")
            final_response = follow_up.text
            
        elif "notion_get_page" in response.text.lower() or ("get" in request.taskDescription.lower() and "page" in request.taskDescription.lower()) or ("content of page" in request.taskDescription.lower()):
            # Extract page ID and call notion_get_page
            print("🔍 Detected notion_get_page request")
            import re
            # Look for page ID pattern in the task description
            page_id_match = re.search(r'[a-f0-9]{32}', request.taskDescription)
            if page_id_match:
                page_id = page_id_match.group()
                print(f"📄 Extracted page ID: {page_id}")
                
                result = notion_get_page(page_id)
                tool_results.append({"tool": "notion_get_page", "page_id": page_id, "result": result})
                
                # Generate final response with results
                follow_up = model.generate_content(f"Based on this Notion page content: {result}\n\nProvide a helpful summary for the user who asked: {request.taskDescription}")
                final_response = follow_up.text
            else:
                final_response = "I need a valid page ID to get page content. Please provide a 32-character page ID."
            
        elif "notion_list_databases" in response.text.lower() or ("list" in request.taskDescription.lower() and "database" in request.taskDescription.lower()) or ("databases" in request.taskDescription.lower()):
            print("🔍 Detected notion_list_databases request")
            result = notion_list_databases()
            tool_results.append({"tool": "notion_list_databases", "result": result})
            
            # Generate final response with results
            follow_up = model.generate_content(f"Based on this Notion databases list: {result}\n\nProvide a helpful summary for the user who asked: {request.taskDescription}")
            final_response = follow_up.text
        
        end_time = datetime.now()
        
        print(f"✅ Simple agent execution completed: {execution_id}")
        print(f"📄 Final response: {final_response[:200]}...")
        print(f"🔧 Tool results: {len(tool_results)} tools called")
        
        return {
            "success": True,
            "data": {
                "executionId": execution_id,
                "agentId": agent_id,
                "status": "completed",
                "steps": len(tool_results),
                "totalCost": 0.01,
                "tokensUsed": len(request.taskDescription) + len(final_response),
                "result": final_response,
                "startTime": start_time.isoformat(),
                "endTime": end_time.isoformat(),
                "stepDetails": tool_results
            }
        }
        
    except Exception as e:
        print(f"❌ Error executing agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent: {str(e)}"
        )

@app.get("/agents/templates")
async def get_templates():
    """Get available agent templates."""
    templates = []
    for template_id, template in AGENT_TEMPLATES.items():
        templates.append({
            "id": template_id,
            "name": template["name"],
            "description": template["description"],
            "tools": template.get("tools", [])
        })
    
    return {
        "success": True,
        "data": {
            "templates": templates
        }
    }

if __name__ == "__main__":
    print("🚀 Starting Simple Agent Service")
    print("📦 Using Google GenAI API directly")
    uvicorn.run(
        "simple_agent_service:app",
        host="127.0.0.1",
        port=8002,
        reload=True,
        log_level="info"
    )