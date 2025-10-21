# Fetch secrets from AWS Secrets Manager
data "aws_secretsmanager_secret" "app_secrets" {
  name = var.secret_aws_name
}

data "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = data.aws_secretsmanager_secret.app_secrets.id
}

# Decode the secrets JSON
locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.app_secrets.secret_string)
}
