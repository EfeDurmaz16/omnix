#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv

# Load environment variables from adk-service/.env
load_dotenv('adk-service/.env')

# Print loaded environment variables for debugging
print("Environment variables loaded:")
print(f"FIRECRAWL_API_KEY: {os.getenv('FIRECRAWL_API_KEY')[:10]}..." if os.getenv('FIRECRAWL_API_KEY') else 'Not found')
print(f"SMTP_USER: {os.getenv('SMTP_USER')}")

# Add adk-service to path
sys.path.insert(0, 'adk-service')

# Import and run the app
from main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)