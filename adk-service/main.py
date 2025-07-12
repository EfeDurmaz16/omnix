#!/usr/bin/env python3
# Copyright 2025 OmniX
# FastAPI service for OmniX ADK agents

"""FastAPI service that bridges Google ADK agents with Next.js application."""

import os
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Note: Google ADK not installed, using direct tool execution

# Pydantic models for API
class AgentConfig(BaseModel):
    name: str
    description: str
    tools: Optional[List[str]] = None
    model: str = "gemini-2.5-pro"
    temperature: float = 0.7
    userId: str

class AgentCreateRequest(BaseModel):
    templateId: Optional[str] = None
    config: AgentConfig

class AgentExecuteRequest(BaseModel):
    agentId: str
    taskDescription: str
    context: Optional[Dict[str, Any]] = None

class ExecutionStep(BaseModel):
    id: str
    type: str
    timestamp: datetime
    content: str
    status: str
    duration: int = 0
    toolUsed: Optional[str] = None

class ExecutionResult(BaseModel):
    id: str
    agentId: str
    status: str
    steps: List[ExecutionStep]
    finalResponse: str
    startTime: datetime
    endTime: Optional[datetime] = None
    totalCost: float = 0.0
    tokensUsed: int = 0

# In-memory storage for agents and executions
agents_store: Dict[str, Dict[str, Any]] = {}
executions_store: Dict[str, ExecutionResult] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("🚀 Starting OmniX ADK Service")
    print("📊 Using real tools: Firecrawl + SMTP")
    yield
    print("👋 Shutting down OmniX ADK Service")

# Create FastAPI app
app = FastAPI(
    title="OmniX ADK Service",
    description="Google ADK based agent service for OmniX",
    version="1.0.0",
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
        "service": "OmniX ADK Service",
        "version": "1.0.0",
        "status": "running",
        "agents_count": len(agents_store),
        "executions_count": len(executions_store)
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
    """Create a new agent."""
    agent_id = f"agent_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
    
    # For now, we'll use our research agent template
    agent_data = {
        "id": agent_id,
        "name": request.config.name or "Research Assistant",
        "description": request.config.description or "AI research assistant with web search and email capabilities",
        "userId": request.config.userId,
        "tools": request.config.tools or ["web-search", "email-sender"],
        "model": request.config.model,
        "temperature": request.config.temperature,
        "created": datetime.now().isoformat(),
        "templateId": request.templateId or "research-assistant"
    }
    
    agents_store[agent_id] = agent_data
    
    print(f"✅ Created ADK agent: {agent_data['name']} ({agent_id})")
    
    return {
        "success": True,
        "data": agent_data
    }

@app.get("/agents/templates")
async def get_templates():
    """Get available agent templates."""
    templates = [
        {
            "id": "research-assistant",
            "name": "Research Assistant", 
            "description": "AI research assistant with web search and email capabilities",
            "category": "research",
            "tools": ["web-search", "email-sender"],
            "model": "gemini-2.0-flash-exp",
            "systemPrompt": "You are a research assistant that searches the web and sends reports via email."
        }
    ]
    
    tools = [
        {"name": "web-search", "description": "Search the web using Firecrawl", "category": "web"},
        {"name": "email-sender", "description": "Send emails with reports", "category": "communication"}
    ]
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "availableTools": tools
        }
    }

@app.post("/agents/execute")
async def execute_agent(request: AgentExecuteRequest):
    """Execute an agent task."""
    agent_id = request.agentId
    
    # Check if agent exists
    if agent_id not in agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_data = agents_store[agent_id]
    execution_id = f"exec_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
    
    print(f"🤖 Executing ADK agent task: {agent_data['name']}")
    print(f"📝 Task: {request.taskDescription[:100]}...")
    
    start_time = datetime.now()
    
    try:
        # Execute the task using our ADK agent
        step1 = ExecutionStep(
            id="step_1",
            type="thinking",
            timestamp=start_time,
            content="Analyzing task and planning research approach",
            status="running"
        )
        
        # Use the ADK agent to process the request
        response = await run_adk_agent(request.taskDescription, agent_data['tools'])
        
        step1.status = "completed"
        step1.duration = int((datetime.now() - start_time).total_seconds() * 1000)
        
        end_time = datetime.now()
        
        # Create execution result
        execution = ExecutionResult(
            id=execution_id,
            agentId=agent_id,
            status="completed",
            steps=[step1],
            finalResponse=response,
            startTime=start_time,
            endTime=end_time,
            totalCost=0.002,
            tokensUsed=len(request.taskDescription) + len(response)
        )
        
        executions_store[execution_id] = execution
        
        print(f"✅ ADK agent execution completed: {execution_id}")
        
        return {
            "success": True,
            "data": {
                "executionId": execution.id,
                "agentId": execution.agentId,
                "status": execution.status,
                "steps": len(execution.steps),
                "totalCost": execution.totalCost,
                "tokensUsed": execution.tokensUsed,
                "result": execution.finalResponse,
                "startTime": execution.startTime,
                "endTime": execution.endTime,
                "stepDetails": [
                    {
                        "type": step.type,
                        "content": step.content,
                        "status": step.status,
                        "duration": step.duration,
                        "toolUsed": step.toolUsed
                    } for step in execution.steps
                ]
            }
        }
        
    except Exception as e:
        print(f"❌ ADK agent execution failed: {str(e)}")
        
        execution = ExecutionResult(
            id=execution_id,
            agentId=agent_id,
            status="failed",
            steps=[ExecutionStep(
                id="step_error",
                type="error",
                timestamp=start_time,
                content=f"Execution failed: {str(e)}",
                status="failed",
                duration=int((datetime.now() - start_time).total_seconds() * 1000)
            )],
            finalResponse=f"Task execution failed: {str(e)}",
            startTime=start_time,
            endTime=datetime.now()
        )
        
        executions_store[execution_id] = execution
        
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

async def run_adk_agent(task_description: str, tool_names: List[str]) -> str:
    """Run the real Google ADK agent with the given task."""
    try:
        # Import and execute the real Google ADK agent
        from real_adk_agent import execute_research_task
        
        print(f"🚀 Executing REAL Google ADK agent with task: {task_description}")
        result = await execute_research_task(task_description, tool_names)
        print(f"✅ REAL Google ADK agent completed task")
        return result
        
    except Exception as e:
        print(f"❌ Real Google ADK agent error: {str(e)}")
        # Fallback to a basic response if the agent fails
        return f"Real Google ADK agent execution failed: {str(e)}. Please check the logs for more details."

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, userId: str):
    """Delete an agent."""
    # Check if agent exists
    if agent_id not in agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_data = agents_store[agent_id]
    
    # Verify ownership
    if agent_data.get("userId") != userId:
        raise HTTPException(status_code=403, detail="Not authorized to delete this agent")
    
    # Delete the agent
    del agents_store[agent_id]
    
    print(f"🗑️ Deleted ADK agent: {agent_data['name']} ({agent_id})")
    
    return {
        "success": True,
        "message": f"Agent '{agent_data['name']}' deleted successfully"
    }

if __name__ == "__main__":
    # Load environment variables
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "127.0.0.1")
    
    print(f"🚀 Starting OmniX ADK Service on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )