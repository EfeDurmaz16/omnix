# OmniX ADK Service

Google Agent Development Kit (ADK) based agent service for OmniX.

This service provides real Google ADK agents that integrate with the OmniX Next.js application via API endpoints.

## Features

- Real Google ADK agent implementations
- Firecrawl web search integration
- Email functionality with SMTP
- Research assistant agents
- FastAPI web service bridge

## Setup

1. Install dependencies: `poetry install`
2. Configure environment variables
3. Run the service: `uvicorn main:app --reload`

## Environment Variables

- `GOOGLE_CLOUD_PROJECT`: Your Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: Your Google Cloud location
- `FIRECRAWL_API_KEY`: Firecrawl API key for web search
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: Email configuration