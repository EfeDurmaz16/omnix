# 🚀 Omnix AI Platform - Setup Instructions

## 📋 **Quick Setup for Image Generation**

### **Step 1: Environment Variables**
Create a `.env.local` file in your project root:

```bash
# Required for image generation
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required for authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret

# Optional (for future Vertex AI features)
GOOGLE_CLOUD_PROJECT=your-google-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

### **Step 2: Get API Keys**

#### **OpenAI API Key (Required for Real Images)**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add credits to your OpenAI account ($5-10 minimum)
4. Copy the key to your `.env.local` file

#### **Clerk Auth Keys (Required for Login)**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy the publishable key and secret key
4. Add them to your `.env.local` file

### **Step 3: Start Development**
```bash
npm install
npm run dev
```

## 🎨 **Image Generation Models**

### **✅ Working Models (Real AI Generation)**
- **DALL-E 3** - Highest quality, best prompt following
- **DALL-E 2** - Fast and reliable
- **Stable Diffusion XL** - Placeholder for now

### **🚧 Placeholder Models (Development)**
- **Imagen 4 Fast** - Shows placeholder text
- **Imagen 3** - Shows placeholder text
- **Midjourney v6** - Shows placeholder text

> **Note:** Imagen and Midjourney models currently show placeholder images. They automatically fallback to DALL-E 3 for real generation.

## 🔧 **Troubleshooting**

### **"Unauthorized" Error**
- Make sure you're logged in with Clerk
- Check your Clerk API keys in `.env.local`

### **Placeholder Images Instead of Real Ones**
- You were probably using Imagen models
- Switch to DALL-E 3 or DALL-E 2 in the model dropdown
- Make sure your OpenAI API key is set correctly

### **"Failed to generate image" Error**
- Check your OpenAI API key
- Make sure you have credits in your OpenAI account
- Check the browser console for detailed error messages

### **Test Button Not Working**
- Open browser developer tools (F12)
- Check for JavaScript errors in the console
- Make sure you're on the latest version of the code

## 💡 **Quick Test**
1. Click the **🧪 Test Image** button - should show a random image immediately
2. Try generating with **DALL-E 3** - should create a real AI image
3. If you see placeholder URLs, switch to DALL-E models

## 🆘 **Still Having Issues?**
1. Check the browser console (F12) for error messages
2. Verify your `.env.local` file has the correct keys
3. Make sure your OpenAI account has credits
4. Try the test button first to verify the UI is working

---

✅ **Working Setup Checklist:**
- [ ] `.env.local` file created with API keys
- [ ] OpenAI API key is valid and has credits
- [ ] Clerk authentication is configured
- [ ] Using DALL-E models (not Imagen)
- [ ] Test button shows images successfully

## Phase 1 MVP Setup (4-6 weeks implementation)

### 📋 Prerequisites
- Node.js 20+ installed
- Git repository setup
- Vercel account (for deployment)
- Required API accounts (see below)

---

## 🔑 Required API Keys & Accounts

### 1. Authentication (Clerk)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
```
**Setup**: https://clerk.com/
- Create new application
- Enable Google OAuth
- Configure redirect URLs

### 2. AI Providers

#### OpenAI
```bash
OPENAI_API_KEY=sk-...
```
**Setup**: https://platform.openai.com/
- Create API key
- Add billing method
- Set usage limits

#### Google Cloud Vertex AI
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

**Setup**: https://console.cloud.google.com/
1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing one
   - Note your Project ID (will be used in `GOOGLE_CLOUD_PROJECT`)

