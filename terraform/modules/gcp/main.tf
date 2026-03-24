terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_name" { default = "school-mgmt" }
variable "environment" { default = "prod" }
variable "project_id" { description = "GCP project ID" }
variable "region" { default = "us-central1" }
variable "db_password" { sensitive = true }
variable "container_image" { description = "Docker image URI for the backend" }

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# --- VPC ---
resource "google_compute_network" "main" {
  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "${local.name_prefix}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# --- Cloud SQL PostgreSQL ---
resource "google_sql_database_instance" "main" {
  name             = "${local.name_prefix}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-f1-micro"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "main" {
  name     = "schoolmgmt"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "main" {
  name     = "dbadmin"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# --- Cloud Run (Backend) ---
resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.name_prefix}-api"
  location = var.region

  template {
    containers {
      image = var.container_image

      ports { container_port = 3000 }

      env { name = "DATABASE_URL"; value = "postgresql://dbadmin:${var.db_password}@${google_sql_database_instance.main.private_ip_address}:5432/schoolmgmt" }
      env { name = "NODE_ENV"; value = var.environment }

      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
    }

    vpc_access {
      network_interfaces {
        network    = google_compute_network.main.name
        subnetwork = google_compute_subnetwork.main.name
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- GCS Bucket (Frontend) ---
resource "google_storage_bucket" "frontend" {
  name          = "${local.name_prefix}-frontend-${var.project_id}"
  location      = var.region
  force_destroy = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  uniform_bucket_level_access = true
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# --- Load Balancer for Frontend ---
resource "google_compute_backend_bucket" "frontend" {
  name        = "${local.name_prefix}-frontend-backend"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true
}

resource "google_compute_url_map" "frontend" {
  name            = "${local.name_prefix}-url-map"
  default_service = google_compute_backend_bucket.frontend.id
}

resource "google_compute_target_http_proxy" "frontend" {
  name    = "${local.name_prefix}-http-proxy"
  url_map = google_compute_url_map.frontend.id
}

resource "google_compute_global_forwarding_rule" "frontend" {
  name       = "${local.name_prefix}-fwd-rule"
  target     = google_compute_target_http_proxy.frontend.id
  port_range = "80"
}

# --- Outputs ---
output "backend_url" { value = google_cloud_run_v2_service.backend.uri }
output "frontend_lb_ip" { value = google_compute_global_forwarding_rule.frontend.ip_address }
output "db_private_ip" { value = google_sql_database_instance.main.private_ip_address }
output "frontend_bucket" { value = google_storage_bucket.frontend.name }
