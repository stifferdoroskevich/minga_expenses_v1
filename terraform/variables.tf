variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "secret_aws_name" {
  description = "Name of the AWS Secrets Manager secret containing sensitive parameters"
  type        = string
}

variable "key_name" {
  description = "EC2 Key Pair name"
  type        = string
}