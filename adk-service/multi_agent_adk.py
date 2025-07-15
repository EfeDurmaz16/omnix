#!/usr/bin/env python3
"""
Multi-Agent Google ADK Service Implementation
Comprehensive implementation with LLMAgent, SequentialAgent, ParallelAgent, LoopAgent
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
from google.adk.agents import Agent, LlmAgent, SequentialAgent, ParallelAgent, LoopAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.adk.planners import BuiltInPlanner
from google.adk.memory import InMemoryMemoryService
from google.genai import types
import time

# Load environment variables
load_dotenv()

# Pydantic models
class AgentConfig(BaseModel):
    name: str
    description: str
    agent_type: str = "llm"  # llm, sequential, parallel, loop
    model: str = "gemini-2.0-flash-exp"
    temperature: float = 0.7
    max_tokens: int = 4000
    tools: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    sub_agents: Optional[List[str]] = None  # For workflow agents
    max_iterations: Optional[int] = 5  # For loop agents
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

# Advanced tools for multi-agent workflows
def research_topic(topic: str, depth: str = "medium") -> dict:
    """Research a topic and return detailed information.
    
    Args:
        topic: The topic to research
        depth: Research depth (basic, medium, comprehensive)
        
    Returns:
        Dictionary with research findings
    """
    # Simulate research delay
    time.sleep(1)
    
    findings = {
        "topic": topic,
        "depth": depth,
        "summary": f"Research findings on {topic}",
        "key_points": [
            f"Key finding 1 about {topic}",
            f"Key finding 2 about {topic}",
            f"Key finding 3 about {topic}"
        ],
        "sources": [
            f"https://example.com/source1-{topic.replace(' ', '-')}",
            f"https://example.com/source2-{topic.replace(' ', '-')}"
        ],
        "confidence": 0.85,
        "last_updated": datetime.now().isoformat()
    }
    
    if depth == "comprehensive":
        findings["detailed_analysis"] = f"Comprehensive analysis of {topic} including historical context, current trends, and future implications."
        findings["related_topics"] = [f"Related topic 1 to {topic}", f"Related topic 2 to {topic}"]
    
    return findings

def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of the given text.
    
    Args:
        text: Text to analyze
        
    Returns:
        Dictionary with sentiment analysis
    """
    # Mock sentiment analysis
    word_count = len(text.split())
    positive_words = ["good", "great", "excellent", "amazing", "wonderful", "fantastic"]
    negative_words = ["bad", "terrible", "awful", "horrible", "disappointing"]
    
    positive_count = sum(1 for word in text.lower().split() if word in positive_words)
    negative_count = sum(1 for word in text.lower().split() if word in negative_words)
    
    if positive_count > negative_count:
        sentiment = "positive"
        confidence = 0.7 + (positive_count - negative_count) * 0.1
    elif negative_count > positive_count:
        sentiment = "negative"
        confidence = 0.7 + (negative_count - positive_count) * 0.1
    else:
        sentiment = "neutral"
        confidence = 0.6
    
    return {
        "sentiment": sentiment,
        "confidence": min(confidence, 0.95),
        "word_count": word_count,
        "positive_indicators": positive_count,
        "negative_indicators": negative_count,
        "analysis_timestamp": datetime.now().isoformat()
    }

def generate_summary(text: str, max_length: int = 100) -> dict:
    """Generate a summary of the given text.
    
    Args:
        text: Text to summarize
        max_length: Maximum length of summary
        
    Returns:
        Dictionary with summary
    """
    # Simple extractive summarization
    sentences = text.split('.')
    if len(sentences) <= 2:
        summary = text
    else:
        # Take first and last sentences for simplicity
        summary = f"{sentences[0]}. {sentences[-1]}"
    
    if len(summary) > max_length:
        summary = summary[:max_length-3] + "..."
    
    return {
        "original_length": len(text),
        "summary": summary,
        "summary_length": len(summary),
        "compression_ratio": len(summary) / len(text) if text else 0,
        "sentences_processed": len(sentences),
        "generated_at": datetime.now().isoformat()
    }

