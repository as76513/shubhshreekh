##############################################################################
# Lambda function — Go binary on provided.al2023 (the go1.x runtime is fully
# removed; this is the current supported way to run Go on Lambda).
#
# The zip is built from a binary that must already exist on disk (backend/
# Makefile's build-lambda target) — NOT from a local-exec provisioner, which
# would race archive_file's plan-time read and produce a stale/missing zip
# on the first apply.
##############################################################################

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../../backend/bootstrap"
  output_path = "${path.module}/build/lambda.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = local.function_name
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "bootstrap" # required field; ignored by the custom runtime itself
  runtime          = "provided.al2023"
  architectures    = ["arm64"] # cheaper than x86_64; Go cross-compiles cleanly (no cgo)
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      # AWS_REGION is Lambda-reserved — do not set it here, Lambda injects it.
      DYNAMODB_USERS_TABLE         = aws_dynamodb_table.users.name
      DYNAMODB_SUBSCRIPTIONS_TABLE = aws_dynamodb_table.subscriptions.name
      DYNAMODB_ORDERS_TABLE        = aws_dynamodb_table.orders.name
      SESSION_TOKEN_SIGNING_SECRET = var.session_token_signing_secret
      CORS_ALLOWED_ORIGINS         = join(",", var.cors_allowed_origins)
      MSG91_AUTH_KEY               = var.msg91_auth_key
      MSG91_TEMPLATE_ID            = var.msg91_template_id
      OTP_TEST_PHONES              = var.otp_test_phones
      OTP_TEST_CODE                = var.otp_test_code
    }
  }
}
