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
#
# TEMPORARY: CloudFront is currently blocked in this AWS account/org, so
# these resources are gated behind `var.hosting_mode == "cloudfront"` and
# disabled by default. An AWS Amplify app (below) stands in for testing
# until CloudFront access is restored — see infra/README.md. This is not a
# change to the committed architecture in ../plan.md / ../architecture.md.
##############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — avoids local state files getting corrupted by cloud-sync
  # tools (e.g. OneDrive) racing Terraform's in-place writes. Locking uses
  # S3's native conditional writes (Terraform >= 1.10), no DynamoDB needed.
  backend "s3" {
    bucket       = "shubhshreekh-tfstate"
    key          = "frontend/terraform.tfstate"
    region       = "ap-south-1"
    profile      = "shubhshreekh-dev"
    use_lockfile = true
    encrypt      = true
  }
}

# Primary provider — Mumbai, where the S3 origin lives.
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
# (disabled while hosting_mode = "amplify" — see note above)
##############################################################################

resource "aws_s3_bucket" "site" {
  count  = var.hosting_mode == "cloudfront" ? 1 : 0
  bucket = local.bucket_name
}

# Block ALL public access — CloudFront reaches the bucket via OAC, not the public internet.
resource "aws_s3_bucket_public_access_block" "site" {
  count                   = var.hosting_mode == "cloudfront" ? 1 : 0
  bucket                  = aws_s3_bucket.site[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "site" {
  count  = var.hosting_mode == "cloudfront" ? 1 : 0
  bucket = aws_s3_bucket.site[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  count  = var.hosting_mode == "cloudfront" ? 1 : 0
  bucket = aws_s3_bucket.site[0].id
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
  count                             = var.hosting_mode == "cloudfront" ? 1 : 0
  name                              = "shubhshreekh-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

##############################################################################
# CloudFront distribution
##############################################################################

resource "aws_cloudfront_distribution" "site" {
  count               = var.hosting_mode == "cloudfront" ? 1 : 0
  enabled             = true
  default_root_object = "index.html"
  comment             = "shubhshreekh frontend (${var.environment})"
  price_class         = "PriceClass_200" # includes India edge locations

  origin {
    domain_name              = aws_s3_bucket.site[0].bucket_regional_domain_name
    origin_id                = "s3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site[0].id
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
    # To use app.shubhshreeknowldgehub.com (var.domain_name), comment the
    # line above and uncomment below, and add the aliases + aws_acm_certificate
    # (see docs/domain-setup.md):
    # acm_certificate_arn      = aws_acm_certificate.site.arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  # aliases = [var.domain_name]  # enable with ACM — app subdomain only, no "www."
}

##############################################################################
# Bucket policy — allow ONLY this CloudFront distribution to read objects
##############################################################################

data "aws_iam_policy_document" "s3_policy" {
  count = var.hosting_mode == "cloudfront" ? 1 : 0

  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site[0].arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  count  = var.hosting_mode == "cloudfront" ? 1 : 0
  bucket = aws_s3_bucket.site[0].id
  policy = data.aws_iam_policy_document.s3_policy[0].json
}

##############################################################################
# TEMPORARY: AWS Amplify — stand-in hosting while CloudFront is blocked (see
# note at top of file). Connected to the GitHub repo, so pushes to `main`
# auto-build and deploy — no manual zip upload needed (see infra/README.md
# for the one-time token setup and how the old manual-deploy flow relates).
#
# platform = "WEB_COMPUTE": Amplify's Next.js-aware compute runtime (SSR +
# static in one), so it works whether or not the app ever adopts
# `output: 'export'`. Amplify auto-detects the Next.js build; no custom
# rewrite rules needed (that's only for plain static SPAs).
##############################################################################

resource "aws_amplify_app" "site" {
  count        = var.hosting_mode == "amplify" ? 1 : 0
  name         = "shubhshreekh-${var.environment}"
  platform     = "WEB_COMPUTE"
  repository   = "https://github.com/as76513/shubhshreekh.git"
  access_token = "var.github_access_token"
}

resource "aws_amplify_branch" "main" {
  count       = var.hosting_mode == "amplify" ? 1 : 0
  app_id      = aws_amplify_app.site[0].id
  branch_name = "main"
  stage       = "PRODUCTION"
  framework   = "Next.js - SSR"
}
