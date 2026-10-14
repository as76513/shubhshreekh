##############################################################################
# GitHub Actions deploy role. The workflow in .github/workflows/deploy.yml
# assumes this with OIDC. No long-lived AWS keys live in GitHub.
# Trust is limited to pushes of this repo's main branch.
##############################################################################

variable "github_oidc_subject_prefix" {
  description = "GitHub Actions OIDC subject up to the ref. GitHub's default includes the immutable owner and repository IDs (use_immutable_subject), so the name-only form repo:owner/name is rejected."
  type        = string
  default     = "repo:as76513@28624322/shubhshreekh@1323913379"
}

variable "amplify_app_id" {
  description = "Amplify app the deploy workflow releases. Lives in the frontend stack, so it is passed in rather than looked up here."
  type        = string
  default     = "d2epzyuzlmxrlg"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_deploy" {
  name = "shubhshreekh-github-deploy-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "${var.github_oidc_subject_prefix}:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "deploy"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
          "lambda:UpdateFunctionCode",
        ]
        Resource = aws_lambda_function.api.arn
      },
      {
        Effect = "Allow"
        Action = [
          "amplify:GetBranch",
          "amplify:GetJob",
          "amplify:ListJobs",
          "amplify:StartJob",
        ]
        Resource = [
          "arn:aws:amplify:${var.aws_region}:${data.aws_caller_identity.current.account_id}:apps/${var.amplify_app_id}",
          "arn:aws:amplify:${var.aws_region}:${data.aws_caller_identity.current.account_id}:apps/${var.amplify_app_id}/*",
        ]
      },
    ]
  })
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
