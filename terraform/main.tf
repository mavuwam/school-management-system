terraform {
  required_version = ">= 1.5"
}

module "aws" {
  source = "./modules/aws"
  count  = var.cloud_provider == "aws" ? 1 : 0

  project_name    = var.project_name
  environment     = var.environment
  region          = var.aws_region
  db_password     = var.db_password
  container_image = var.container_image
}

module "azure" {
  source = "./modules/azure"
  count  = var.cloud_provider == "azure" ? 1 : 0

  project_name    = var.project_name
  environment     = var.environment
  location        = var.azure_location
  db_password     = var.db_password
  container_image = var.container_image
}

module "gcp" {
  source = "./modules/gcp"
  count  = var.cloud_provider == "gcp" ? 1 : 0

  project_name    = var.project_name
  environment     = var.environment
  project_id      = var.gcp_project_id
  region          = var.gcp_region
  db_password     = var.db_password
  container_image = var.container_image
}
