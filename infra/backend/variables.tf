variable "aws_region" {
  description = "AWS region — Mumbai."
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

variable "session_token_signing_secret" {
  description = "Backend-only secret for signing/verifying custom session tokens (internal/auth). Pass via TF_VAR_session_token_signing_secret — never commit."
  type        = string
  sensitive   = true
}

variable "msg91_auth_key" {
  description = "MSG91 SendOTP auth key. Empty allowed if otp_test_phones is set (DLT pending)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "msg91_template_id" {
  description = "MSG91 approved OTP template ID."
  type        = string
  default     = ""
}

variable "otp_test_phones" {
  description = "Comma-separated QA/Play reviewer phones (10-digit or 91…). See TECH_DEBT.md TD-001."
  type        = string
  default     = ""
}

variable "otp_test_code" {
  description = "Fixed OTP for otp_test_phones whitelist."
  type        = string
  default     = "123456"
  sensitive   = true
}

variable "analyst_phones" {
  description = "Comma-separated RA/analyst phones (10-digit or 91…) — granted the analyst role claim on login, which gates /admin/insights/*. See TECH_DEBT.md TD-013."
  type        = string
  default     = ""
}

variable "cors_allowed_origins" {
  description = "Origins allowed to call the API — the local dev frontend and the live app subdomain (see plan.md's Domain & subdomains section)."
  type        = list(string)
  default     = ["http://localhost:3000", "https://app.shubhshreeknowledgehub.com"]
}

variable "webauthn_rp_id" {
  description = "WebAuthn Relying Party ID — the frontend's effective domain (where navigator.credentials runs from), NOT this API's own domain."
  type        = string
  default     = "app.shubhshreeknowledgehub.com"
}

variable "webauthn_rp_origins" {
  description = "Origins permitted to complete a WebAuthn ceremony against this RP ID."
  type        = list(string)
  default     = ["https://app.shubhshreeknowledgehub.com"]
}
