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

# RA content platform (Pipe B) — thin insights CMS, Oct 18 sprint. Single-
# table design per architecture.md: pk/sk for direct lookups, GSI1 for
# listing published content by type newest-first. Only published rows get
# gsi1pk/gsi1sk written (see backend/internal/db/content.go) — a draft is
# invisible to the GSI1 query by construction, not by a filter.
resource "aws_dynamodb_table" "content" {
  name         = "shubhshreekh-content-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }
}
