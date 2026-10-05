##############################################################################
# Lambda execution role — least privilege: only the table ARNs above, and
# only this function's own CloudWatch Logs log group.
##############################################################################

resource "aws_iam_role" "lambda_exec" {
  name = "shubhshreekh-api-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"]
        Resource = local.table_arns
      },
      {
        # Scan backs ListAll (the admin "my content" list, including
        # drafts) — scoped to content only, never the users/orders tables,
        # which carry phone numbers and payment references.
        Effect   = "Allow"
        Action   = ["dynamodb:Scan"]
        Resource = [aws_dynamodb_table.content.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.function_name}:*"
    }]
  })
}
