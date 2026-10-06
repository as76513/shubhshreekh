##############################################################################
# ShubShreekh — Backend: Go API on Lambda + API Gateway (HTTP API) + DynamoDB
#
# Sibling Terraform root to ../ (frontend-only). Same S3 state bucket, its
# own state key so frontend/backend infra lifecycles stay independent — see
# ../main.tf's "frontend/terraform.tfstate" key for the matching pattern.
##############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    bucket       = "shubhshreekh-tfstate"
    key          = "backend/terraform.tfstate"
    region       = "ap-south-1"
    profile      = "shubhshreekh-dev"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
  default_tags {
    tags = {
      Project     = "shubhshreekh"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  function_name = "shubhshreekh-api-${var.environment}"
  table_arns = [
    aws_dynamodb_table.users.arn,
    aws_dynamodb_table.subscriptions.arn,
    aws_dynamodb_table.orders.arn,
    aws_dynamodb_table.content.arn,
    # Querying a GSI needs its own resource ARN, not just the base table's.
    "${aws_dynamodb_table.content.arn}/index/*",
    aws_dynamodb_table.otp_ratelimit.arn,
    aws_dynamodb_table.settings.arn,
  ]
}
