output "s3_bucket" {
  description = "Name of the S3 bucket holding the static site (cloudfront mode only)."
  value       = var.hosting_mode == "cloudfront" ? aws_s3_bucket.site[0].id : null
}

output "cloudfront_domain" {
  description = "CloudFront domain — your live URL (cloudfront mode only)."
  value       = var.hosting_mode == "cloudfront" ? aws_cloudfront_distribution.site[0].domain_name : null
}

output "amplify_app_id" {
  description = "Amplify app ID — needed for manual deploys (amplify mode only)."
  value       = var.hosting_mode == "amplify" ? aws_amplify_app.site[0].id : null
}

output "live_url" {
  description = "Full HTTPS URL of the site, whichever hosting_mode is active."
  value = var.hosting_mode == "cloudfront" ? (
    "https://${aws_cloudfront_distribution.site[0].domain_name}"
    ) : (
    "https://${aws_amplify_branch.main[0].branch_name}.${aws_amplify_app.site[0].default_domain}"
  )
}

output "deploy_command" {
  description = "How to deploy the built site after `next build`, for whichever hosting_mode is active."
  value = var.hosting_mode == "cloudfront" ? (
    "aws s3 sync ./out s3://${aws_s3_bucket.site[0].id} --delete && aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.site[0].id} --paths '/*'"
    ) : (
    "cd out && zip -r ../out.zip . && cd .. && aws amplify create-deployment --app-id ${aws_amplify_app.site[0].id} --branch-name main"
  )
}
