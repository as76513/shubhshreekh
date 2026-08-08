variable "aws_region" {
  description = "AWS region for the S3 origin — Mumbai."
  type        = string
  default     = "ap-south-1"
}

variable "aws_profile" {
  description = "Named AWS CLI profile to use (avoids falling back to a work/SSO 'default' profile)."
  type        = string
  default     = "shubhshreekh-dev"
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

variable "hosting_mode" {
  description = <<-EOT
    Which frontend hosting backend to provision: "cloudfront" (the committed
    target architecture — see ../plan.md) or "amplify" (temporary stand-in
    while CloudFront is blocked in this AWS account/org).
    Switch back to "cloudfront" once CloudFront access is restored — no doc
    changes needed, this is a test-only detour, not a stack decision change.
  EOT
  type        = string
  default     = "amplify"

  validation {
    condition     = contains(["cloudfront", "amplify"], var.hosting_mode)
    error_message = "hosting_mode must be \"cloudfront\" or \"amplify\"."
  }
}

variable "github_access_token" {
  description = <<-EOT
    GitHub personal access token used once to connect the Amplify app to
    https://github.com/as76513/shubhshreekh.git (repo is public, but Amplify
    still needs a token to create the build webhook). Needs either:
      - a classic PAT with `repo` + `admin:repo_hook` scopes, or
      - a fine-grained PAT scoped to just this repo with Contents: read,
        Metadata: read, Webhooks: read/write.
    Only used when hosting_mode = "amplify". NEVER commit this — pass it via
    `TF_VAR_github_access_token` env var or an untracked terraform.tfvars.
  EOT
  type        = string
  default     = null
  sensitive   = true
}
