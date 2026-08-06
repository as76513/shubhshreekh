variable "aws_region" {
  description = "AWS region for the S3 origin — Mumbai."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev / prod)."
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Custom domain (used only when ACM + aliases are enabled)."
  type        = string
  default     = "shubhshreekh.com"
}
