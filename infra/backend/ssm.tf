##############################################################################
# Production secrets. SecureString values are written once, then ignored, so
# a later apply does not need the secret on the command line and cannot
# blank it. Rotate with `aws ssm put-parameter --overwrite`.
# OTP_TEST_CODE stays a Lambda env var so the whitelist bypass keeps working.
##############################################################################

resource "aws_ssm_parameter" "session_token_signing_secret" {
  name        = "/shubhshreekh/${var.environment}/session_token_signing_secret"
  description = "HMAC secret for session tokens."
  type        = "SecureString"
  value       = var.session_token_signing_secret

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "msg91_auth_key" {
  name        = "/shubhshreekh/${var.environment}/msg91_auth_key"
  description = "MSG91 SendOTP auth key."
  type        = "SecureString"
  value       = var.msg91_auth_key

  lifecycle {
    ignore_changes = [value]
  }
}
