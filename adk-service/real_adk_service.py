#!/usr/bin/env python3
"""
Real Google ADK Service Implementation
Integrates with Google's official Agent Development Kit
"""

import os
import asyncio
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Google ADK imports
from google.adk.agents import Agent, LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.adk.planners import BuiltInPlanner
from google.adk.memory import InMemoryMemoryService
from google.genai import types
from google.adk.tools import google_search, code_executor

# Load environment variables
load_dotenv()

# Pydantic models
class AgentConfig(BaseModel):
    name: str
    description: str
    model: str = "gemini-2.0-flash-exp"
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

class ExecutionResult(BaseModel):
    id: str
    agentId: str
    status: str
    steps: List[Dict[str, Any]]
    finalResponse: str
    startTime: datetime
    endTime: Optional[datetime] = None
    totalCost: float = 0.0
    tokensUsed: int = 0

# Global storage
agents_store: Dict[str, Dict[str, Any]] = {}
executions_store: Dict[str, ExecutionResult] = {}
adk_agents: Dict[str, Agent] = {}
session_service = InMemorySessionService()
memory_service = InMemoryMemoryService()

# Built-in tools
def get_weather(city: str, country: str = "US") -> dict:
    """Get current weather information for a city.
    
    Args:
        city: The city name
        country: The country code (default: US)
        
    Returns:
        Dictionary with weather information
    """
    # Mock weather data for demonstration
    import random
    conditions = ["sunny", "cloudy", "rainy", "partly cloudy", "stormy"]
    return {
        "city": city,
        "country": country,
        "temperature": f"{random.randint(10, 35)}°C",
        "condition": random.choice(conditions),
        "humidity": f"{random.randint(40, 90)}%",
        "wind_speed": f"{random.randint(5, 25)} km/h",
        "forecast": "Stable conditions expected"
    }

def send_email(recipient: str, subject: str, body: str) -> dict:
    """Send an email to a recipient.
    
    Args:
        recipient: Email address of recipient
        subject: Email subject line
        body: Email body content
        
    Returns:
        Dictionary with send status
    """
    # Mock email sending
    return {
        "status": "sent",
        "recipient": recipient,
        "subject": subject,
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now().isoformat()
    }

def analyze_data(data: Union[str, List, Dict]) -> dict:
    """Analyze provided data and return insights.
    
    Args:
        data: Data to analyze (text, list, or dictionary)
        
    Returns:
        Dictionary with analysis results
    """
    if isinstance(data, str):
        word_count = len(data.split())
        char_count = len(data)
        return {
            "type": "text_analysis",
            "word_count": word_count,
            "character_count": char_count,
            "sentiment": "neutral",  # Mock sentiment
            "key_topics": ["general", "information"]
        }
    elif isinstance(data, list):
        return {
            "type": "list_analysis",
            "length": len(data),
            "data_types": list(set(type(item).__name__ for item in data)),
            "summary": f"List contains {len(data)} items"
        }
    elif isinstance(data, dict):
        return {
            "type": "dict_analysis",
            "key_count": len(data.keys()),
            "keys": list(data.keys()),
            "summary": f"Dictionary with {len(data)} key-value pairs"
        }
    else:
        return {"type": "unknown", "message": "Unsupported data type"}

def web_search(query: str, num_results: int = 5) -> dict:
    """Search the web for information.
    
    Args:
        query: Search query
        num_results: Number of results to return
        
    Returns:
        Dictionary with search results
    """
    # Mock web search results
    results = []
    for i in range(min(num_results, 5)):
        results.append({
            "title": f"Search result {i+1} for '{query}'",
            "url": f"https://example.com/result{i+1}",
            "snippet": f"This is a mock search result snippet for {query}. It contains relevant information about the search topic.",
            "relevance_score": 0.9 - (i * 0.1)
        })
    
    return {
        "query": query,
        "results_count": len(results),
        "results": results,
        "search_time": "0.15s"
    }

