variable "cloud_provider" {
  description = "Cloud provider to deploy to: aws, azure, or gcp"
  type        = string
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "cloud_provider must be one of: aws, azure, gcp"
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  default     = "school-mgmt"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  default     = "prod"
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "Docker image URI for the backend service"
  type        = string
}

# AWS-specific
variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

# Azure-specific
variable "azure_location" {
  description = "Azure region"
  default     = "East US"
}

# GCP-specific
variable "gcp_project_id" {
  description = "GCP project ID"
  default     = ""
}

variable "gcp_region" {
  description = "GCP region"
  default     = "us-central1"
}
