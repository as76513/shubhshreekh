##############################################################################
# API Gateway HTTP API (not REST — plan.md cost guardrail: 71% cheaper).
# One catch-all route proxies everything to the Lambda; the Go ServeMux
# does the actual routing, so new routes need zero Terraform changes.
#
# Custom domain (api.shubhshreeknowldgehub.com + ACM cert) is a fast follow,
# not required for this skeleton — the default execute-api URL is enough,
# same as how the frontend shipped on Amplify's default domain first.
##############################################################################

resource "aws_apigatewayv2_api" "http_api" {
  name          = "shubhshreekh-api-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
    max_age       = 300
    # allow_credentials intentionally omitted — the frontend sends
    # Authorization: Bearer, not cookies (see src/lib/api.ts).
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default" # no stage prefix in the invoke URL
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
