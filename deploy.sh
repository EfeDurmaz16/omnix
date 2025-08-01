#!/bin/bash

# OmniX Google Cloud Deployment Script
# Usage: ./deploy.sh [environment] [project-id]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_ID=${2:-omni-463513}
REGION="us-central1"
SERVICE_NAME="omnix-app"
IMAGE_NAME="gcr.io/${PROJECT_ID}/omnix"

echo "🚀 Deploying OmniX to Google Cloud"
echo "Environment: $ENVIRONMENT"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Force authentication check and set project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Check authentication
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ No active account found. Please run: gcloud auth login"
    exit 1
fi

# Enable required APIs (one by one to avoid auth issues)
echo "🔧 Enabling required Google Cloud APIs..."
APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "redis.googleapis.com"
    "firestore.googleapis.com"
    "storage.googleapis.com"
    "aiplatform.googleapis.com"
    "speech.googleapis.com"
    "translate.googleapis.com"
    "vpcaccess.googleapis.com"
    "compute.googleapis.com"
    "container.googleapis.com"
    "secretmanager.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "Enabling $api..."
    gcloud services enable "$api" --project="$PROJECT_ID" || {
        echo "⚠️ Failed to enable $api, continuing..."
    }
done

# Build and push the container image
echo "🏗️ Building container image..."
gcloud builds submit --tag $IMAGE_NAME .

# Create VPC connector if it doesn't exist
echo "🌐 Setting up VPC connector..."
if ! gcloud compute networks vpc-access connectors describe omnix-connector --region=$REGION &>/dev/null; then
    gcloud compute networks vpc-access connectors create omnix-connector \
        --region=$REGION \
        --subnet=default \
        --subnet-project=$PROJECT_ID \
        --min-instances=2 \
        --max-instances=10
fi

# Create Cloud SQL instance if it doesn't exist
echo "🗄️ Setting up Cloud SQL PostgreSQL instance..."
INSTANCE_NAME="omnix-postgres-${ENVIRONMENT}"
if ! gcloud sql instances describe $INSTANCE_NAME &>/dev/null; then
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=20GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --enable-bin-log \
        --maintenance-release-channel=production \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04
        
    # Create database
    gcloud sql databases create omnix --instance=$INSTANCE_NAME
    
    # Create user
    gcloud sql users create omnix-user \
        --instance=$INSTANCE_NAME \
        --password=$(openssl rand -base64 32)
fi

# Create Redis instance if it doesn't exist
echo "🔴 Setting up Redis MemoryStore..."
REDIS_INSTANCE="omnix-redis-${ENVIRONMENT}"
if ! gcloud redis instances describe $REDIS_INSTANCE --region=$REGION &>/dev/null; then
    gcloud redis instances create $REDIS_INSTANCE \
        --size=1 \
        --region=$REGION \
        --redis-version=redis_6_x \
        --tier=basic
fi

# Create service account if it doesn't exist
echo "🔐 Setting up service account..."
SERVICE_ACCOUNT="omnix-service-account"
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null; then
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="OmniX Service Account" \
        --description="Service account for OmniX application"
        
    # Grant necessary roles
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/cloudsql.client"
        
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/redis.editor"
        
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/storage.admin"
        
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/firestore.user"
        
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/aiplatform.user"
fi

# Update the cloud-run.yaml with actual project ID
sed "s/PROJECT_ID/$PROJECT_ID/g" cloud-run.yaml > cloud-run-${ENVIRONMENT}.yaml

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run services replace cloud-run-${ENVIRONMENT}.yaml \
    --region=$REGION

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📋 Next steps:"
echo "1. Update your domain DNS to point to the Cloud Run service"
echo "2. Configure secrets in Secret Manager"
echo "3. Run database migrations"
echo "4. Test the deployment"

# Optional: Run database migrations
read -p "🔄 Do you want to run database migrations now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Running database migrations..."
    gcloud run jobs create omnix-migrate \
        --image=$IMAGE_NAME \
        --args="npx,prisma,migrate,deploy" \
        --service-account=${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
        --region=$REGION \
        --max-retries=1
        
    gcloud run jobs execute omnix-migrate --region=$REGION --wait
fi

echo "🎉 OmniX deployment to Google Cloud completed!"