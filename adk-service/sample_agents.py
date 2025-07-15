#!/usr/bin/env python3
"""
Sample Agents Implementation using Google's ADK
Showcasing various agent types and capabilities
"""

import os
import time
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from google.adk.agents import Agent, LlmAgent, SequentialAgent, ParallelAgent, LoopAgent
from google.adk.tools import FunctionTool
from google.adk.planners import BuiltInPlanner
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Advanced research tools
def academic_search(query: str, field: str = "general", limit: int = 5) -> dict:
    """Search academic databases for research papers.
    
    Args:
        query: Search query
        field: Academic field (computer science, medicine, physics, etc.)
        limit: Number of results to return
        
    Returns:
        Dictionary with search results
    """
    # Simulate academic search
    papers = []
    for i in range(limit):
        papers.append({
            "title": f"Research Paper {i+1}: {query} in {field}",
            "authors": [f"Dr. Author {i+1}", f"Prof. Researcher {i+1}"],
            "journal": f"Journal of {field.title()}",
            "year": 2020 + i,
            "citations": random.randint(10, 500),
            "abstract": f"This paper explores {query} in the context of {field}. Our research shows significant findings that contribute to the field.",
            "doi": f"10.1000/journal.{i+1}.{random.randint(1000, 9999)}",
            "relevance_score": 0.9 - (i * 0.1)
        })
    
    return {
        "query": query,
        "field": field,
        "total_results": len(papers),
        "papers": papers,
        "search_time": f"{random.uniform(0.5, 2.0):.2f}s"
    }

def analyze_research_trends(papers: List[dict]) -> dict:
    """Analyze trends in research papers.
    
    Args:
        papers: List of research papers
        
    Returns:
        Dictionary with trend analysis
    """
    if not papers:
        return {"error": "No papers provided for analysis"}
    
    # Extract years
    years = [paper.get("year", 2020) for paper in papers]
    citations = [paper.get("citations", 0) for paper in papers]
    
    # Calculate trends
    avg_citations = sum(citations) / len(citations)
    recent_papers = sum(1 for year in years if year >= 2022)
    
    return {
        "total_papers": len(papers),
        "average_citations": avg_citations,
        "recent_papers": recent_papers,
        "trend_direction": "increasing" if recent_papers > len(papers) / 2 else "stable",
        "top_cited": max(citations) if citations else 0,
        "analysis_timestamp": datetime.now().isoformat()
    }

def generate_research_summary(topic: str, papers: List[dict]) -> dict:
    """Generate a comprehensive research summary.
    
    Args:
        topic: Research topic
        papers: List of research papers
        
    Returns:
        Dictionary with research summary
    """
    key_findings = [
        f"Key finding 1: {topic} shows significant advancement in recent years",
        f"Key finding 2: Multiple approaches to {topic} are being explored",
        f"Key finding 3: {topic} has practical applications across various domains"
    ]
    
    recommendations = [
        f"Focus on recent developments in {topic}",
        f"Explore interdisciplinary approaches to {topic}",
        f"Consider practical applications of {topic} research"
    ]
    
    return {
        "topic": topic,
        "papers_analyzed": len(papers),
        "key_findings": key_findings,
        "recommendations": recommendations,
        "research_gaps": [f"Gap 1: Limited long-term studies on {topic}", f"Gap 2: Need for more diverse methodologies"],
        "future_directions": [f"Direction 1: Advanced {topic} applications", f"Direction 2: {topic} in emerging technologies"],
        "summary_generated": datetime.now().isoformat()
    }

