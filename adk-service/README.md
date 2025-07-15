# Google Agent Development Kit (ADK) Integration

This directory contains the complete integration of Google's Agent Development Kit (ADK) with the OmniX platform, providing state-of-the-art AI agent capabilities.

## 🚀 Overview

Google's Agent Development Kit (ADK) is a comprehensive framework for building, testing, and deploying AI agents. This integration provides:

- **Multiple Agent Types**: LLMAgent, SequentialAgent, ParallelAgent, LoopAgent
- **Rich Tool Ecosystem**: Custom tools, built-in tools, and API integrations
- **Multi-Agent Orchestration**: Hierarchical agent systems
- **Production-Ready**: Deployment and scaling capabilities
- **Comprehensive Sample Agents**: Pre-built agents for various use cases

## 📦 Installation

### Prerequisites

- Python 3.9 or higher
- pip package manager
- Google Cloud account (optional, for advanced features)

### Quick Start

1. **Install Dependencies**:
   ```bash
   pip install google-adk uvicorn fastapi python-dotenv
   ```

2. **Run the Startup Script**:
   ```bash
   # Windows
   start_adk_service.bat
   
   # Linux/Mac
   python multi_agent_adk.py
   ```

3. **Access the Service**:
   - Multi-Agent Service: http://localhost:8002
   - Real ADK Service: http://localhost:8001

## 🤖 Agent Types

### 1. LLMAgent
Single intelligent agent powered by large language models.

**Use Cases**:
- Customer service chatbots
- Research assistants
- Content generation
- Question answering

**Example**:
```python
from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="Research Assistant",
    model="gemini-2.0-flash-exp",
    description="AI research assistant",
    instruction="You are a helpful research assistant...",
    tools=[research_tool, analysis_tool]
)
```

### 2. SequentialAgent
Executes sub-agents in a predetermined sequence.

**Use Cases**:
- Data processing pipelines
- Multi-step workflows
- Quality assurance processes
- Document processing

**Example**:
```python
from google.adk.agents import SequentialAgent

agent = SequentialAgent(
    name="Research Team",
    description="Multi-step research process",
    sub_agents=[researcher, analyzer, summarizer]
)
```

### 3. ParallelAgent
Executes multiple sub-agents concurrently.

**Use Cases**:
- Parallel data processing
- Multi-source information gathering
- Concurrent analysis tasks
- Performance optimization

**Example**:
```python
from google.adk.agents import ParallelAgent

agent = ParallelAgent(
    name="Analysis Team",
    description="Parallel analysis system",
    sub_agents=[sentiment_analyzer, classifier, summarizer]
)
```

### 4. LoopAgent
Iteratively executes sub-agents until conditions are met.

**Use Cases**:
- Quality improvement loops
- Iterative refinement
- Content optimization
- Validation processes

**Example**:
```python
from google.adk.agents import LoopAgent

agent = LoopAgent(
    name="Quality Assurance",
    description="Iterative quality checking",
    sub_agents=[validator, improver],
    max_iterations=3
)
```

## 🛠️ Available Tools

### Research Tools
- `academic_search`: Search academic databases
- `analyze_research_trends`: Analyze research trends
- `generate_research_summary`: Generate research summaries

### Customer Service Tools
- `customer_inquiry_analysis`: Analyze customer inquiries
- `generate_customer_response`: Generate service responses

### Financial Tools
- `market_analysis`: Analyze financial markets
- `portfolio_optimization`: Optimize investment portfolios

### Weather Tools
- `get_detailed_weather`: Get comprehensive weather data
- `weather_impact_analysis`: Analyze weather impact on activities

### Content Tools
- `analyze_sentiment`: Sentiment analysis
- `classify_content`: Content classification
- `generate_summary`: Text summarization
- `validate_data`: Data validation

## 🎯 Sample Agents

### Academic Researcher
Specialized for scholarly research with literature search and analysis.

**Capabilities**:
- Literature search
- Research trend analysis
- Comprehensive summaries
- Citation management

### Customer Service Team
Sequential processing for customer inquiries.

**Workflow**:
1. Analyze inquiry (urgency, category)
2. Generate appropriate response
3. Route to specialists if needed

### Financial Advisor
Parallel financial analysis and portfolio optimization.

**Services**:
- Market analysis
- Portfolio optimization
- Risk assessment
- Investment recommendations

### Weather Assistant
Comprehensive weather information and activity planning.

