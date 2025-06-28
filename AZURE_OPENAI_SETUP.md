# Azure OpenAI Setup Guide for OmniX

This guide will walk you through setting up Azure OpenAI for your OmniX platform to ensure EU data residency compliance for Turkey.

## Prerequisites

- Azure subscription
- Azure CLI installed (optional but recommended)
- Access to Azure Portal

## Step 1: Create Azure Resource Group

### Option A: Using Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Resource groups" in the search bar
3. Click "Create"
4. Fill in the details:
   - **Subscription**: Select your subscription
   - **Resource group**: `rg-omnix-openai`
   - **Region**: `Sweden Central` (EU region for Turkey compliance)
5. Click "Review + create" → "Create"

### Option B: Using Azure CLI
```bash
az login
az group create --name rg-omnix-openai --location swedencentral
```

## Step 2: Create Azure OpenAI Resource

### Using Azure Portal
1. In Azure Portal, search for "Azure OpenAI"
2. Click "Create"
3. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource group**: `rg-omnix-openai`
   - **Region**: `Sweden Central`
   - **Name**: `omnix-openai-sweden`
   - **Pricing tier**: `Standard S0`
4. Click "Review + create" → "Create"

### Using Azure CLI
```bash
az cognitiveservices account create \
  --name omnix-openai-sweden \
  --resource-group rg-omnix-openai \
  --location swedencentral \
  --kind OpenAI \
  --sku S0
```

## Step 3: Deploy Models

1. Go to your Azure OpenAI resource in the portal
2. Click "Go to Azure OpenAI Studio"
3. Navigate to "Deployments" in the left sidebar
4. Click "Create new deployment"
5. Deploy these models:

### GPT-4o Model
- **Model**: `gpt-4o`
- **Deployment name**: `gpt-4o-deployment`
- **Version**: Latest available
- **Tokens per minute rate limit**: 30K

### GPT-4o Mini Model
- **Model**: `gpt-4o-mini`
- **Deployment name**: `gpt-4o-mini-deployment`
- **Version**: Latest available
- **Tokens per minute rate limit**: 50K

### GPT-3.5 Turbo Model
- **Model**: `gpt-35-turbo`
- **Deployment name**: `gpt-35-turbo-deployment`
- **Version**: Latest available
- **Tokens per minute rate limit**: 60K

## Step 4: Get Connection Details

1. Go to your Azure OpenAI resource
2. Click "Keys and Endpoint" in the left sidebar
3. Copy the following:
   - **Endpoint**: `https://omnix-openai-sweden.openai.azure.com/`
   - **Key 1**: (Copy this key)
   - **Location/Region**: `swedencentral`

## Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://omnix-openai-sweden.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_REGION=sweden-central

# Model Deployments
AZURE_OPENAI_GPT4O_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini-deployment
AZURE_OPENAI_GPT35_DEPLOYMENT=gpt-35-turbo-deployment
```

## Step 6: Update OmniX Configuration

The Azure OpenAI provider is already implemented in your codebase. You need to:

1. **Enable Azure OpenAI in model router**
2. **Add Azure models to available models list**
3. **Configure model mappings**

## Step 7: Test Connection

Once configured, you can test the connection by:

1. Starting your development server: `npm run dev`
2. Going to `/dashboard`
3. Selecting an Azure OpenAI model from the model picker
4. Sending a test message

## Verification Commands

### Test Resource Creation
```bash
az cognitiveservices account show \
  --name omnix-openai-sweden \
  --resource-group rg-omnix-openai
```

### List Deployments
```bash
az cognitiveservices account deployment list \
  --name omnix-openai-sweden \
  --resource-group rg-omnix-openai
```

## Compliance Benefits

✅ **EU Data Residency**: Data processed in Sweden (EU)
✅ **GDPR Compliant**: Full GDPR compliance for EU users
✅ **Turkey Compliance**: Meets Turkish data protection requirements
✅ **Enterprise Security**: Private networking, managed keys, VNet integration
✅ **99.9% SLA**: Enterprise-grade availability guarantee

## Cost Estimation

- **GPT-4o**: ~$5-15 per 1M tokens
- **GPT-4o Mini**: ~$0.15-0.60 per 1M tokens  
- **GPT-3.5 Turbo**: ~$0.50-2.00 per 1M tokens

## Next Steps

After completing the setup:
1. Configure the models in your application
2. Update the model router to include Azure OpenAI
3. Test with different thinking modes
4. Monitor usage and costs in Azure Portal

## Troubleshooting

- **403 Forbidden**: Check API key and deployment names
- **404 Not Found**: Verify endpoint URL and deployment names
- **429 Rate Limited**: Check token rate limits in Azure OpenAI Studio
- **Model Not Available**: Ensure model is deployed in your region

## Support

For issues:
- Azure OpenAI: Azure Support Portal
- OmniX Integration: Check application logs
- Model Deployment: Azure OpenAI Studio 