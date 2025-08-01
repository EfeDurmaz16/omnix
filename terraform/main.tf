# OmniX Google Cloud Infrastructure with Terraform

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
  default     = "omni-463513"
}

variable "region" {
  description = "Primary region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
  default     = "staging"
}

# Configure providers
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
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
  ])

  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy        = false
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "omnix-vpc"
  auto_create_subnetworks = false
  depends_on             = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "omnix-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# VPC Access Connector
resource "google_vpc_access_connector" "connector" {
  name          = "omnix-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.id
  
  min_instances = 2
  max_instances = 10
  
  depends_on = [google_project_service.apis]
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "omnix-postgres-${var.environment}"
  database_version = "POSTGRES_15"
  region          = var.region
  
  settings {
    tier              = var.environment == "production" ? "db-standard-2" : "db-f1-micro"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.environment == "production" ? 100 : 20
    disk_autoresize   = true
    
    backup_configuration {
      enabled                        = true
      start_time                    = "03:00"
      point_in_time_recovery_enabled = var.environment == "production"
      backup_retention_settings {
        retained_backups = var.environment == "production" ? 30 : 7
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
    
    maintenance_window {
      day          = 7  # Sunday
      hour         = 4
      update_track = "stable"
    }
  }
  
  deletion_protection = var.environment == "production"
  depends_on         = [google_project_service.apis]
}

resource "google_sql_database" "database" {
  name     = "omnix"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "user" {
  name     = "omnix-user"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Redis MemoryStore
resource "google_redis_instance" "cache" {
  name           = "omnix-redis-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.environment == "production" ? 5 : 1
  region         = var.region
  
  redis_version     = "REDIS_6_X"
  display_name      = "OmniX Redis Cache"
  authorized_network = google_compute_network.vpc.id
  
  depends_on = [google_project_service.apis]
}

# Cloud Storage Buckets
resource "google_storage_bucket" "storage" {
  name          = "${var.project_id}-omnix-storage-${var.environment}"
  location      = var.region
  force_destroy = var.environment != "production"
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = var.environment == "production"
  }
  
  lifecycle_rule {
    condition {
      age = var.environment == "production" ? 365 : 90
    }
    action {
      type = "Delete"
    }
  }
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Service Account
resource "google_service_account" "app" {
  account_id   = "omnix-service-account"
  display_name = "OmniX Service Account"
  description  = "Service account for OmniX application"
}

# IAM Roles for Service Account
resource "google_project_iam_member" "app_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/redis.editor",
    "roles/storage.admin",
    "roles/firestore.user",
    "roles/aiplatform.user",
    "roles/secretmanager.secretAccessor"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Secret Manager Secrets
resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "database-url",
    "redis-url",
    "openai-api-key",
    "anthropic-api-key",
    "clerk-publishable-key",
    "clerk-secret-key",
    "stripe-secret-key",
    "stripe-publishable-key"
  ])

  secret_id = each.value
  
  replication {
    auto {}
  }
}

# Store database connection string
resource "google_secret_manager_secret_version" "db_url" {
  secret      = google_secret_manager_secret.secrets["database-url"].id
  secret_data = "postgresql://${google_sql_user.user.name}:${google_sql_user.user.password}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.database.name}?sslmode=require"
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.secrets["redis-url"].id
  secret_data = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}

# Firestore Database
resource "google_firestore_database" "database" {
  project                           = var.project_id
  name                             = "(default)"
  location_id                      = var.region
  type                            = "FIRESTORE_NATIVE"
  concurrency_mode                = "OPTIMISTIC"
  app_engine_integration_mode     = "DISABLED"
  point_in_time_recovery_enablement = var.environment == "production" ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  delete_protection_state         = var.environment == "production" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
  
  depends_on = [google_project_service.apis]
}

# Outputs
output "service_account_email" {
  value = google_service_account.app.email
}

output "database_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "storage_bucket" {
  value = google_storage_bucket.storage.name
}

output "vpc_connector" {
  value = google_vpc_access_connector.connector.id
}