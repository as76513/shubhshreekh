output "s3_bucket" {
  description = "Name of the S3 bucket holding the static site."
  value       = aws_s3_bucket.site.id
}

output "cloudfront_domain" {
  description = "CloudFront domain — your live URL."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "live_url" {
  description = "Full HTTPS URL of the site."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "deploy_command" {
  description = "How to upload the built site after 'next build && next export'."
  value       = "aws s3 sync ./out s3://${aws_s3_bucket.site.id} --delete && aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.site.id} --paths '/*'"
}
