# 🚀 OmniX Google Cloud Deployment Guide

## Overview
This guide will walk you through deploying OmniX to Google Cloud using Cloud Run, Cloud SQL, and other managed services for a production-ready, scalable deployment.

## Prerequisites

### 1. Google Cloud Setup
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed locally
- Terraform (optional, for infrastructure as code)

### 2. Install Required Tools
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud auth application-default login

# Install Terraform (optional)
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

## 🏗️ Deployment Options

### Option 1: Quick Deploy (Automated Script)
```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy to staging
./deploy.sh staging omni-463513

# Deploy to production
./deploy.sh production omni-463513
```

### Option 2: Manual Step-by-Step

#### Step 1: Set up Google Cloud Project
```bash
export PROJECT_ID="omni-463513"
export REGION="us-central1"

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com
```

#### Step 2: Build and Push Container
```bash
# Build image
docker build -t gcr.io/$PROJECT_ID/omnix:latest .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/omnix:latest
```

#### Step 3: Set up Infrastructure
```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create omnix-connector \
  --region=$REGION \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10

# Create Cloud SQL instance
gcloud sql instances create omnix-postgres-prod \
  --database-version=POSTGRES_15 \
  --tier=db-standard-2 \
  --region=$REGION \
  --storage-size=100GB \
  --storage-auto-increase

# Create database
gcloud sql databases create omnix --instance=omnix-postgres-prod

# Create Redis instance
gcloud redis instances create omnix-redis-prod \
  --size=5 \
  --region=$REGION \
  --redis-version=redis_6_x \
  --tier=standard_ha
```

#### Step 4: Configure Secrets
```bash
# Create secrets in Secret Manager
gcloud secrets create database-url
gcloud secrets create openai-api-key
gcloud secrets create anthropic-api-key
gcloud secrets create clerk-publishable-key
gcloud secrets create clerk-secret-key
gcloud secrets create stripe-secret-key
gcloud secrets create stripe-publishable-key

# Add secret values (replace with actual values)
echo "postgresql://username:password@host:5432/omnix" | gcloud secrets versions add database-url --data-file=-
echo "your-openai-key" | gcloud secrets versions add openai-api-key --data-file=-
echo "your-anthropic-key" | gcloud secrets versions add anthropic-api-key --data-file=-
```

#### Step 5: Deploy to Cloud Run
```bash
gcloud run deploy omnix-app \
  --image gcr.io/$PROJECT_ID/omnix:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=4 \
  --min-instances=1 \
  --max-instances=100 \
  --service-account=omnix-service-account@$PROJECT_ID.iam.gserviceaccount.com \
  --vpc-connector=omnix-connector \
  --vpc-egress=private-ranges-only
```

### Option 3: Infrastructure as Code (Terraform)
```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="project_id=omni-463513" -var="environment=production"

# Apply changes
terraform apply -var="project_id=omni-463513" -var="environment=production"
```

## 🔐 Security Configuration

### 1. Service Account Setup
```bash
# Create service account
gcloud iam service-accounts create omnix-service-account \
  --display-name="OmniX Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:omnix-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:omnix-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:omnix-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Network Security
```bash
# Create firewall rules (if using custom VPC)
gcloud compute firewall-rules create allow-cloud-run \
  --allow tcp:8080 \
  --source-ranges 0.0.0.0/0 \
  --target-tags cloud-run
```

## 📊 Monitoring & Logging

### 1. Set up Monitoring Dashboard
```bash
# Import the monitoring dashboard
gcloud monitoring dashboards create --config-from-file=monitoring/dashboard.json
```

### 2. Configure Alerting
```bash
# Create notification channel (replace with your email)
gcloud alpha monitoring channels create \
  --display-name="OmniX Alerts" \
  --type=email \
  --channel-labels=email_address=your-email@domain.com

