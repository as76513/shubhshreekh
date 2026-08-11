output "api_invoke_url" {
  description = "Default execute-api invoke URL (no custom domain yet)."
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}