# Agent templates
AGENT_TEMPLATES = {
    "research-assistant": {
        "name": "Research Assistant",
        "description": "AI research assistant with web search and analysis capabilities",
        "system_prompt": """You are a highly skilled research assistant. You help users find information, analyze data, and provide comprehensive research summaries.

Your capabilities include:
- Web search for current information
- Data analysis and insights
- Email communication for sharing results
- Weather information when needed

Always provide well-researched, accurate information with proper citations when possible. Be thorough but concise in your responses.""",
        "tools": ["web_search", "analyze_data", "send_email", "get_weather"],
        "personality": {
            "communication_style": "professional",
            "expertise_level": "expert",
            "response_style": "detailed"
        }
    },
    "customer-service": {
        "name": "Customer Service Agent",
        "description": "Friendly customer service agent for handling inquiries and support",
        "system_prompt": """You are a helpful customer service agent. Your role is to assist customers with their inquiries, provide support, and ensure a positive experience.

Key guidelines:
- Always be polite, friendly, and professional
- Listen carefully to customer concerns
- Provide clear, helpful solutions
- If you can't solve an issue, escalate appropriately
- Follow up to ensure satisfaction

You have access to tools for research, communication, and basic data analysis.""",
        "tools": ["web_search", "send_email", "analyze_data"],
        "personality": {
            "communication_style": "friendly",
            "expertise_level": "intermediate",
            "response_style": "helpful"
        }
    },
    "financial-advisor": {
        "name": "Financial Advisor",
        "description": "AI financial advisor for investment and financial planning guidance",
        "system_prompt": """You are a knowledgeable financial advisor. You provide guidance on investments, financial planning, and market analysis.

Important disclaimers:
- This is for educational purposes only
- Not personalized financial advice
- Recommend consulting with qualified professionals
- Consider risk tolerance and individual circumstances

Your tools help you research market information, analyze financial data, and communicate findings.""",
        "tools": ["web_search", "analyze_data", "send_email"],
        "personality": {
            "communication_style": "professional",
            "expertise_level": "expert",
            "response_style": "analytical"
        }
    },
    "academic-researcher": {
        "name": "Academic Researcher",
        "description": "Specialized academic research agent for scholarly work",
        "system_prompt": """You are an academic researcher specializing in literature review, data analysis, and scholarly writing.

Your research approach:
- Systematic literature review
- Critical analysis of sources
- Evidence-based conclusions
- Proper academic citations
- Methodical data analysis

Use your tools to gather information, analyze research data, and communicate findings in academic formats.""",
        "tools": ["web_search", "analyze_data", "send_email"],
        "personality": {
            "communication_style": "academic",
            "expertise_level": "expert",
            "response_style": "scholarly"
        }
    },
    "weather-assistant": {
        "name": "Weather Assistant",
        "description": "Specialized weather information and forecasting assistant",
        "system_prompt": """You are a weather assistant providing current conditions, forecasts, and weather-related advice.

Your services include:
- Current weather conditions
- Weather forecasts
- Weather-related travel advice
- Seasonal information
- Climate data analysis

Always provide accurate, up-to-date weather information and helpful context.""",
        "tools": ["get_weather", "web_search", "analyze_data"],
        "personality": {
            "communication_style": "friendly",
            "expertise_level": "specialist",
            "response_style": "informative"
        }
    }
}

def create_adk_agent(config: AgentConfig, template_id: Optional[str] = None) -> Agent:
    """Create a new ADK agent instance."""
    
    # Get template if specified
    template = None
    if template_id and template_id in AGENT_TEMPLATES:
        template = AGENT_TEMPLATES[template_id]
    
    # Prepare tools
    available_tools = []
    tool_names = config.tools or (template["tools"] if template else ["web_search"])
    
    for tool_name in tool_names:
        if tool_name == "web_search":
            available_tools.append(FunctionTool(web_search))
        elif tool_name == "get_weather":
            available_tools.append(FunctionTool(get_weather))
        elif tool_name == "send_email":
            available_tools.append(FunctionTool(send_email))
        elif tool_name == "analyze_data":
            available_tools.append(FunctionTool(analyze_data))
    
    # Prepare system prompt
    system_prompt = config.system_prompt or (template["system_prompt"] if template else "You are a helpful AI assistant.")
    
    # Create the agent
    agent = LlmAgent(
        name=config.name,
        model=config.model,
        description=config.description,
        instruction=system_prompt,
        tools=available_tools,
        planner=BuiltInPlanner(
            model=config.model,
            include_thoughts=True
        )
    )
    
    return agent

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("🚀 Starting Real Google ADK Service")
    print("📦 Using Google's official Agent Development Kit")
    yield
    print("👋 Shutting down Real Google ADK Service")