# Customer service tools
def customer_inquiry_analysis(inquiry: str) -> dict:
    """Analyze customer inquiry to determine urgency and category.
    
    Args:
        inquiry: Customer inquiry text
        
    Returns:
        Dictionary with analysis results
    """
    # Keyword-based analysis
    urgent_keywords = ["urgent", "emergency", "critical", "immediate", "asap", "help", "broken"]
    category_keywords = {
        "technical": ["bug", "error", "crash", "not working", "broken", "issue"],
        "billing": ["payment", "charge", "invoice", "bill", "refund", "cost"],
        "general": ["question", "help", "support", "how to", "information"],
        "complaint": ["disappointed", "angry", "frustrated", "terrible", "awful"]
    }
    
    inquiry_lower = inquiry.lower()
    
    # Determine urgency
    urgency_score = sum(1 for keyword in urgent_keywords if keyword in inquiry_lower)
    urgency = "high" if urgency_score >= 2 else "medium" if urgency_score == 1 else "low"
    
    # Determine category
    category_scores = {}
    for category, keywords in category_keywords.items():
        score = sum(1 for keyword in keywords if keyword in inquiry_lower)
        category_scores[category] = score
    
    primary_category = max(category_scores, key=category_scores.get)
    
    return {
        "inquiry": inquiry,
        "urgency": urgency,
        "urgency_score": urgency_score,
        "primary_category": primary_category,
        "category_scores": category_scores,
        "estimated_resolution_time": "1-2 hours" if urgency == "high" else "24-48 hours",
        "recommended_action": f"Route to {primary_category} specialist",
        "analysis_timestamp": datetime.now().isoformat()
    }

def generate_customer_response(inquiry: str, analysis: dict) -> dict:
    """Generate a customer service response.
    
    Args:
        inquiry: Original customer inquiry
        analysis: Analysis results from customer_inquiry_analysis
        
    Returns:
        Dictionary with response
    """
    # Generate response based on analysis
    if analysis["urgency"] == "high":
        response = f"Thank you for contacting us regarding your urgent {analysis['primary_category']} inquiry. We understand the importance of resolving this quickly and have escalated your case to our specialist team. You can expect a response within {analysis['estimated_resolution_time']}."
    else:
        response = f"Thank you for reaching out about your {analysis['primary_category']} inquiry. We've received your message and will respond within {analysis['estimated_resolution_time']}. In the meantime, you may find our FAQ section helpful."
    
    return {
        "response": response,
        "tone": "professional",
        "urgency_acknowledged": analysis["urgency"] == "high",
        "category": analysis["primary_category"],
        "estimated_resolution": analysis["estimated_resolution_time"],
        "response_generated": datetime.now().isoformat()
    }

# Financial analysis tools
def market_analysis(symbol: str, period: str = "1month") -> dict:
    """Analyze market data for a financial symbol.
    
    Args:
        symbol: Financial symbol (e.g., AAPL, GOOGL)
        period: Analysis period (1day, 1week, 1month, 3months)
        
    Returns:
        Dictionary with market analysis
    """
    # Mock market data
    base_price = random.uniform(100, 500)
    volatility = random.uniform(0.1, 0.3)
    
    # Generate mock price history
    prices = []
    current_price = base_price
    for i in range(30):  # 30 data points
        change = random.uniform(-volatility, volatility)
        current_price *= (1 + change)
        prices.append(current_price)
    
    return {
        "symbol": symbol,
        "period": period,
        "current_price": current_price,
        "starting_price": base_price,
        "price_change": current_price - base_price,
        "price_change_percent": ((current_price - base_price) / base_price) * 100,
        "volatility": volatility,
        "trend": "bullish" if current_price > base_price else "bearish",
        "support_level": min(prices),
        "resistance_level": max(prices),
        "average_price": sum(prices) / len(prices),
        "analysis_timestamp": datetime.now().isoformat()
    }

def portfolio_optimization(holdings: List[dict], risk_tolerance: str = "moderate") -> dict:
    """Optimize portfolio allocation.
    
    Args:
        holdings: List of current holdings
        risk_tolerance: Risk tolerance (conservative, moderate, aggressive)
        
    Returns:
        Dictionary with optimization recommendations
    """
    # Risk multipliers
    risk_multipliers = {
        "conservative": 0.5,
        "moderate": 1.0,
        "aggressive": 1.5
    }
    
    multiplier = risk_multipliers.get(risk_tolerance, 1.0)
    
    # Generate recommendations
    recommendations = []
    for holding in holdings:
        current_allocation = holding.get("allocation", 0)
        recommended_allocation = min(current_allocation * multiplier, 25)  # Max 25% in any single holding
        
        recommendations.append({
            "symbol": holding.get("symbol", "UNKNOWN"),
            "current_allocation": current_allocation,
            "recommended_allocation": recommended_allocation,
            "action": "increase" if recommended_allocation > current_allocation else "decrease" if recommended_allocation < current_allocation else "hold"
        })
    
    return {
        "risk_tolerance": risk_tolerance,
        "recommendations": recommendations,
        "diversification_score": random.uniform(0.6, 0.9),
        "risk_score": random.uniform(0.3, 0.8),
        "expected_return": random.uniform(0.05, 0.15),
        "optimization_date": datetime.now().isoformat()
    }

