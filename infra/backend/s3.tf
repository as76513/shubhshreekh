##############################################################################
# Content media bucket (TD-057/058) — RA-uploaded Daily Overview photos and
# the weekly market outlook PDF. Public-read: nothing stored here is
# Pro-gated or sensitive (architecture.md reserves CloudFront *signed* URLs
# for actual Pro content; this is marketing/education material shown to
# every logged-in user regardless of tier). The Lambda signs presigned PUT
# URLs for uploads (backend/internal/api/media.go) — it needs s3:PutObject,
# never s3:GetObject, since customers read objects directly via their plain
# public URL, not through the API.
##############################################################################

resource "aws_s3_bucket" "content_media" {
  bucket = "shubhshreekh-content-media-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "content_media" {
  bucket = aws_s3_bucket.content_media.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "content_media_public_read" {
  bucket = aws_s3_bucket.content_media.id
  # Must apply after the access block lifts restrict_public_buckets, or AWS
  # rejects this policy as making the bucket public while still "blocked."
  depends_on = [aws_s3_bucket_public_access_block.content_media]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.content_media.arn}/*"
    }]
  })
}

resource "aws_s3_bucket_cors_configuration" "content_media" {
  bucket = aws_s3_bucket.content_media.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = var.cors_allowed_origins
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}