# Create FastAPI app
app = FastAPI(
    title="Real Google ADK Service",
    description="Official Google ADK integration service for OmniX",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Real Google ADK Service",
        "version": "2.0.0",
        "status": "running",
        "adk_version": "official",
        "agents_count": len(agents_store),
        "executions_count": len(executions_store),
        "templates_available": len(AGENT_TEMPLATES)
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/agents")
async def get_agents(userId: str):
    """Get all agents for a user."""
    user_agents = [
        agent for agent in agents_store.values() 
        if agent.get("userId") == userId
    ]
    return {
        "success": True,
        "data": user_agents
    }

@app.post("/agents")
async def create_agent(request: AgentCreateRequest):
    """Create a new agent using Google ADK."""
    try:
        agent_id = f"agent_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        # Create the ADK agent
        adk_agent = create_adk_agent(request.config, request.templateId)
        
        # Store the ADK agent
        adk_agents[agent_id] = adk_agent
        
        # Create agent metadata
        agent_data = {
            "id": agent_id,
            "name": request.config.name,
            "description": request.config.description,
            "userId": request.config.userId,
            "model": request.config.model,
            "temperature": request.config.temperature,
            "max_tokens": request.config.max_tokens,
            "tools": request.config.tools or [],
            "templateId": request.templateId,
            "system_prompt": request.config.system_prompt,
            "personality": request.config.personality,
            "permissions": request.config.permissions,
            "created": datetime.now().isoformat(),
            "status": "active"
        }
        
        agents_store[agent_id] = agent_data
        
        print(f"✅ Created real ADK agent: {agent_data['name']} ({agent_id})")
        
        return {
            "success": True,
            "data": agent_data
        }
        
    except Exception as e:
        print(f"❌ Error creating agent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create agent: {str(e)}"
        )

@app.get("/agents/templates")
async def get_templates():
    """Get available agent templates."""
    templates = []
    for template_id, template_data in AGENT_TEMPLATES.items():
        templates.append({
            "id": template_id,
            "name": template_data["name"],
            "description": template_data["description"],
            "tools": template_data["tools"],
            "personality": template_data["personality"],
            "category": "builtin"
        })
    
    # Available tools
    available_tools = [
        {"name": "web_search", "description": "Search the web for information", "category": "web"},
        {"name": "get_weather", "description": "Get weather information for cities", "category": "weather"},
        {"name": "send_email", "description": "Send emails to recipients", "category": "communication"},
        {"name": "analyze_data", "description": "Analyze various types of data", "category": "analysis"}
    ]
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "availableTools": available_tools
        }
    }

@app.post("/agents/execute")
async def execute_agent(request: AgentExecuteRequest):
    """Execute an agent task using Google ADK."""
    try:
        agent_id = request.agentId
        
        # Check if agent exists
        if agent_id not in adk_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        adk_agent = adk_agents[agent_id]
        agent_data = agents_store[agent_id]
        
        execution_id = f"exec_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        print(f"🤖 Executing real ADK agent: {agent_data['name']}")
        print(f"📝 Task: {request.taskDescription[:100]}...")
        
        start_time = datetime.now()
        
        # Create session
        session = session_service.create_session(
            app_name="omnix-adk",
            user_id=request.userId,
            session_id=execution_id
        )
        
        # Create runner
        runner = Runner(
            agent=adk_agent,
            app_name="omnix-adk",
            session_service=session_service
        )
        
        # Prepare user message
        user_content = types.Content(
            role="user",
            parts=[types.Part(text=request.taskDescription)]
        )
        
        # Execute the agent
        steps = []
        final_response = ""
        
        for event in runner.run(
            user_id=request.userId,
            session_id=execution_id,
            new_message=user_content
        ):
            # Track execution steps
            step_data = {
                "timestamp": datetime.now().isoformat(),
                "type": event.type if hasattr(event, 'type') else "unknown",
                "author": event.author if hasattr(event, 'author') else "system",
                "content": str(event.content.parts[0].text) if event.content and event.content.parts else ""
            }
            steps.append(step_data)
            
            # Get final response
            if hasattr(event, 'is_final_response') and event.is_final_response():
                final_response = event.content.parts[0].text if event.content and event.content.parts else ""
        
        end_time = datetime.now()
        
        # Create execution result
        execution_result = ExecutionResult(
            id=execution_id,
            agentId=agent_id,
            status="completed",
            steps=steps,
            finalResponse=final_response,
            startTime=start_time,
            endTime=end_time,
            totalCost=0.01,  # Mock cost
            tokensUsed=len(request.taskDescription) + len(final_response)
        )
        
        executions_store[execution_id] = execution_result
        
        print(f"✅ ADK agent execution completed: {execution_id}")
        
        return {
            "success": True,
            "data": {
                "executionId": execution_result.id,
                "agentId": execution_result.agentId,
                "status": execution_result.status,
                "steps": len(execution_result.steps),
                "totalCost": execution_result.totalCost,
                "tokensUsed": execution_result.tokensUsed,
                "result": execution_result.finalResponse,
                "startTime": execution_result.startTime.isoformat(),
                "endTime": execution_result.endTime.isoformat() if execution_result.endTime else None,
                "stepDetails": execution_result.steps
            }
        }
        
    except Exception as e:
        print(f"❌ Error executing agent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent: {str(e)}"
        )

@app.get("/agents/stats")
async def get_agent_stats():
    """Get statistics about agents and executions."""
    return {
        "success": True,
        "data": {
            "total_agents": len(agents_store),
            "total_executions": len(executions_store),
            "active_agents": len([a for a in agents_store.values() if a.get("status") == "active"]),
            "templates_available": len(AGENT_TEMPLATES),
            "service_version": "2.0.0-adk-official"
        }
    }

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, userId: str):
    """Delete an agent."""
    try:
        if agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent_data = agents_store[agent_id]
        if agent_data["userId"] != userId:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Remove from stores
        del agents_store[agent_id]
        if agent_id in adk_agents:
            del adk_agents[agent_id]
        
        print(f"🗑️ Deleted ADK agent: {agent_id}")
        
        return {
            "success": True,
            "message": "Agent deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting agent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete agent: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        "real_adk_service:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    ) 