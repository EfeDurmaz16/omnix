# 🚀 OmniX AI Platform

**The unified multimodal AI platform - "AWS for AI"**

OmniX provides enterprise-grade access to 100+ AI models under one interface, with intelligent routing, cost optimization, and enterprise security features.

![Platform Demo](./public/desktop.png)

## ✨ Features

### 🤖 **Comprehensive AI Model Access**
- **100+ AI Models**: GPT-4o, Claude 4, Gemini 2.5, LLaMA 4, Mistral, and more
- **Multimodal Support**: Text, image, video, voice, and document processing
- **Smart Routing**: Automatic model selection for optimal cost and performance
- **Provider Redundancy**: Zero downtime with multiple endpoints per model

### 🎨 **Advanced Generation Capabilities**
- **Text Generation**: All major language models with streaming responses
- **Image Generation**: DALL-E 3, Imagen 4, Stable Diffusion 3.5, FLUX.1
- **Video Generation**: Veo 3.0, Seedance V1 Pro with full management
- **Voice & Audio**: Text-to-speech, speech-to-text, voice conversations

### 🧠 **Intelligent Memory & Context**
- **RAG System**: Vector-based memory for personalized responses
- **Context Management**: Long-term user preference learning
- **Conversation Memory**: Persistent context across sessions
- **Anti-hallucination**: Built-in fact verification mechanisms

### 🤝 **Agent Framework**
- **Custom AI Agents**: Build autonomous task-specific assistants
- **Agent Templates**: Pre-built agents for common workflows
- **Task Automation**: Schedule and automate complex AI workflows
- **Agent Marketplace**: Share and discover community agents

### 🏢 **Enterprise Ready**
- **Multi-Provider Architecture**: Never locked into single vendor
- **Cost Optimization**: 40%+ savings through intelligent routing
- **Security & Compliance**: SOC 2 ready, GDPR compliant
- **Team Collaboration**: Shared workspaces and resources
- **API Platform**: Full REST API for integration

### 📱 **Modern User Experience**
- **Progressive Web App**: Works offline, installable on mobile
- **Real-time Streaming**: Live response generation
- **File Processing**: PDFs, images, documents with OCR
- **Voice Interface**: Push-to-talk and conversation modes
- **Mobile Optimized**: Native mobile experience

## 🏗️ **Architecture**

```
Frontend (Next.js/PWA) → API Gateway → Model Router → Provider Pool
                                         ↓
                               Multiple Redundant Endpoints
                               (OpenAI, Azure, Vertex, Anthropic)
                                         ↓
                               Database (PostgreSQL) + Vector Store
```

## 🚦 **Quick Start**

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- API keys for AI providers

### Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-org/omnix.git
cd omnix

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="..."

# Stripe (Payment Processing)
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional: Vector Database
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="us-east1-gcp"
```

### Database Setup
```bash
# Initialize database
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

