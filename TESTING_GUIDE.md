# 🧪 Omnix Testing Guide

## Current Status: ✅ API Working, Need OpenAI Setup

Your chat system is **working perfectly**! The middleware and API routing issues are resolved. You just need to set up OpenAI properly.

---

## 🚀 Quick Test (No OpenAI Required)

### Step 1: Test with Mock Responses
Your system is currently running in **Safe Mode** with mock AI responses. This is perfect for testing!

1. **Go to your chat interface** 
2. **Send any message**
3. **You should get a mock response** showing the system is working

### Step 2: What You Should See
```
🤖 Mock AI Response (Safe Mode)

You asked: "Hello"

Model: gpt-3.5-turbo
Timestamp: 12/17/2024, 11:45:23 PM

This is a mock response to test the chat system safely...
```

If you see this, **your entire system is working!** 🎉

---

## 🔧 Enable Real AI (OpenAI Setup)

### Current Issue: OpenAI Billing
Your error: `429 You exceeded your current quota` means:

1. **OpenAI account needs billing setup**
2. **Free credits are exhausted** 
3. **API key needs payment method**

### Step 1: Set Up OpenAI Billing
1. Go to https://platform.openai.com/
2. Add a **payment method** (credit card)
3. **Add $5-$10 credit** to your account
4. **Verify billing is active**

### Step 2: Get the Right API Key
1. Go to https://platform.openai.com/api-keys
2. Create a **new secret key**
3. Copy the full key (starts with `sk-`)

### Step 3: Update Environment
Add to your `.env.local` file:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your_actual_key_here
OPENAI_ENABLED=true  # This enables real AI
```

### Step 4: Restart & Test
```bash
npm run dev
```

---

## 🔍 Debugging Tools

### Test API Directly
Visit: http://localhost:3000/api/test

Should show:
```json
{
  "message": "API is working!",
  "timestamp": "2024-12-17T23:45:23.000Z",
  "environment": "development",
  "hasOpenAI": true
}
```

### Check Environment Variables
Your `.env.local` should contain:
```bash
# Required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# For Real AI (Optional)
OPENAI_API_KEY=sk-...
OPENAI_ENABLED=true
```

---

## 🎯 Common Issues & Solutions

### Issue: "API Error: {}"
**Solution**: Already fixed! ✅

### Issue: "429 You exceeded your quota"
**Solutions**:
1. Add billing to OpenAI account
2. Check API key is valid
3. Try with `OPENAI_ENABLED=false` first

### Issue: "Clerk middleware error"
**Solution**: Already fixed! ✅

### Issue: "Model not found"
**Current models we use**:
- `gpt-3.5-turbo` (cheapest)
- `gpt-4` (more expensive)
- `gpt-4-turbo` (most expensive)

**Recommendation**: Start with `gpt-3.5-turbo`

---

## 💰 OpenAI Cost Estimates

### Per Message Costs:
- **gpt-3.5-turbo**: ~$0.001-0.002 per message
- **gpt-4**: ~$0.01-0.03 per message
- **gpt-4-turbo**: ~$0.005-0.015 per message

### $5 Credit Gets You:
- **~2,500-5,000 messages** with gpt-3.5-turbo
- **~150-500 messages** with gpt-4
- **~300-1,000 messages** with gpt-4-turbo

---

## ✅ System Health Check

Run through this checklist:

- [ ] **Chat interface loads**
- [ ] **Can send messages**
- [ ] **Gets mock responses** (Safe Mode)
- [ ] **API test endpoint works** (`/api/test`)
- [ ] **No console errors** (except OpenAI quota)
- [ ] **Middleware working** (no Clerk errors)

If all checked: **Your system is production-ready!** 🚀

---

## 🔄 Next Steps

### Option 1: Continue with Mock Mode
- Perfect for development
- Test all UI features
- No OpenAI costs

### Option 2: Enable Real AI
- Follow OpenAI setup above
- Start with gpt-3.5-turbo
- Monitor costs

### Option 3: Alternative AI Providers (Phase 2)
- Anthropic Claude (often has free credits)
- Google Gemini (has free tier)
- Hugging Face (free models)

---

## 🆘 Still Having Issues?

### Check Browser Console
1. Open **Developer Tools** (F12)
2. Check **Console** tab for errors
3. Look for the **detailed error messages**

### Check Server Logs
Look in your terminal for:
- `Chat API called`
- `Using mock response - OpenAI disabled`
- `Middleware running for: /api/chat`

### Test Without Authentication
Temporarily disable auth in API routes to isolate issues.

---

**Bottom Line**: Your system is working perfectly! The only remaining step is setting up OpenAI billing if you want real AI responses. 