# Create alert policies
gcloud alpha monitoring policies create --policy-from-file=monitoring/alerting.yaml
```

## 🔄 CI/CD Setup

### 1. GitHub Actions (Recommended)
- Set up Workload Identity Federation for secure authentication
- Configure repository secrets for deployment
- The `.github/workflows/deploy.yml` file is already configured

### 2. Google Cloud Build
```bash
# Create build trigger
gcloud builds triggers create github \
  --repo-name=your-repo \
  --repo-owner=your-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## 🚀 Domain & SSL Configuration

### 1. Custom Domain
```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service=omnix-app \
  --domain=yourdomain.com \
  --region=$REGION
```

### 2. SSL Certificate
Google Cloud Run automatically provides SSL certificates for custom domains.

## 📈 Scaling & Performance

### 1. Auto-scaling Configuration
The Cloud Run service is configured to auto-scale based on:
- **CPU utilization**: Scales up when CPU > 60%
- **Request rate**: Scales up when requests per instance > 1000
- **Min instances**: 1 (production), 0 (staging)
- **Max instances**: 100 (production), 10 (staging)

### 2. Database Scaling
```bash
# Scale Cloud SQL instance
gcloud sql instances patch omnix-postgres-prod \
  --tier=db-standard-4

# Enable read replicas for production
gcloud sql instances create omnix-postgres-replica \
  --master-instance-name=omnix-postgres-prod \
  --tier=db-standard-2 \
  --region=$REGION
```

## 💰 Cost Optimization

### 1. Staging Environment
- Use smaller instance sizes
- Enable auto-pause for idle periods
- Use preemptible instances where possible

### 2. Production Environment
- Monitor usage with Cloud Billing alerts
- Use committed use discounts for predictable workloads
- Implement caching to reduce AI API calls

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check Cloud SQL proxy connection
gcloud sql connect omnix-postgres-prod --user=postgres

# Verify VPC connector
gcloud compute networks vpc-access connectors describe omnix-connector --region=$REGION
```

#### 2. Memory Issues
```bash
# Check memory usage
gcloud run services describe omnix-app --region=$REGION --format="value(spec.template.spec.containers.resources.limits.memory)"

# Increase memory limit
gcloud run services update omnix-app --memory=8Gi --region=$REGION
```

#### 3. Cold Start Issues
```bash
# Set minimum instances to avoid cold starts
gcloud run services update omnix-app --min-instances=2 --region=$REGION
```

### Logs & Debugging
```bash
# View service logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=omnix-app" --limit=50

# View build logs
gcloud builds log BUILD_ID

# View database logs
gcloud sql operations list --instance=omnix-postgres-prod
```

## 📝 Environment Variables

Required environment variables in Secret Manager:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic Claude API key
- `CLERK_PUBLISHABLE_KEY`: Clerk authentication public key
- `CLERK_SECRET_KEY`: Clerk authentication secret key
- `STRIPE_SECRET_KEY`: Stripe payment processing secret
- `STRIPE_PUBLISHABLE_KEY`: Stripe payment processing public key

## 🎯 Production Checklist

- [ ] Domain configured with SSL
- [ ] Database backups enabled
- [ ] Monitoring dashboard set up
- [ ] Alert policies configured
- [ ] CI/CD pipeline working
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Cost alerts configured
- [ ] Documentation updated
- [ ] Team access configured

## 📞 Support

For deployment issues:
1. Check the logs using the commands above
2. Review the monitoring dashboard
3. Verify all environment variables are set
4. Ensure all Google Cloud APIs are enabled
5. Check service account permissions

## 🔄 Updates & Maintenance

### Regular Maintenance Tasks
- Update base Docker image monthly
- Review and update dependencies quarterly
- Monitor costs and optimize monthly
- Review security configurations quarterly
- Update SSL certificates (automatic with Cloud Run)

---

**🎉 Congratulations!** Your OmniX application is now deployed on Google Cloud with enterprise-grade infrastructure, monitoring, and security.