**Features**:
- Detailed forecasts
- Activity impact analysis
- Safety recommendations
- Travel planning

### Quality Assurance Loop
Iterative quality checking and improvement system.

**Process**:
1. Check content quality
2. Identify issues
3. Improve content
4. Repeat until satisfactory

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Google Cloud credentials
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Optional: ADK service URL
ADK_SERVICE_URL=http://127.0.0.1:8002

# Optional: Model configuration
DEFAULT_MODEL=gemini-2.0-flash-exp
```

### Service Configuration
```python
# FastAPI app configuration
app = FastAPI(
    title="Multi-Agent Google ADK Service",
    description="Comprehensive multi-agent system",
    version="3.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🚀 Usage Examples

### Creating an Agent
```python
# Create agent configuration
config = AgentConfig(
    name="My Research Agent",
    description="Specialized research assistant",
    agent_type="llm",
    model="gemini-2.0-flash-exp",
    tools=["academic_search", "analyze_research_trends"],
    system_prompt="You are a research assistant...",
    userId="user123"
)

# Create agent via API
response = requests.post("/agents", json={
    "templateId": "academic_researcher",
    "config": config.dict()
})
```

### Executing an Agent
```python
# Execute agent task
response = requests.post("/agents/execute", json={
    "agentId": "agent_123",
    "taskDescription": "Research machine learning in healthcare",
    "userId": "user123"
})

# Get execution results
execution_data = response.json()["data"]
print(f"Result: {execution_data['result']}")
```

### Using Templates
```python
# Get available templates
templates = requests.get("/agents/templates").json()

# Create agent from template
response = requests.post("/agents", json={
    "templateId": "customer_service_team",
    "config": {
        "name": "CS Team",
        "description": "Customer service team",
        "userId": "user123"
    }
})
```

## 📊 API Endpoints

### Agent Management
- `GET /agents` - List user's agents
- `POST /agents` - Create new agent
- `DELETE /agents/{id}` - Delete agent
- `GET /agents/templates` - List available templates

### Agent Execution
- `POST /agents/execute` - Execute agent task
- `GET /agents/stats` - Get agent statistics

### Health & Status
- `GET /` - Service information
- `GET /health` - Health check

## 🧪 Testing

### Running Sample Agents
```bash
# Run the sample agents demo
python sample_agents.py
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:8002/health

# Test templates endpoint
curl http://localhost:8002/agents/templates
```

### Integration Testing
```bash
# Test with the Next.js frontend
npm run dev  # In the root directory
```

## 📈 Performance Considerations

### Optimization Tips
1. **Parallel Processing**: Use ParallelAgent for independent tasks
2. **Tool Selection**: Choose appropriate tools for each agent
3. **Model Selection**: Use appropriate models for different tasks
4. **Caching**: Implement caching for frequently used data
5. **Load Balancing**: Distribute agents across multiple instances

### Monitoring
- Use the `/agents/stats` endpoint for monitoring
- Track execution times and success rates
- Monitor resource usage
- Set up alerts for failures

## 🔒 Security

### Best Practices
1. **API Keys**: Secure API keys and credentials
2. **Input Validation**: Validate all inputs
3. **Rate Limiting**: Implement rate limiting
4. **Access Control**: Implement proper access control
5. **Logging**: Log all activities for audit trails

### Safety Measures
- Content filtering
- Response validation
- Error handling
- Resource limits
- Timeout protection

## 🚀 Deployment

### Local Development
```bash
# Start the service locally
python multi_agent_adk.py
```

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8002

CMD ["python", "multi_agent_adk.py"]
```

### Cloud Deployment
- Deploy to Google Cloud Run
- Use Kubernetes for scaling
- Configure load balancing
- Set up monitoring and logging

## 📚 Documentation

### Further Reading
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [Agent Development Guide](https://google.github.io/adk-docs/get-started/)
- [API Reference](https://google.github.io/adk-docs/api-reference/)

### Community Resources
- [ADK GitHub Repository](https://github.com/google/adk-python)
- [Sample Projects](https://github.com/google/adk-samples)
- [Community Forum](https://reddit.com/r/agentdevelopmentkit)

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style
- Follow PEP 8 guidelines
- Use type hints
- Add docstrings
- Write comprehensive tests

## 📄 License

This project is licensed under the Apache License 2.0. See the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information
4. Join the community discussions

---

**Built with ❤️ using Google's Agent Development Kit**