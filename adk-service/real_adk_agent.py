#!/usr/bin/env python3
"""Real Google ADK agent implementation for OmniX."""

import os
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from google.adk.runners import InMemoryRunner
from google.genai import types
from dotenv import load_dotenv
import asyncio
from typing import List

# Load environment variables
load_dotenv()

MODEL = "gemini-2.5-pro"

# Import our tools
from firecrawl_tool import firecrawl_web_search
from email_tool import send_email

# Tool mapping
AVAILABLE_TOOLS = {
    "web-search": FunctionTool(firecrawl_web_search),
    "email-sender": FunctionTool(send_email),
}

async def execute_research_task(task_description: str, tool_names: List[str]) -> str:
    """Execute a research task using the real Google ADK agent."""
    try:
        print(f"🔍 Executing real Google ADK research task: {task_description}")

        # Select tools based on tool_names
        selected_tools = [AVAILABLE_TOOLS[name] for name in tool_names if name in AVAILABLE_TOOLS]

        # Create the main research agent with proper ADK pattern
        research_agent = LlmAgent(
            name="omnix_research_agent",
            model=MODEL,
            description="AI research assistant that searches the web using Firecrawl and sends comprehensive reports via email",
            instruction="""
You are a professional research assistant with access to web search and email capabilities.

When given a research task:
1. First, use the firecrawl_web_search tool to search for relevant, current information
2. Analyze and synthesize the search results into a comprehensive report
3. If an email address is mentioned in the request, use the send_email tool to deliver the report

Always provide:
- Clear, well-structured findings
- Multiple sources with URLs
- Professional analysis and insights
- Actionable conclusions

Format your research reports professionally with:
- Executive Summary
- Key Findings (with sources)
- Detailed Analysis
- Conclusions and Recommendations
""",
            tools=selected_tools,
        )
        
        # Create an ADK runner
        runner = InMemoryRunner(agent=research_agent, app_name="omnix-research")
        
        # Create a session
        session = await runner.session_service.create_session(
            app_name=runner.app_name,
            user_id="omnix_user"
        )
        
        # Create content for the message
        content = types.Content(parts=[types.Part(text=task_description)])
        
        # Execute the agent and collect response
        response_parts = []
        async for event in runner.run_async(
            user_id=session.user_id,
            session_id=session.id,
            new_message=content,
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        response_parts.append(part.text)
        
        result = "\n".join(response_parts) if response_parts else "No response generated"
        
        print(f"✅ Real Google ADK research task completed")
        return result
        
    except Exception as e:
        print(f"❌ Google ADK research task failed: {str(e)}")
        return f"Research task failed: {str(e)}"

# Test function
async def test_agent():
    """Test the real ADK agent."""
    result = await execute_research_task("Search for information about artificial intelligence trends in 2024", ["web-search"])
    print("Test result:", result)

if __name__ == "__main__":
    asyncio.run(test_agent())
