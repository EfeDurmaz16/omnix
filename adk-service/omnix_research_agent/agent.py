# Copyright 2025 OmniX
# Based on Google ADK Academic Research Agent
# Adapted for Firecrawl web search and email functionality

"""OmniX Research Agent: Web research with email reporting using Google ADK."""

from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

from . import prompt
from .sub_agents.web_research import web_research_agent
from .sub_agents.email_sender import email_sender_agent

MODEL = "gemini-2.5-pro"

# Main coordinator agent
omnix_research_coordinator = LlmAgent(
    name="omnix_research_coordinator",
    model=MODEL,
    description=(
        "AI research assistant that searches the web for information "
        "using Firecrawl and sends comprehensive reports via email. "
        "Capable of analyzing user requests, conducting web research, "
        "and delivering formatted results to specified email addresses."
    ),
    instruction=prompt.RESEARCH_COORDINATOR_PROMPT,
    output_key="research_task",
    tools=[
        AgentTool(agent=web_research_agent),
        AgentTool(agent=email_sender_agent),
    ],
)

# Export the root agent
root_agent = omnix_research_coordinator