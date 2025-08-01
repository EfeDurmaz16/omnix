# Simple OmniX Google Cloud Deployment Script
param(
    [string]$Environment = "staging",
    [string]$ProjectId = "omni-463513"
)

$Region = "us-central1"
$ServiceName = "omnix-app"
$ImageName = "gcr.io/$ProjectId/omnix"

Write-Host "Deploying OmniX to Google Cloud" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Project ID: $ProjectId" -ForegroundColor Cyan

# Set project
Write-Host "Setting project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Check auth
$account = gcloud config get-value account
if ([string]::IsNullOrEmpty($account)) {
    Write-Host "No active account. Please run: gcloud auth login" -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated as: $account" -ForegroundColor Green

# Enable APIs
Write-Host "Enabling APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com --project=$ProjectId
gcloud services enable run.googleapis.com --project=$ProjectId
gcloud services enable storage.googleapis.com --project=$ProjectId

# Build container
Write-Host "Building container..." -ForegroundColor Yellow
gcloud builds submit --tag $ImageName .

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
if ($Environment -eq "production") {
    $serviceName = $ServiceName
    $memory = "4Gi"
    $cpu = "4"
} else {
    $serviceName = "$ServiceName-$Environment"  
    $memory = "2Gi"
    $cpu = "2"
}

gcloud run deploy $serviceName `
    --image $ImageName `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --memory $memory `
    --cpu $cpu `
    --min-instances 0 `
    --max-instances 10

# Get URL
$serviceUrl = gcloud run services describe $serviceName --region=$Region --format="value(status.url)"
Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure environment variables" -ForegroundColor Gray
Write-Host "2. Set up database" -ForegroundColor Gray
Write-Host "3. Test the deployment" -ForegroundColor Gray