# Weather tools
def get_detailed_weather(location: str, forecast_days: int = 5) -> dict:
    """Get detailed weather information and forecast.
    
    Args:
        location: Location for weather data
        forecast_days: Number of forecast days
        
    Returns:
        Dictionary with weather data
    """
    conditions = ["sunny", "cloudy", "rainy", "partly cloudy", "stormy", "snowy"]
    
    # Current weather
    current = {
        "temperature": random.randint(-5, 35),
        "condition": random.choice(conditions),
        "humidity": random.randint(30, 90),
        "wind_speed": random.randint(0, 30),
        "pressure": random.randint(995, 1025),
        "visibility": random.randint(5, 15),
        "uv_index": random.randint(1, 10)
    }
    
    # Forecast
    forecast = []
    for i in range(forecast_days):
        forecast.append({
            "date": datetime.now().date().isoformat(),
            "high": current["temperature"] + random.randint(-5, 8),
            "low": current["temperature"] + random.randint(-8, 3),
            "condition": random.choice(conditions),
            "precipitation_chance": random.randint(0, 100),
            "wind_speed": random.randint(5, 25)
        })
    
    return {
        "location": location,
        "current_weather": current,
        "forecast": forecast,
        "alerts": ["No active weather alerts"] if random.random() > 0.3 else ["Severe weather warning in effect"],
        "last_updated": datetime.now().isoformat()
    }

def weather_impact_analysis(weather_data: dict, activity: str) -> dict:
    """Analyze weather impact on planned activities.
    
    Args:
        weather_data: Weather data from get_detailed_weather
        activity: Planned activity
        
    Returns:
        Dictionary with impact analysis
    """
    current = weather_data.get("current_weather", {})
    temp = current.get("temperature", 20)
    condition = current.get("condition", "sunny")
    
    # Activity suitability
    activity_requirements = {
        "outdoor sports": {"min_temp": 10, "max_temp": 30, "good_conditions": ["sunny", "partly cloudy"]},
        "picnic": {"min_temp": 15, "max_temp": 32, "good_conditions": ["sunny", "partly cloudy"]},
        "hiking": {"min_temp": 5, "max_temp": 28, "good_conditions": ["sunny", "partly cloudy", "cloudy"]},
        "beach": {"min_temp": 20, "max_temp": 35, "good_conditions": ["sunny"]},
        "general": {"min_temp": -10, "max_temp": 40, "good_conditions": ["sunny", "partly cloudy", "cloudy"]}
    }
    
    requirements = activity_requirements.get(activity.lower(), activity_requirements["general"])
    
    temp_suitable = requirements["min_temp"] <= temp <= requirements["max_temp"]
    condition_suitable = condition in requirements["good_conditions"]
    
    suitability = "excellent" if temp_suitable and condition_suitable else "good" if temp_suitable or condition_suitable else "poor"
    
    return {
        "activity": activity,
        "suitability": suitability,
        "temperature_suitable": temp_suitable,
        "condition_suitable": condition_suitable,
        "recommendations": [
            f"Current temperature of {temp}°C is {'suitable' if temp_suitable else 'not ideal'} for {activity}",
            f"Weather condition ({condition}) is {'good' if condition_suitable else 'not optimal'} for {activity}",
            "Consider rescheduling if suitability is poor" if suitability == "poor" else "Good conditions for your activity"
        ],
        "analysis_timestamp": datetime.now().isoformat()
    }

