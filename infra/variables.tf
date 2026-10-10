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
  description = "Custom domain for the frontend app (used only when ACM + aliases are enabled). This is the app. subdomain, not the marketing root — see plan.md's Domain & subdomains section."
  type        = string
  default     = "app.shubhshreeknowledgehub.com"
}

variable "apex_domain_name" {
  description = "Registered root domain (no subdomain) — used by aws_amplify_domain_association, which takes the apex + a sub_domain prefix separately rather than the full hostname."
  type        = string
  default     = "shubhshreeknowledgehub.com"
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

variable "api_base_url" {
  description = <<-EOT
    Backend API base URL the frontend calls (baked into the Next.js build at
    Amplify build time as NEXT_PUBLIC_API_BASE_URL — this is a build-time,
    not runtime, value, so changing it requires a fresh Amplify build, not
    just a Terraform apply). See infra/backend's api_invoke_url output for
    the current live value.
  EOT
  type        = string
  default     = "https://c630c7v98g.execute-api.ap-south-1.amazonaws.com"
}

variable "twa_sha256_fingerprint" {
  description = <<-EOT
    SHA-256 fingerprint of the Android TWA's signing certificate, served by
    src/app/.well-known/assetlinks.json/route.ts so Android can verify the
    TWA and grant it a fully trusted (not Custom-Tab-fallback) browsing
    context — WebAuthn's platform authenticator ceremony needs that trusted
    context to work, so without this set, biometric/PIN session refresh
    silently fails and every login falls back to full OTP (see TECH_DEBT.md
    TD-012 and PLAYSTORE.md). Default matches the self-signed upload key
    currently in android/android.keystore; update if the signing key
    changes (e.g. once Play App Signing re-signs the app for distribution).
  EOT
  type        = string
  default     = "D9:EC:76:DE:F8:F1:9A:B2:EF:47:EA:67:76:CC:53:9E:A4:01:10:0A:88:A9:50:28:8D:CD:90:B4:58:D1:B5:43"
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
