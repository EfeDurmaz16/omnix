"""
Working Google ADK Service Implementation
Using mock responses instead of unavailable Google components
"""

import os
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Working Google ADK Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agent Types
class AgentType(str, Enum):
    LLM = "llm"
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    LOOP = "loop"

# Models
class AgentTemplate(BaseModel):
    id: str
    name: str
    description: str
    agent_type: AgentType
    category: str
    tools: List[str]
    model_name: str = "gemini-pro"
    system_instructions: str = ""
    
class AgentExecution(BaseModel):
    agent_id: str
    input_data: Dict[str, Any]
    
class AgentResponse(BaseModel):
    execution_id: str
    agent_id: str
    output: Dict[str, Any]
    execution_time: float
    timestamp: datetime

# Tool Functions
async def get_weather(location: str) -> Dict[str, Any]:
    """Get weather information for a location"""
    try:
        # Mock weather data
        conditions = ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"]
        temperatures = ["18°C", "22°C", "25°C", "15°C", "20°C"]
        
        return {
            "location": location,
            "temperature": random.choice(temperatures),
            "condition": random.choice(conditions),
            "humidity": f"{random.randint(40, 90)}%",
            "wind": f"{random.randint(5, 20)} mph"
        }
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return {"error": "Unable to fetch weather data"}