# Sample agent configurations
def create_academic_researcher() -> LlmAgent:
    """Create an academic research agent."""
    tools = [
        FunctionTool(academic_search),
        FunctionTool(analyze_research_trends),
        FunctionTool(generate_research_summary)
    ]
    
    return LlmAgent(
        name="Academic Researcher",
        model="gemini-2.0-flash-exp",
        description="Specialized academic research agent for scholarly work",
        instruction="""You are an expert academic researcher with access to academic databases and analysis tools.

Your capabilities include:
- Searching academic literature using academic_search
- Analyzing research trends with analyze_research_trends
- Generating comprehensive research summaries with generate_research_summary

When conducting research:
1. Start by searching for relevant papers using academic_search
2. Analyze the trends in the research using analyze_research_trends
3. Generate a comprehensive summary using generate_research_summary

Always provide evidence-based conclusions and cite your sources appropriately.""",
        tools=tools,
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )

def create_customer_service_team() -> SequentialAgent:
    """Create a customer service team using sequential agents."""
    
    # Analyzer agent
    analyzer = LlmAgent(
        name="Customer Inquiry Analyzer",
        model="gemini-2.0-flash-exp",
        description="Analyzes customer inquiries for urgency and categorization",
        instruction="""You are a customer service analyzer. Your job is to analyze customer inquiries to determine:
1. Urgency level (high, medium, low)
2. Category (technical, billing, general, complaint)
3. Recommended action

Use the customer_inquiry_analysis tool to analyze inquiries systematically.""",
        tools=[FunctionTool(customer_inquiry_analysis)],
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )
    
    # Response generator
    responder = LlmAgent(
        name="Customer Response Generator",
        model="gemini-2.0-flash-exp",
        description="Generates appropriate customer service responses",
        instruction="""You are a customer service response generator. Based on the analysis from the previous step, generate appropriate responses using the generate_customer_response tool.

Ensure responses are:
- Professional and empathetic
- Acknowledge the customer's concern
- Provide clear next steps
- Match the urgency level identified""",
        tools=[FunctionTool(generate_customer_response)],
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )
    
    return SequentialAgent(
        name="Customer Service Team",
        description="Sequential customer service processing team",
        sub_agents=[analyzer, responder]
    )

def create_financial_advisor() -> ParallelAgent:
    """Create a financial advisor using parallel agents."""
    
    # Market analyst
    market_analyst = LlmAgent(
        name="Market Analyst",
        model="gemini-2.0-flash-exp",
        description="Analyzes market data and trends",
        instruction="""You are a market analyst. Use the market_analysis tool to analyze financial symbols and provide insights about:
- Current market conditions
- Price trends
- Volatility assessment
- Support and resistance levels

Always provide objective analysis with risk considerations.""",
        tools=[FunctionTool(market_analysis)],
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )
    
    # Portfolio optimizer
    portfolio_optimizer = LlmAgent(
        name="Portfolio Optimizer",
        model="gemini-2.0-flash-exp",
        description="Optimizes portfolio allocation",
        instruction="""You are a portfolio optimizer. Use the portfolio_optimization tool to provide allocation recommendations based on:
- Risk tolerance
- Diversification principles
- Expected returns
- Current market conditions

Always consider the client's risk profile and investment goals.""",
        tools=[FunctionTool(portfolio_optimization)],
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )
    
    return ParallelAgent(
        name="Financial Advisory Team",
        description="Parallel financial analysis and advisory team",
        sub_agents=[market_analyst, portfolio_optimizer]
    )

def create_weather_assistant() -> LlmAgent:
    """Create a comprehensive weather assistant."""
    tools = [
        FunctionTool(get_detailed_weather),
        FunctionTool(weather_impact_analysis)
    ]
    
    return LlmAgent(
        name="Weather Assistant",
        model="gemini-2.0-flash-exp",
        description="Comprehensive weather information and activity planning assistant",
        instruction="""You are a weather assistant specialized in providing detailed weather information and activity planning advice.

Your capabilities include:
- Getting detailed weather forecasts using get_detailed_weather
- Analyzing weather impact on activities using weather_impact_analysis

When helping users:
1. Get detailed weather information for their location
2. If they mention any activities, analyze the weather impact
3. Provide practical recommendations and advice
4. Consider safety implications of weather conditions

Always provide accurate, helpful information with safety considerations.""",
        tools=tools,
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )

