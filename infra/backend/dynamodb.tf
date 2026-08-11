##############################################################################
# DynamoDB tables — on-demand billing (plan.md: ~₹0 at this volume).
# Only what build-plan.md's current week needs: users, subscriptions,
# orders. No watchlists table and no GSIs yet — both are additive,
# zero-downtime changes when the phases that actually need them start.
##############################################################################

resource "aws_dynamodb_table" "users" {
  name         = "shubhshreekh-users-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "subscriptions" {
  name         = "shubhshreekh-subscriptions-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "orders" {
  name         = "shubhshreekh-orders-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }
}
