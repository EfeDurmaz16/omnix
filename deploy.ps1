# OmniX Google Cloud Deployment Script (PowerShell)
# Usage: .\deploy.ps1 staging omni-463513

param(
    [string]$Environment = "staging",
    [string]$ProjectId = "omni-463513"
)

$Region = "us-central1"
$ServiceName = "omnix-app"
$ImageName = "gcr.io/$ProjectId/omnix"

Write-Host "🚀 Deploying OmniX to Google Cloud" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Project ID: $ProjectId" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan

# Check if gcloud is installed
try {
    $null = gcloud version 2>$null
    Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green
}
catch {
    Write-Host "❌ gcloud CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check authentication
try {
    $activeAccount = gcloud config get-value account 2>$null
    if ([string]::IsNullOrEmpty($activeAccount)) {
        Write-Host "❌ No active account found. Please run: gcloud auth login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Authenticated as: $activeAccount" -ForegroundColor Green
}
catch {
    Write-Host "❌ Authentication check failed. Please run: gcloud auth login" -ForegroundColor Red
    exit 1
}

# Set the project
Write-Host "📋 Setting project to $ProjectId" -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable required APIs
Write-Host "🔧 Enabling required Google Cloud APIs..." -ForegroundColor Yellow
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com", 
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "aiplatform.googleapis.com",
    "speech.googleapis.com",
    "translate.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor Gray
    try {
        gcloud services enable $api --project=$ProjectId
        Write-Host "  ✅ $api enabled" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠️ Failed to enable $api, continuing..." -ForegroundColor Yellow
    }
}

# Build and push the container image
Write-Host "🏗️ Building container image..." -ForegroundColor Yellow
try {
    gcloud builds submit --tag $ImageName .
    Write-Host "✅ Container image built and pushed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to build container image" -ForegroundColor Red
    exit 1
}

# Create VPC connector if it doesn't exist
Write-Host "🌐 Setting up VPC connector..." -ForegroundColor Yellow
$connectorCheck = gcloud compute networks vpc-access connectors describe omnix-connector --region=$Region 2>$null
if ($LASTEXITCODE -ne 0) {
    try {
        gcloud compute networks vpc-access connectors create omnix-connector --region=$Region --subnet=default --subnet-project=$ProjectId --min-instances=2 --max-instances=10
        Write-Host "✅ VPC connector created" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ VPC connector creation failed, continuing..." -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ VPC connector already exists" -ForegroundColor Green
}

# Create Cloud SQL instance if it doesn't exist
Write-Host "🗄️ Setting up Cloud SQL PostgreSQL instance..." -ForegroundColor Yellow
$instanceName = "omnix-postgres-$Environment"
$instanceCheck = gcloud sql instances describe $instanceName 2>$null
if ($LASTEXITCODE -ne 0) {
    try {
        if ($Environment -eq "production") {
            $tier = "db-standard-2"
            $storageSize = "100GB"
        }
        else {
            $tier = "db-f1-micro" 
            $storageSize = "20GB"
        }
        
        gcloud sql instances create $instanceName --database-version=POSTGRES_15 --tier=$tier --region=$Region --storage-type=SSD --storage-size=$storageSize --storage-auto-increase --backup-start-time=03:00 --maintenance-release-channel=production --maintenance-window-day=SUN --maintenance-window-hour=04
            
        # Create database
        gcloud sql databases create omnix --instance=$instanceName
        
        # Generate random password
        $password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object {[char]$_})
        
        # Create user
        gcloud sql users create omnix-user --instance=$instanceName --password=$password
            
        Write-Host "✅ Cloud SQL instance created" -ForegroundColor Green
        Write-Host "📝 Database password: $password" -ForegroundColor Cyan
    }
    catch {
        Write-Host "⚠️ Cloud SQL instance creation failed, continuing..." -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ Cloud SQL instance already exists" -ForegroundColor Green
}

# Create Redis instance if it doesn't exist
Write-Host "🔴 Setting up Redis MemoryStore..." -ForegroundColor Yellow
$redisInstance = "omnix-redis-$Environment"
$redisCheck = gcloud redis instances describe $redisInstance --region=$Region 2>$null
if ($LASTEXITCODE -ne 0) {
    try {
        if ($Environment -eq "production") {
            $redisSize = 5
            $redisTier = "standard_ha"
        }
        else {
            $redisSize = 1
            $redisTier = "basic"
        }
        
        gcloud redis instances create $redisInstance --size=$redisSize --region=$Region --redis-version=redis_6_x --tier=$redisTier
            
        Write-Host "✅ Redis instance created" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Redis instance creation failed, continuing..." -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ Redis instance already exists" -ForegroundColor Green
}

# Create service account if it doesn't exist
Write-Host "🔐 Setting up service account..." -ForegroundColor Yellow
$serviceAccount = "omnix-service-account"
$saCheck = gcloud iam service-accounts describe "${serviceAccount}@${ProjectId}.iam.gserviceaccount.com" 2>$null
if ($LASTEXITCODE -ne 0) {
    try {
        gcloud iam service-accounts create $serviceAccount --display-name="OmniX Service Account" --description="Service account for OmniX application"
            
        # Grant necessary roles
        $roles = @(
            "roles/cloudsql.client",
            "roles/redis.editor", 
            "roles/storage.admin",
            "roles/firestore.user",
            "roles/aiplatform.user",
            "roles/secretmanager.secretAccessor"
        )
        
        foreach ($role in $roles) {
            gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:${serviceAccount}@${ProjectId}.iam.gserviceaccount.com" --role=$role
        }
        
        Write-Host "✅ Service account created and configured" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Service account creation failed, continuing..." -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ Service account already exists" -ForegroundColor Green
}

# Deploy to Cloud Run
Write-Host "☁️ Deploying to Cloud Run..." -ForegroundColor Yellow
try {
    if ($Environment -eq "production") {
        $memory = "4Gi"
        $cpu = "4"
        $minInstances = "1"
        $maxInstances = "100"
        $serviceName = $ServiceName
    }
    else {
        $memory = "2Gi"
        $cpu = "2"
        $minInstances = "0"
        $maxInstances = "10"
        $serviceName = "$ServiceName-$Environment"
    }
    
    gcloud run deploy $serviceName --image $ImageName --region $Region --platform managed --allow-unauthenticated --memory $memory --cpu $cpu --min-instances $minInstances --max-instances $maxInstances --service-account "${serviceAccount}@${ProjectId}.iam.gserviceaccount.com" --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,GOOGLE_CLOUD_PROJECT=$ProjectId,GOOGLE_CLOUD_LOCATION=$Region"
        
    Write-Host "✅ Cloud Run deployment successful" -ForegroundColor Green
}
catch {
    Write-Host "❌ Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

# Get the service URL
try {
    $serviceUrl = gcloud run services describe $serviceName --region=$Region --format="value(status.url)"
    Write-Host ""
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Service URL: $serviceUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Configure secrets in Secret Manager" -ForegroundColor Gray
    Write-Host "2. Run database migrations" -ForegroundColor Gray
    Write-Host "3. Test the deployment" -ForegroundColor Gray
    Write-Host "4. Set up custom domain (optional)" -ForegroundColor Gray
}
catch {
    Write-Host "⚠️ Could not retrieve service URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 OmniX deployment to Google Cloud completed!" -ForegroundColor Green