def create_quality_assurance_loop() -> LoopAgent:
    """Create a quality assurance loop agent."""
    
    # Quality checker
    quality_checker = LlmAgent(
        name="Quality Checker",
        model="gemini-2.0-flash-exp",
        description="Checks content quality and identifies issues",
        instruction="""You are a quality checker. Analyze content for:
- Accuracy and completeness
- Clarity and readability
- Consistency
- Potential improvements

If you find issues, clearly identify them. If content meets quality standards, confirm it's acceptable.""",
        tools=[],
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )
    
    # Content improver
    content_improver = LlmAgent(
        name="Content Improver",
        model="gemini-2.0-flash-exp",
        description="Improves content based on quality feedback",
        instruction="""You are a content improver. Based on quality feedback, improve content by:
- Fixing identified issues
- Enhancing clarity
- Adding missing information
- Improving structure

Only make necessary improvements, don't over-edit.""",
        tools=[],
        planner=BuiltInPlanner(model="gemini-2.0-flash-exp", include_thoughts=True)
    )
    
    return LoopAgent(
        name="Quality Assurance Loop",
        description="Iterative quality checking and improvement system",
        sub_agents=[quality_checker, content_improver],
        max_iterations=3
    )

# Sample agent registry
SAMPLE_AGENTS = {
    "academic_researcher": create_academic_researcher,
    "customer_service_team": create_customer_service_team,
    "financial_advisor": create_financial_advisor,
    "weather_assistant": create_weather_assistant,
    "quality_assurance_loop": create_quality_assurance_loop
}

def get_sample_agent(agent_name: str) -> Agent:
    """Get a sample agent by name."""
    if agent_name not in SAMPLE_AGENTS:
        raise ValueError(f"Unknown sample agent: {agent_name}")
    
    return SAMPLE_AGENTS[agent_name]()

def list_sample_agents() -> List[dict]:
    """List all available sample agents."""
    return [
        {
            "name": "academic_researcher",
            "type": "LlmAgent",
            "description": "Specialized academic research agent with literature search and analysis capabilities",
            "tools": ["academic_search", "analyze_research_trends", "generate_research_summary"]
        },
        {
            "name": "customer_service_team",
            "type": "SequentialAgent",
            "description": "Customer service team with inquiry analysis and response generation",
            "tools": ["customer_inquiry_analysis", "generate_customer_response"]
        },
        {
            "name": "financial_advisor",
            "type": "ParallelAgent",
            "description": "Financial advisory team with market analysis and portfolio optimization",
            "tools": ["market_analysis", "portfolio_optimization"]
        },
        {
            "name": "weather_assistant",
            "type": "LlmAgent",
            "description": "Comprehensive weather assistant with forecasting and activity planning",
            "tools": ["get_detailed_weather", "weather_impact_analysis"]
        },
        {
            "name": "quality_assurance_loop",
            "type": "LoopAgent",
            "description": "Quality assurance system with iterative checking and improvement",
            "tools": ["quality_check", "content_improvement"]
        }
    ]

# Demo function
async def demo_sample_agents():
    """Demonstrate sample agents in action."""
    print("🚀 Google ADK Sample Agents Demo")
    print("=" * 50)
    
    session_service = InMemorySessionService()
    
    # Demo academic researcher
    print("\n📚 Academic Researcher Demo")
    researcher = create_academic_researcher()
    session = session_service.create_session("demo", "user1", "research_session")
    runner = Runner(researcher, "demo", session_service)
    
    query = types.Content(role="user", parts=[types.Part(text="Research machine learning in healthcare")])
    
    print("Query: Research machine learning in healthcare")
    for event in runner.run("user1", "research_session", query):
        if hasattr(event, 'is_final_response') and event.is_final_response():
            print(f"Response: {event.content.parts[0].text[:200]}...")
            break
    
    # Demo customer service team
    print("\n🛠️ Customer Service Team Demo")
    cs_team = create_customer_service_team()
    session = session_service.create_session("demo", "user2", "cs_session")
    runner = Runner(cs_team, "demo", session_service)
    
    query = types.Content(role="user", parts=[types.Part(text="I'm having trouble with my payment not processing. This is urgent!")])
    
    print("Query: I'm having trouble with my payment not processing. This is urgent!")
    for event in runner.run("user2", "cs_session", query):
        if hasattr(event, 'is_final_response') and event.is_final_response():
            print(f"Response: {event.content.parts[0].text[:200]}...")
            break
    
    print("\n✅ Demo completed!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_sample_agents()) 