2. **Enable Required APIs**:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   gcloud services enable ml.googleapis.com
   ```
   Or enable via Console:
   - Go to "APIs & Services" > "Library"
   - Search and enable "Vertex AI API"
   - Search and enable "AI Platform API"

3. **Create Service Account**:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `omnix-vertex-ai`
   - Description: `Service account for Omnix AI platform`
   - Click "Create and Continue"

4. **Assign Roles**:
   - Add these roles to your service account:
     - `Vertex AI User` (for Gemini models)
     - `AI Platform User` (for model access)
     - `Storage Object Viewer` (if using file uploads)

5. **Generate Key File**:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" format
   - Download the JSON file
   - Place it in your project root as `vertex-service-account.json`
   - Add to `.env.local`: `GOOGLE_APPLICATION_CREDENTIALS=./vertex-service-account.json`

6. **Set Environment Variables**:
   ```bash
   # In your .env.local file
   GOOGLE_CLOUD_PROJECT=your-project-id-here
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=./vertex-service-account.json
   ```

7. **Test Connection**:
   ```bash
   # Install Google Cloud CLI (optional, for testing)
   # Then test authentication:
   gcloud auth application-default login
   ```

**💡 Important Notes**:
- Keep your service account JSON file secure and never commit it to git
- Add `vertex-service-account.json` to your `.gitignore`
- For production, use Vercel environment variables instead of file paths
- Consider using different projects for development and production

### 3. Database (Supabase)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
**Setup**: https://supabase.com/
- Create new project
- Copy connection details
- Run database migrations

### 4. Redis Cache (Upstash)
```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```
**Setup**: https://upstash.com/
- Create Redis database
- Copy REST API credentials

### 5. Payments (Stripe)
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
**Setup**: https://stripe.com/
- Create products for Free/Pro/Ultra plans
- Setup webhook endpoints
- Configure billing portal

---

## 📦 Installation & Development

### 1. Clone & Install
```bash
git clone <repository-url>
cd omnix
npm install
```

### 2. Environment Setup
Create `.env.local` file with all required variables above.

### 3. Database Setup
```bash
# Create Supabase tables
npx supabase db reset
npx supabase db push
```

### 4. Start Development
```bash
npm run dev
```
Open http://localhost:3000

---

## 🗄️ Database Schema (Phase 1)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR NOT NULL,
  name VARCHAR,
  avatar_url VARCHAR,
  plan VARCHAR DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'ultra')),
  credits INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Chat Sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  model VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Usage Logs
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  model VARCHAR NOT NULL,
  tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR UNIQUE,
  stripe_customer_id VARCHAR,
  plan VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Deployment (Vercel)

### 1. Connect Repository
- Import project to Vercel
- Connect GitHub repository
- Configure build settings

### 2. Environment Variables
Add all required environment variables in Vercel dashboard.

### 3. Domain Setup
- Configure custom domain
- Enable HTTPS
- Setup redirects

### 4. Database Migration
```bash
# Production database setup
npx supabase db push --db-url $SUPABASE_DB_URL
```

---

## 🧪 Testing Setup

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Load Testing
```bash
npm run test:load
```

---

## 📊 Monitoring & Analytics

### 1. Error Tracking (Sentry)
```bash
SENTRY_DSN=https://...
SENTRY_ORG=...
SENTRY_PROJECT=...
```

### 2. Performance Monitoring
- Vercel Analytics (built-in)
- Custom metrics API
- Usage dashboard

### 3. Alerts Setup
- Error rate > 1%
- Response time > 500ms
- Credit usage spikes
- Failed payments

---

## 🔒 Security Checklist

### API Security
- [x] Authentication required for all endpoints
- [x] Rate limiting implemented
- [x] Input validation & sanitization
- [x] CORS configuration
- [x] Content security policy

### Data Protection
- [x] Environment variables secured
- [x] Database access restricted
- [x] API keys rotated regularly
- [x] User data encrypted
- [x] GDPR compliance ready

---

## 📈 Phase 1 Success Metrics

### Technical KPIs
- [ ] API response time < 200ms (p95)
- [ ] Error rate < 0.1%
- [ ] 99.9% uptime
- [ ] 80%+ test coverage

### Business KPIs
- [ ] 1,000+ registered users
- [ ] 50+ paying subscribers
- [ ] $2,000+ MRR
- [ ] Net Promoter Score > 50

---

## 🎯 Next Steps (Phase 2)

After Phase 1 completion:
1. Multi-provider AI integration (Claude, Gemini)
2. Image generation (DALL-E 3)
3. Enhanced UI/UX
4. Team collaboration features
5. Advanced analytics

---

## 🆘 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**API Key Issues**
- Verify all environment variables are set
- Check API key permissions and usage limits
- Ensure webhook URLs are correct

**Database Connection**
- Verify Supabase credentials
- Check network connectivity
- Run migrations if needed

**Authentication Problems**
- Verify Clerk configuration
- Check redirect URLs
- Clear browser cookies

---

## 📞 Support

- **Documentation**: `/docs` endpoint
- **API Reference**: `/api-docs` endpoint
- **Issues**: GitHub Issues
- **Discord**: [Community Server]

---

**Next Phase**: Once Phase 1 is stable and metrics are met, proceed to Phase 2 feature expansion. 