def classify_content(content: str) -> dict:
    """Classify content into categories.
    
    Args:
        content: Content to classify
        
    Returns:
        Dictionary with classification results
    """
    # Simple keyword-based classification
    categories = {
        "technology": ["ai", "machine learning", "software", "computer", "tech", "digital", "algorithm"],
        "business": ["company", "revenue", "profit", "market", "sales", "customer", "strategy"],
        "science": ["research", "study", "experiment", "data", "analysis", "hypothesis", "theory"],
        "health": ["medical", "health", "disease", "treatment", "patient", "doctor", "medicine"],
        "education": ["learning", "student", "school", "education", "knowledge", "teaching", "academic"]
    }
    
    content_lower = content.lower()
    scores = {}
    
    for category, keywords in categories.items():
        score = sum(1 for keyword in keywords if keyword in content_lower)
        scores[category] = score / len(keywords)
    
    primary_category = max(scores, key=scores.get)
    confidence = scores[primary_category]
    
    return {
        "primary_category": primary_category,
        "confidence": confidence,
        "all_scores": scores,
        "content_length": len(content),
        "classified_at": datetime.now().isoformat()
    }

def validate_data(data: Any, validation_type: str = "general") -> dict:
    """Validate data according to specified criteria.
    
    Args:
        data: Data to validate
        validation_type: Type of validation (general, email, number, text)
        
    Returns:
        Dictionary with validation results
    """
    result = {
        "is_valid": True,
        "validation_type": validation_type,
        "errors": [],
        "warnings": [],
        "data_type": type(data).__name__,
        "validated_at": datetime.now().isoformat()
    }
    
    if validation_type == "email" and isinstance(data, str):
        if "@" not in data or "." not in data:
            result["is_valid"] = False
            result["errors"].append("Invalid email format")
        elif len(data) < 5:
            result["warnings"].append("Email seems unusually short")
    
    elif validation_type == "number" and isinstance(data, str):
        try:
            float(data)
        except ValueError:
            result["is_valid"] = False
            result["errors"].append("Not a valid number")
    
    elif validation_type == "text":
        if isinstance(data, str):
            if len(data) < 10:
                result["warnings"].append("Text is quite short")
            if len(data) > 1000:
                result["warnings"].append("Text is very long")
        else:
            result["is_valid"] = False
            result["errors"].append("Expected text data")
    
    return result

# Advanced agent templates for multi-agent workflows
MULTI_AGENT_TEMPLATES = {
    "research-team": {
        "name": "Research Team",
        "description": "Multi-agent research team with specialized roles",
        "agent_type": "sequential",
        "sub_agents": [
            {
                "name": "Topic Researcher",
                "role": "Research topics and gather information",
                "tools": ["research_topic"],
                "system_prompt": "You are a researcher who gathers comprehensive information about topics. Use the research_topic tool to find detailed information."
            },
            {
                "name": "Content Analyzer",
                "role": "Analyze and classify content",
                "tools": ["analyze_sentiment", "classify_content"],
                "system_prompt": "You are an analyst who processes and categorizes research content. Use sentiment analysis and classification tools."
            },
            {
                "name": "Report Generator",
                "role": "Generate summaries and reports",
                "tools": ["generate_summary"],
                "system_prompt": "You are a report writer who creates clear, concise summaries of research findings."
            }
        ]
    },
    "content-processing": {
        "name": "Content Processing Pipeline",
        "description": "Parallel processing for content analysis",
        "agent_type": "parallel",
        "sub_agents": [
            {
                "name": "Sentiment Analyzer",
                "role": "Analyze sentiment of content",
                "tools": ["analyze_sentiment"],
                "system_prompt": "You specialize in sentiment analysis. Analyze the emotional tone of content."
            },
            {
                "name": "Content Classifier",
                "role": "Classify content by category",
                "tools": ["classify_content"],
                "system_prompt": "You specialize in content classification. Categorize content into appropriate topics."
            },
            {
                "name": "Summary Generator",
                "role": "Generate content summaries",
                "tools": ["generate_summary"],
                "system_prompt": "You specialize in summarization. Create concise summaries of longer content."
            }
        ]
    },
    "quality-assurance": {
        "name": "Quality Assurance Loop",
        "description": "Iterative quality checking and improvement",
        "agent_type": "loop",
        "max_iterations": 3,
        "sub_agents": [
            {
                "name": "Content Validator",
                "role": "Validate and check content quality",
                "tools": ["validate_data"],
                "system_prompt": "You validate content quality. Check for errors, inconsistencies, and areas for improvement."
            },
            {
                "name": "Content Improver",
                "role": "Improve content based on validation",
                "tools": ["generate_summary"],
                "system_prompt": "You improve content based on validation feedback. Make necessary corrections and enhancements."
            }
        ]
    },
    "customer-service-team": {
        "name": "Customer Service Team",
        "description": "Multi-agent customer service with escalation",
        "agent_type": "sequential",
        "sub_agents": [
            {
                "name": "First Response Agent",
                "role": "Handle initial customer inquiries",
                "tools": ["analyze_sentiment", "classify_content"],
                "system_prompt": "You are the first point of contact for customer service. Analyze customer sentiment and classify their inquiry."
            },
            {
                "name": "Specialist Agent",
                "role": "Provide specialized support",
                "tools": ["research_topic", "validate_data"],
                "system_prompt": "You are a specialist who handles complex customer issues. Research solutions and validate information."
            },
            {
                "name": "Follow-up Agent",
                "role": "Generate follow-up communications",
                "tools": ["generate_summary"],
                "system_prompt": "You handle follow-up communications. Create summaries of interactions and next steps."
            }
        ]
    }
}

