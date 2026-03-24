terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

variable "project_name" { default = "school-mgmt" }
variable "environment" { default = "prod" }
variable "location" { default = "East US" }
variable "db_password" { sensitive = true }
variable "container_image" { description = "Docker image URI for the backend" }

provider "azurerm" { features {} }

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  name_clean  = replace(local.name_prefix, "-", "")
}

# --- Resource Group ---
resource "azurerm_resource_group" "main" {
  name     = "${local.name_prefix}-rg"
  location = var.location
}

# --- PostgreSQL Flexible Server ---
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.name_prefix}-pgdb"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = "dbadmin"
  administrator_password = var.db_password
  sku_name               = "B_Standard_B1ms"
  storage_mb             = 32768
  zone                   = "1"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "schoolmgmt"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# --- App Service (Backend) ---
resource "azurerm_service_plan" "main" {
  name                = "${local.name_prefix}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "B1"
}

resource "azurerm_linux_web_app" "backend" {
  name                = "${local.name_prefix}-api"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      docker_image_name = var.container_image
    }
    always_on = true
  }

  app_settings = {
    DATABASE_URL                 = "postgresql://dbadmin:${var.db_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/schoolmgmt?sslmode=require"
    NODE_ENV                     = var.environment
    WEBSITES_PORT                = "3000"
    DOCKER_ENABLE_CI             = "true"
  }
}

# --- Storage Account (Frontend) ---
resource "azurerm_storage_account" "frontend" {
  name                     = "${local.name_clean}fe"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }
}

# --- CDN for Frontend ---
resource "azurerm_cdn_profile" "main" {
  name                = "${local.name_prefix}-cdn"
  resource_group_name = azurerm_resource_group.main.name
  location            = "global"
  sku                 = "Standard_Microsoft"
}

resource "azurerm_cdn_endpoint" "frontend" {
  name                = "${local.name_prefix}-cdn-ep"
  profile_name        = azurerm_cdn_profile.main.name
  resource_group_name = azurerm_resource_group.main.name
  location            = "global"

  origin {
    name      = "storage"
    host_name = azurerm_storage_account.frontend.primary_web_host
  }

  origin_host_header = azurerm_storage_account.frontend.primary_web_host
}

# --- Outputs ---
output "backend_url" { value = "https://${azurerm_linux_web_app.backend.default_hostname}" }
output "cdn_endpoint" { value = "https://${azurerm_cdn_endpoint.frontend.fqdn}" }
output "db_fqdn" { value = azurerm_postgresql_flexible_server.main.fqdn }
output "storage_web_endpoint" { value = azurerm_storage_account.frontend.primary_web_endpoint }