async def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Send email using SMTP"""
    try:
        # Mock email sending
        return {
            "status": "sent",
            "to": to,
            "subject": subject,
            "message_id": f"msg_{random.randint(1000, 9999)}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Email sending error: {e}")
        return {"error": "Unable to send email"}

async def web_search(query: str) -> Dict[str, Any]:
    """Perform web search"""
    try:
        # Mock web search results
        sample_results = [
            {"title": f"Understanding {query}", "url": "https://example.com/article1", "snippet": f"Comprehensive guide to {query}"},
            {"title": f"{query} - Best Practices", "url": "https://example.com/article2", "snippet": f"Learn the best practices for {query}"},
            {"title": f"Latest News about {query}", "url": "https://example.com/news", "snippet": f"Recent developments in {query}"}
        ]
        
        return {
            "query": query,
            "results": sample_results[:random.randint(1, 3)],
            "total_results": random.randint(100, 1000)
        }
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return {"error": "Unable to perform web search"}

async def analyze_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze data using simple statistics"""
    try:
        data_points = len(str(data))
        return {
            "analysis": "Data analysis completed successfully",
            "summary": f"Analyzed {data_points} data points",
            "insights": [
                "Data shows consistent patterns",
                "No anomalies detected",
                "Processing completed within normal parameters"
            ],
            "confidence": f"{random.randint(85, 99)}%",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Data analysis error: {e}")
        return {"error": "Unable to analyze data"}

# Mock AI Response Generator
class MockAIModel:
    """Mock AI model that generates realistic responses"""
    
    def __init__(self, model_name: str = "gemini-pro"):
        self.model_name = model_name
        
    async def generate_response(self, prompt: str, user_input: str) -> str:
        """Generate a mock AI response"""
        
        # Generate contextual responses based on input
        if "weather" in user_input.lower():
            return f"I can help you with weather information. The current conditions show varying weather patterns. Would you like me to check the weather for a specific location?"
        
        elif "email" in user_input.lower():
            return f"I can assist with email-related tasks. I can help you compose, send, or manage emails. What specific email task would you like me to help with?"
        
        elif "research" in user_input.lower():
            return f"I'm equipped to help with research tasks. I can search for information, analyze data, and provide comprehensive research summaries. What topic would you like me to research?"
        
        elif "analyze" in user_input.lower():
            return f"I can perform data analysis on various types of information. I'll examine patterns, provide insights, and generate detailed reports. What data would you like me to analyze?"
        
        elif "financial" in user_input.lower() or "finance" in user_input.lower():
            return f"I can provide financial analysis and market insights. I'll help you understand market trends, analyze financial data, and provide investment guidance. What financial topic interests you?"
        
        else:
            return f"I understand you're asking about: {user_input}. I'm here to help with various tasks including research, data analysis, weather information, email management, and more. How can I assist you today?"

# Available tools
AVAILABLE_TOOLS = {
    "get_weather": get_weather,
    "send_email": send_email,
    "web_search": web_search,
    "analyze_data": analyze_data
}

# Agent Templates
AGENT_TEMPLATES = {
    "research-assistant": AgentTemplate(
        id="research-assistant",
        name="Research Assistant",
        description="Helps with academic and professional research tasks",
        agent_type=AgentType.LLM,
        category="Research",
        tools=["web_search", "analyze_data"],
        system_instructions="You are a helpful research assistant. Use available tools to gather and analyze information."
    ),
    "customer-service": AgentTemplate(
        id="customer-service",
        name="Customer Service",
        description="Handles customer inquiries and support requests",
        agent_type=AgentType.SEQUENTIAL,
        category="Support",
        tools=["send_email", "analyze_data"],
        system_instructions="You are a professional customer service representative. Be helpful and polite."
    ),
    "weather-assistant": AgentTemplate(
        id="weather-assistant",
        name="Weather Assistant",
        description="Provides weather information and forecasts",
        agent_type=AgentType.LLM,
        category="Information",
        tools=["get_weather"],
        system_instructions="You are a weather assistant. Provide accurate and helpful weather information."
    ),
    "financial-advisor": AgentTemplate(
        id="financial-advisor",
        name="Financial Advisor",
        description="Provides financial advice and market analysis",
        agent_type=AgentType.PARALLEL,
        category="Finance",
        tools=["web_search", "analyze_data"],
        system_instructions="You are a financial advisor. Provide sound financial advice based on data."
    ),
    "academic-researcher": AgentTemplate(
        id="academic-researcher",
        name="Academic Researcher",
        description="Conducts academic research and literature reviews",
        agent_type=AgentType.LOOP,
        category="Research",
        tools=["web_search", "analyze_data"],
        system_instructions="You are an academic researcher. Conduct thorough research and provide detailed analysis."
    )
}

# Simple Agent Implementation
class SimpleAgent:
    def __init__(self, template: AgentTemplate):
        self.template = template
        self.model = MockAIModel(template.model_name)
        
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent with input data"""
        try:
            start_time = datetime.now()
            
            # Get user input
            user_input = input_data.get("message", "")
            
            # Prepare context with available tools
            tool_context = f"Available tools: {', '.join(self.template.tools)}"
            system_prompt = f"{self.template.system_instructions}\n{tool_context}"
            
            # Generate response based on agent type
            if self.template.agent_type == AgentType.LLM:
                result = await self._execute_llm(user_input, system_prompt)
            elif self.template.agent_type == AgentType.SEQUENTIAL:
                result = await self._execute_sequential(user_input, system_prompt)
            elif self.template.agent_type == AgentType.PARALLEL:
                result = await self._execute_parallel(user_input, system_prompt)
            elif self.template.agent_type == AgentType.LOOP:
                result = await self._execute_loop(user_input, system_prompt)
            else:
                result = {"error": "Unknown agent type"}
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "result": result,
                "execution_time": execution_time,
                "agent_type": self.template.agent_type.value,
                "tools_used": self.template.tools,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return {"error": str(e)}
    
    async def _execute_llm(self, user_input: str, system_prompt: str) -> Dict[str, Any]:
        """Execute LLM agent"""
        try:
            # Generate response using mock model
            response = await self.model.generate_response(system_prompt, user_input)
            
            # Execute relevant tools based on input
            tool_results = []
            for tool_name in self.template.tools:
                if tool_name == "get_weather" and "weather" in user_input.lower():
                    location = "Default Location"  # Could extract from input
                    result = await get_weather(location)
                    tool_results.append({"tool": tool_name, "result": result})
                elif tool_name == "web_search" and "search" in user_input.lower():
                    result = await web_search(user_input)
                    tool_results.append({"tool": tool_name, "result": result})
                elif tool_name == "analyze_data" and "analyze" in user_input.lower():
                    result = await analyze_data({"input": user_input})
                    tool_results.append({"tool": tool_name, "result": result})
            
            return {
                "response": response,
                "tool_results": tool_results,
                "type": "llm_response"
            }
        except Exception as e:
            logger.error(f"LLM execution error: {e}")
            return {"response": "I apologize, but I encountered an error processing your request.", "type": "error"}
    
    async def _execute_sequential(self, user_input: str, system_prompt: str) -> Dict[str, Any]:
        """Execute sequential agent"""
        results = []
        
        # Step 1: Analyze input
        analysis = await self._analyze_input(user_input)
        results.append({"step": "analyze", "result": analysis})
        
        # Step 2: Execute tools if needed
        if "email" in user_input.lower():
            email_result = await send_email("customer@example.com", "Response", "Thank you for your inquiry")
            results.append({"step": "email", "result": email_result})
        
        if "weather" in user_input.lower():
            weather_result = await get_weather("Default Location")
            results.append({"step": "weather", "result": weather_result})
        
        # Step 3: Generate final response
        final_response = await self._execute_llm(user_input, system_prompt)
        results.append({"step": "response", "result": final_response})
        
        return {
            "sequential_results": results,
            "type": "sequential_execution"
        }
    
    async def _execute_parallel(self, user_input: str, system_prompt: str) -> Dict[str, Any]:
        """Execute parallel agent"""
        tasks = []
        
        # Create parallel tasks based on available tools
        for tool_name in self.template.tools:
            if tool_name == "get_weather" and "weather" in user_input.lower():
                tasks.append(get_weather("Default Location"))
            elif tool_name == "web_search" and ("search" in user_input.lower() or "research" in user_input.lower()):
                tasks.append(web_search(user_input))
            elif tool_name == "analyze_data" and "analyze" in user_input.lower():
                tasks.append(analyze_data({"input": user_input}))
        
        # Execute tasks in parallel
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            results = []
        
        # Generate final response
        final_response = await self.model.generate_response(system_prompt, user_input)
        
        return {
            "parallel_results": results,
            "final_response": final_response,
            "type": "parallel_execution"
        }
    
    async def _execute_loop(self, user_input: str, system_prompt: str) -> Dict[str, Any]:
        """Execute loop agent"""
        iterations = []
        max_iterations = 3
        
        current_input = user_input
        
        for i in range(max_iterations):
            # Execute iteration
            response = await self.model.generate_response(system_prompt, current_input)
            
            # Execute tools if relevant
            tool_results = []
            if "research" in current_input.lower() and "web_search" in self.template.tools:
                search_result = await web_search(current_input)
                tool_results.append({"tool": "web_search", "result": search_result})
            
            if "analyze" in current_input.lower() and "analyze_data" in self.template.tools:
                analysis_result = await analyze_data({"input": current_input})
                tool_results.append({"tool": "analyze_data", "result": analysis_result})
            
            iteration_result = {
                "response": response,
                "tool_results": tool_results
            }
            
            iterations.append({"iteration": i + 1, "result": iteration_result})
            
            # Check if we should continue
            if "complete" in response.lower() or "done" in response.lower():
                break
            
            # Modify input for next iteration
            current_input = f"Continue analysis of: {user_input}"
        
        return {
            "loop_iterations": iterations,
            "type": "loop_execution"
        }
    
    async def _analyze_input(self, user_input: str) -> Dict[str, Any]:
        """Analyze user input"""
        return {
            "length": len(user_input),
            "words": len(user_input.split()),
            "contains_question": "?" in user_input,
            "keywords": [word for word in user_input.lower().split() if len(word) > 3],
            "analysis": "Input analyzed successfully"
        }

# In-memory storage
agents: Dict[str, SimpleAgent] = {}
executions: Dict[str, AgentResponse] = {}

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/agents/templates")
async def get_agent_templates():
    """Get all agent templates (matches frontend expectation)"""
    return {
        "success": True,
        "data": {
            "templates": [asdict(template) for template in AGENT_TEMPLATES.values()],
            "count": len(AGENT_TEMPLATES)
        }
    }

@app.get("/templates")
async def get_templates():
    """Get all agent templates (legacy endpoint)"""
    return {
        "templates": [asdict(template) for template in AGENT_TEMPLATES.values()],
        "count": len(AGENT_TEMPLATES)
    }

@app.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get specific agent template"""
    if template_id not in AGENT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return asdict(AGENT_TEMPLATES[template_id])

@app.post("/agents")
async def create_agent(request: dict):
    """Create new agent from template"""
    try:
        template_id = request.get("templateId")
        config = request.get("config", {})
        
        if not template_id or template_id not in AGENT_TEMPLATES:
            raise HTTPException(status_code=400, detail="Invalid template ID")
        
        template = AGENT_TEMPLATES[template_id]
        agent = SimpleAgent(template)
        agents[template_id] = agent
        
        return {
            "success": True,
            "data": {
                "id": template_id,
                "name": template.name,
                "status": "created",
                "template": asdict(template)
            }
        }
    except Exception as e:
        logger.error(f"Agent creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents")
async def list_agents(userId: str = None):
    """List all created agents (supports userId parameter)"""
    # For now, we ignore userId and return all agents
    # In a real implementation, you'd filter by userId
    return {
        "success": True,
        "data": [
            {
                "id": agent_id,
                "name": agent.template.name,
                "type": agent.template.agent_type.value,
                "category": agent.template.category,
                "tools": agent.template.tools,
                "userId": userId or "default"
            }
            for agent_id, agent in agents.items()
        ],
        "count": len(agents)
    }

@app.post("/agents/{agent_id}/execute")
async def execute_agent(agent_id: str, execution: AgentExecution):
    """Execute agent"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    try:
        agent = agents[agent_id]
        result = await agent.execute(execution.input_data)
        
        execution_id = f"exec_{agent_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        response = AgentResponse(
            execution_id=execution_id,
            agent_id=agent_id,
            output=result,
            execution_time=result.get("execution_time", 0),
            timestamp=datetime.now()
        )
        
        executions[execution_id] = response
        
        return {
            "success": True,
            "data": response
        }
        
    except Exception as e:
        logger.error(f"Agent execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, userId: str = None):
    """Delete agent"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    try:
        del agents[agent_id]
        return {
            "success": True,
            "data": {"message": f"Agent {agent_id} deleted successfully"}
        }
    except Exception as e:
        logger.error(f"Agent deletion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Get execution result"""
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return {
        "success": True,
        "data": executions[execution_id]
    }

@app.get("/tools")
async def get_available_tools():
    """Get all available tools"""
    return {
        "success": True,
        "data": {
            "tools": [
                {"name": name, "description": func.__doc__} 
                for name, func in AVAILABLE_TOOLS.items()
            ],
            "count": len(AVAILABLE_TOOLS)
        }
    }

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("🚀 Starting Working Google ADK Service")
    
    # Create default agents from templates
    for template_id, template in AGENT_TEMPLATES.items():
        try:
            agent = SimpleAgent(template)
            agents[template_id] = agent
            logger.info(f"✅ Created agent: {template.name}")
        except Exception as e:
            logger.error(f"❌ Failed to create agent {template.name}: {e}")
    
    logger.info(f"🤖 Service ready with {len(agents)} agents")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down Working Google ADK Service")

if __name__ == "__main__":
    uvicorn.run(
        "working_adk_service:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    ) 