def create_tool_from_name(tool_name: str) -> FunctionTool:
    """Create a FunctionTool from a tool name."""
    tool_map = {
        "research_topic": research_topic,
        "analyze_sentiment": analyze_sentiment,
        "generate_summary": generate_summary,
        "classify_content": classify_content,
        "validate_data": validate_data
    }
    
    if tool_name in tool_map:
        return FunctionTool(tool_map[tool_name])
    else:
        raise ValueError(f"Unknown tool: {tool_name}")

def create_multi_agent_system(config: AgentConfig, template_id: Optional[str] = None) -> Agent:
    """Create a multi-agent system based on configuration."""
    
    # Get template if specified
    template = None
    if template_id and template_id in MULTI_AGENT_TEMPLATES:
        template = MULTI_AGENT_TEMPLATES[template_id]
        config.agent_type = template["agent_type"]
    
    if config.agent_type == "llm":
        # Create a single LLM agent
        tools = []
        if config.tools:
            tools = [create_tool_from_name(tool) for tool in config.tools]
        
        return LlmAgent(
            name=config.name,
            model=config.model,
            description=config.description,
            instruction=config.system_prompt or "You are a helpful AI assistant.",
            tools=tools,
            planner=BuiltInPlanner(model=config.model, include_thoughts=True)
        )
    
    elif config.agent_type == "sequential":
        # Create sub-agents
        sub_agents = []
        if template and "sub_agents" in template:
            for sub_agent_config in template["sub_agents"]:
                tools = [create_tool_from_name(tool) for tool in sub_agent_config["tools"]]
                sub_agent = LlmAgent(
                    name=sub_agent_config["name"],
                    model=config.model,
                    description=sub_agent_config["role"],
                    instruction=sub_agent_config["system_prompt"],
                    tools=tools,
                    planner=BuiltInPlanner(model=config.model, include_thoughts=True)
                )
                sub_agents.append(sub_agent)
        
        return SequentialAgent(
            name=config.name,
            description=config.description,
            sub_agents=sub_agents
        )
    
    elif config.agent_type == "parallel":
        # Create sub-agents for parallel execution
        sub_agents = []
        if template and "sub_agents" in template:
            for sub_agent_config in template["sub_agents"]:
                tools = [create_tool_from_name(tool) for tool in sub_agent_config["tools"]]
                sub_agent = LlmAgent(
                    name=sub_agent_config["name"],
                    model=config.model,
                    description=sub_agent_config["role"],
                    instruction=sub_agent_config["system_prompt"],
                    tools=tools,
                    planner=BuiltInPlanner(model=config.model, include_thoughts=True)
                )
                sub_agents.append(sub_agent)
        
        return ParallelAgent(
            name=config.name,
            description=config.description,
            sub_agents=sub_agents
        )
    
    elif config.agent_type == "loop":
        # Create sub-agents for loop execution
        sub_agents = []
        if template and "sub_agents" in template:
            for sub_agent_config in template["sub_agents"]:
                tools = [create_tool_from_name(tool) for tool in sub_agent_config["tools"]]
                sub_agent = LlmAgent(
                    name=sub_agent_config["name"],
                    model=config.model,
                    description=sub_agent_config["role"],
                    instruction=sub_agent_config["system_prompt"],
                    tools=tools,
                    planner=BuiltInPlanner(model=config.model, include_thoughts=True)
                )
                sub_agents.append(sub_agent)
        
        return LoopAgent(
            name=config.name,
            description=config.description,
            sub_agents=sub_agents,
            max_iterations=config.max_iterations or 5
        )
    
    else:
        raise ValueError(f"Unknown agent type: {config.agent_type}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("🚀 Starting Multi-Agent Google ADK Service")
    print("🤖 Supporting LLM, Sequential, Parallel, and Loop agents")
    yield
    print("👋 Shutting down Multi-Agent Google ADK Service")

# Create FastAPI app
app = FastAPI(
    title="Multi-Agent Google ADK Service",
    description="Comprehensive multi-agent system using Google's ADK",
    version="3.0.0",
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
        "service": "Multi-Agent Google ADK Service",
        "version": "3.0.0",
        "status": "running",
        "supported_agent_types": ["llm", "sequential", "parallel", "loop"],
        "agents_count": len(agents_store),
        "executions_count": len(executions_store),
        "templates_available": len(MULTI_AGENT_TEMPLATES)
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/agents/templates")
async def get_templates():
    """Get available multi-agent templates."""
    templates = []
    for template_id, template_data in MULTI_AGENT_TEMPLATES.items():
        templates.append({
            "id": template_id,
            "name": template_data["name"],
            "description": template_data["description"],
            "agent_type": template_data["agent_type"],
            "sub_agents_count": len(template_data.get("sub_agents", [])),
            "max_iterations": template_data.get("max_iterations"),
            "category": "multi-agent"
        })
    
    # Available tools
    available_tools = [
        {"name": "research_topic", "description": "Research topics and gather information", "category": "research"},
        {"name": "analyze_sentiment", "description": "Analyze sentiment of text", "category": "analysis"},
        {"name": "generate_summary", "description": "Generate summaries of content", "category": "processing"},
        {"name": "classify_content", "description": "Classify content into categories", "category": "analysis"},
        {"name": "validate_data", "description": "Validate data according to criteria", "category": "validation"}
    ]
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "availableTools": available_tools,
            "supportedAgentTypes": ["llm", "sequential", "parallel", "loop"]
        }
    }

