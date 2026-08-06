##############################################################################
# ShubShreekh — Static frontend hosting: S3 + CloudFront (Terraform)
#
# Architecture:
#   S3 (private) --OAC--> CloudFront (HTTPS, CDN) --> users
#   Next.js is built with `output: 'export'` -> static files uploaded to S3.
#
# Security posture:
#   - S3 bucket is PRIVATE (no public access). Only CloudFront can read it,
#     via Origin Access Control (OAC) — the modern replacement for OAI.
#   - HTTPS enforced; HTTP redirects to HTTPS.
#   - SPA fallback: 403/404 -> index.html so client-side routes work.
##############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state (recommended before collaborating). Uncomment once the
  # bucket + lock table exist.
  # backend "s3" {
  #   bucket         = "shubhshreekh-tfstate"
  #   key            = "frontend/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "shubhshreekh-tf-lock"
  #   encrypt        = true
  # }
}

# Primary provider — Mumbai, where the S3 origin lives.
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "shubhshreekh"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

# CloudFront certificates MUST be in us-east-1, regardless of origin region.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      Project   = "shubhshreekh"
      ManagedBy = "terraform"
    }
  }
}

locals {
  bucket_name = "${var.environment}-shubhshreekh-frontend"
}

##############################################################################
# S3 bucket — private origin for the static site
##############################################################################

resource "aws_s3_bucket" "site" {
  bucket = local.bucket_name
}

# Block ALL public access — CloudFront reaches the bucket via OAC, not the public internet.
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

##############################################################################
# CloudFront Origin Access Control (OAC) — lets ONLY CloudFront read the bucket
##############################################################################

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "shubhshreekh-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

##############################################################################
# CloudFront distribution
##############################################################################

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "shubhshreekh frontend (${var.environment})"
  price_class         = "PriceClass_200" # includes India edge locations

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${local.bucket_name}"
    viewer_protocol_policy = "redirect-to-https" # force HTTPS
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS managed "CachingOptimized" policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA fallback — client-side routes (e.g. /pricing) resolve to index.html
  # instead of 404, and refreshes on deep links work.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Default CloudFront cert now; swap to ACM + custom domain when DNS is ready.
  viewer_certificate {
    cloudfront_default_certificate = true
    # To use shubhshreekh.com, comment the line above and uncomment below,
    # and add the aliases + aws_acm_certificate (see docs/domain-setup.md):
    # acm_certificate_arn      = aws_acm_certificate.site.arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  # aliases = [var.domain_name, "www.${var.domain_name}"]  # enable with ACM
}

##############################################################################
# Bucket policy — allow ONLY this CloudFront distribution to read objects
##############################################################################

data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.s3_policy.json
}
