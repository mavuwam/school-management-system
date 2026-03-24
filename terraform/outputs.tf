# AWS Outputs
output "aws_alb_dns" {
  value = var.cloud_provider == "aws" ? module.aws[0].alb_dns : null
}
output "aws_cloudfront_domain" {
  value = var.cloud_provider == "aws" ? module.aws[0].cloudfront_domain : null
}
output "aws_db_endpoint" {
  value     = var.cloud_provider == "aws" ? module.aws[0].db_endpoint : null
  sensitive = true
}

# Azure Outputs
output "azure_backend_url" {
  value = var.cloud_provider == "azure" ? module.azure[0].backend_url : null
}
output "azure_cdn_endpoint" {
  value = var.cloud_provider == "azure" ? module.azure[0].cdn_endpoint : null
}

# GCP Outputs
output "gcp_backend_url" {
  value = var.cloud_provider == "gcp" ? module.gcp[0].backend_url : null
}
output "gcp_frontend_lb_ip" {
  value = var.cloud_provider == "gcp" ? module.gcp[0].frontend_lb_ip : null
}