@app.post("/agents")
async def create_agent(request: AgentCreateRequest):
    """Create a new multi-agent system."""
    try:
        agent_id = f"agent_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        # Create the multi-agent system
        adk_agent = create_multi_agent_system(request.config, request.templateId)
        
        # Store the ADK agent
        adk_agents[agent_id] = adk_agent
        
        # Create agent metadata
        agent_data = {
            "id": agent_id,
            "name": request.config.name,
            "description": request.config.description,
            "agent_type": request.config.agent_type,
            "userId": request.config.userId,
            "model": request.config.model,
            "temperature": request.config.temperature,
            "max_tokens": request.config.max_tokens,
            "tools": request.config.tools or [],
            "templateId": request.templateId,
            "system_prompt": request.config.system_prompt,
            "sub_agents": request.config.sub_agents,
            "max_iterations": request.config.max_iterations,
            "created": datetime.now().isoformat(),
            "status": "active"
        }
        
        agents_store[agent_id] = agent_data
        
        print(f"✅ Created {request.config.agent_type} agent: {agent_data['name']} ({agent_id})")
        
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

@app.post("/agents/execute")
async def execute_agent(request: AgentExecuteRequest):
    """Execute a multi-agent system."""
    try:
        agent_id = request.agentId
        
        # Check if agent exists
        if agent_id not in adk_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        adk_agent = adk_agents[agent_id]
        agent_data = agents_store[agent_id]
        
        execution_id = f"exec_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        print(f"🤖 Executing {agent_data['agent_type']} agent: {agent_data['name']}")
        print(f"📝 Task: {request.taskDescription[:100]}...")
        
        start_time = datetime.now()
        
        # Create session
        session = session_service.create_session(
            app_name="omnix-multi-agent",
            user_id=request.userId,
            session_id=execution_id
        )
        
        # Create runner
        runner = Runner(
            agent=adk_agent,
            app_name="omnix-multi-agent",
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
                "type": event.type if hasattr(event, 'type') else "execution_step",
                "author": event.author if hasattr(event, 'author') else "system",
                "content": str(event.content.parts[0].text) if event.content and event.content.parts else "",
                "agent_type": agent_data['agent_type']
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
            totalCost=0.02,  # Mock cost
            tokensUsed=len(request.taskDescription) + len(final_response)
        )
        
        executions_store[execution_id] = execution_result
        
        print(f"✅ Multi-agent execution completed: {execution_id}")
        
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
                "stepDetails": execution_result.steps,
                "agentType": agent_data['agent_type']
            }
        }
        
    except Exception as e:
        print(f"❌ Error executing agent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent: {str(e)}"
        )

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
        
        print(f"🗑️ Deleted agent: {agent_id}")
        
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
        "multi_agent_adk:app",
        host="127.0.0.1",
        port=8002,
        reload=True,
        log_level="info"
    ) 