# OmniX Google Cloud Deployment Architecture

## 🏗️ Infrastructure Components

### **Core Services**
- **Cloud Run** - Containerized Next.js application
- **Cloud SQL (PostgreSQL)** - Primary database (replacing Prisma local DB)
- **Firestore** - Document storage for vectors and metadata
- **Cloud Storage** - File storage (images, videos, documents)
- **Redis MemoryStore** - Caching and sessions
- **Cloud Load Balancer** - Traffic distribution and SSL

### **AI & ML Stack**
- **Vertex AI** - Model hosting and vector search
- **Gemini API** - Google's language models
- **Document AI** - Advanced document processing
- **Speech-to-Text & Text-to-Speech** - Audio processing

### **Microservices Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Load Balancer                      │
│                        (SSL/HTTPS)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼─────┐
│Frontend│    │   Main API  │    │   ADK     │
│Service │    │   Service   │    │  Service  │
│(Next.js)│   │  (Next.js)  │    │ (Python)  │
└───┬────┘    └──────┬──────┘    └─────┬─────┘
    │                │                 │
    └────────────────┼─────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐           ┌─────▼──────┐
    │Cloud SQL│           │  Firestore │
    │(PostgreSQL)│        │   + GCS    │
    └─────────┘           └────────────┘
```

### **Data Architecture**
- **Cloud SQL**: User data, billing, transactions, metadata
- **Firestore**: Conversations, vector embeddings, real-time data
- **Cloud Storage**: Videos, images, uploaded files
- **Redis MemoryStore**: Session cache, rate limiting, temp data

### **Security & Compliance**
- **IAM & Service Accounts** - Fine-grained access control
- **Cloud Armor** - DDoS protection and WAF
- **Cloud Security Command Center** - Security monitoring
- **Cloud KMS** - Key management for sensitive data
- **VPC** - Network isolation and security

### **Monitoring & Operations**
- **Cloud Monitoring** - Application and infrastructure metrics
- **Cloud Logging** - Centralized log aggregation
- **Cloud Trace** - Distributed tracing
- **Error Reporting** - Error tracking and alerting
- **Cloud Profiler** - Performance profiling

## 🌍 Multi-Region Setup (Production)

### **Primary Region: us-central1**
- Main application deployment
- Primary database
- User-facing traffic

### **Secondary Region: europe-west1**
- Disaster recovery
- European users (GDPR compliance)
- Backup databases

### **Global Services**
- **Cloud CDN** - Global content delivery
- **Global Load Balancer** - Traffic routing
- **Cloud DNS** - Domain management

## 📊 Cost Optimization

### **Auto-scaling Configuration**
- **Cloud Run**: 0-100 instances based on traffic
- **Cloud SQL**: Automatic storage scaling
- **Firestore**: Pay-per-use
- **Vertex AI**: On-demand model serving

### **Resource Tiers**
```
Development:  ~$50-100/month
Staging:      ~$100-200/month  
Production:   ~$500-1500/month (depending on usage)
```

## 🔧 Migration Strategy

### **Phase 1: Infrastructure Setup** (Week 1)
- Set up GCP project and billing
- Configure networking (VPC, subnets)
- Deploy Cloud SQL PostgreSQL
- Set up Redis MemoryStore
- Configure IAM and security

### **Phase 2: Application Migration** (Week 2)
- Containerize Next.js application
- Deploy to Cloud Run
- Migrate database from local to Cloud SQL
- Configure Firestore collections
- Set up Cloud Storage buckets

### **Phase 3: AI Services Integration** (Week 3)
- Configure Vertex AI endpoints
- Set up vector search indices
- Integrate Document AI
- Configure monitoring and logging

### **Phase 4: Production Optimization** (Week 4)
- Set up CI/CD pipelines
- Configure auto-scaling
- Implement security hardening
- Performance testing and optimization