### Development
```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

## 📦 **Deployment**

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Configuration
1. Set up PostgreSQL database (Supabase/PlanetScale recommended)
2. Configure Clerk authentication
3. Add AI provider API keys
4. Set up Stripe webhooks for payment processing
5. Configure domain and SSL

## 🎯 **Usage Examples**

### Chat with Multiple Models
```typescript
// Switch models mid-conversation
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    message: "Explain quantum computing",
    model: "gpt-4o", // or "claude-4", "gemini-2.5-pro"
    chatId: "conversation-123"
  })
});
```

### Generate Images
```typescript
const image = await fetch('/api/generate/image', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "A futuristic city at sunset",
    model: "dall-e-3", // or "imagen-4", "flux-1-pro"
    style: "photorealistic"
  })
});
```

### Create AI Agent
```typescript
const agent = await fetch('/api/agents', {
  method: 'POST',
  body: JSON.stringify({
    name: "Research Assistant",
    description: "Helps with academic research",
    systemPrompt: "You are an expert researcher...",
    tools: ["web-search", "document-analysis"],
    model: "claude-4-opus"
  })
});
```

## 🔧 **API Documentation**

### Core Endpoints
- `POST /api/chat/stream` - Streaming chat completions
- `POST /api/generate/image` - Image generation
- `POST /api/generate/video` - Video generation
- `GET /api/models` - List available models
- `POST /api/agents` - Create/manage AI agents

### Authentication
All API endpoints require authentication via Clerk session tokens:
```typescript
headers: {
  'Authorization': `Bearer ${sessionToken}`
}
```

### Rate Limits
- Free: 5 requests/minute
- Pro: 60 requests/minute  
- Team: 300 requests/minute
- Enterprise: Custom limits

## 💰 **Pricing**

| Plan | Price | Credits/Month | Features |
|------|-------|---------------|----------|
| **Free** | $0 | 100 | Basic models, 5 requests/day |
| **Pro** | $19.99 | 2,000 | All models, unlimited chat, priority support |
| **Team** | $49.99 | 5,000 | Team features, shared agents, admin controls |
| **Enterprise** | Custom | Custom | SSO, compliance, dedicated support |

### Credit System
- Text generation: 1-5 credits per request
- Image generation: 10-50 credits per image
- Video generation: 100-500 credits per video
- File processing: 5-25 credits per document

## 🛡️ **Security & Compliance**

### Data Protection
- End-to-end encryption for sensitive data
- Minimal data retention (24-48 hours default)
- User-controlled data deletion
- GDPR, CCPA, SOC 2 compliance ready

### Enterprise Features
- SSO integration (SAML, OAuth)
- Advanced audit logging
- Custom data retention policies
- On-premise deployment options

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Fork the repository
git clone https://github.com/YOUR-USERNAME/omnix.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and test
npm run test
npm run build

# Submit pull request
```

## 📊 **Monitoring & Analytics**

### Built-in Analytics
- Real-time usage monitoring
- Cost tracking per model/user
- Performance metrics
- Error rate monitoring

### Integrations
- Sentry for error tracking
- PostHog for user analytics
- Custom metrics dashboard
- Slack/Discord notifications

## 🌍 **Global Availability**

### Regional Compliance
- **Turkey**: Full compliance with local regulations
- **EU**: GDPR compliant with EU data residency
- **US**: SOC 2 Type II certification
- **Global**: Multi-region deployment available

### Language Support
- Interface: English, Turkish, Spanish, French, German
- AI Models: 100+ languages supported
- Documentation: English, Turkish

## 🔮 **Roadmap**

### Q1 2025
- [ ] Mobile iOS/Android apps
- [ ] Advanced agent marketplace
- [ ] Custom model fine-tuning
- [ ] Enterprise SSO integration

### Q2 2025
- [ ] On-premise deployment
- [ ] Advanced analytics dashboard
- [ ] Workflow automation platform
- [ ] Multi-tenant architecture

### Q3 2025
- [ ] Edge AI deployment
- [ ] Custom model training
- [ ] Advanced collaboration features
- [ ] Integration marketplace

## 📞 **Support**

### Community
- [Discord Server](https://discord.gg/omnix)
- [GitHub Discussions](https://github.com/your-org/omnix/discussions)
- [Documentation](https://docs.omnix.ai)

### Enterprise Support
- Dedicated support team
- 24/7 monitoring
- SLA guarantees
- Custom training sessions

### Contact
- **Email**: support@omnix.ai
- **Enterprise**: enterprise@omnix.ai
- **Twitter**: [@OmniXAI](https://twitter.com/omnixai)

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Clerk](https://clerk.dev/) - Authentication
- [Prisma](https://prisma.io/) - Database ORM
- [Stripe](https://stripe.com/) - Payment processing
- [Vercel](https://vercel.com/) - Deployment platform

Special thanks to the open source community and all our contributors!

---

**Made with ❤️ by the OmniX Team**

*Democratizing access to AI for everyone, everywhere.*