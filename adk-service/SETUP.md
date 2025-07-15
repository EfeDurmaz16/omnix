# ADK Service Setup Guide

## Environment Variables Setup

To enable email and web research functionality, you need to set up the following environment variables. Create a `.env` file in the `adk-service` directory:

### Email Configuration (Gmail SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM=your_email@gmail.com
```

**To set up Gmail:**
1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings → Security → App passwords
3. Generate an "App Password" for this application
4. Use your Gmail address for `SMTP_USER` and `SMTP_FROM`
5. Use the app password (not your regular password) for `SMTP_PASS`

### Web Research Configuration

```env
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

**To get Firecrawl API key:**
1. Sign up at https://firecrawl.dev/
2. Get your API key from the dashboard
3. Add it to the `.env` file

### Optional API Keys

```env
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Running the Service

1. Create `.env` file with your API keys
2. Run: `python simple_adk_service.py`
3. The service will be available at `http://localhost:8002`

## Testing

- **Without API keys**: The service will return error messages explaining what's missing
- **With API keys**: The service will perform real web research and send emails

## Features

- ✅ Real web research using Firecrawl API
- ✅ Email sending via Gmail SMTP
- ✅ Intelligent task parsing (detects research and email requirements)
- ✅ Proper error handling and user feedback 