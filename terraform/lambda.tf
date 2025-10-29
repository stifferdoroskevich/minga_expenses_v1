# Lambda function to update CloudFront when ECS task IP changes

# Archive the Lambda function code
data "archive_file" "lambda_update_cloudfront" {
  type        = "zip"
  source_file = "${path.module}/lambda/update_cloudfront.py"
  output_path = "${path.module}/lambda/update_cloudfront.zip"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_update_cloudfront" {
  name = "${var.project_name}-lambda-update-cloudfront"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-lambda-update-cloudfront-role"
  }
}

# IAM policy for Lambda to access ECS, CloudFront, and EC2
resource "aws_iam_role_policy" "lambda_update_cloudfront" {
  name = "${var.project_name}-lambda-cloudfront-policy"
  role = aws_iam_role.lambda_update_cloudfront.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeTasks",
          "ecs:ListTasks"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig",
          "cloudfront:UpdateDistribution",
          "cloudfront:CreateInvalidation"
        ]
        Resource = "arn:aws:cloudfront::*:distribution/${aws_cloudfront_distribution.frontend.id}"
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "update_cloudfront" {
  filename         = data.archive_file.lambda_update_cloudfront.output_path
  function_name    = "${var.project_name}-update-cloudfront"
  role            = aws_iam_role.lambda_update_cloudfront.arn
  handler         = "update_cloudfront.lambda_handler"
  source_code_hash = data.archive_file.lambda_update_cloudfront.output_base64sha256
  runtime         = "python3.11"
  timeout         = 60

  environment {
    variables = {
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.frontend.id
      ECS_CLUSTER_NAME          = aws_ecs_cluster.main.name
      ECS_SERVICE_NAME          = aws_ecs_service.django_app.name
    }
  }

  tags = {
    Name = "${var.project_name}-update-cloudfront"
  }
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_update_cloudfront" {
  name              = "/aws/lambda/${aws_lambda_function.update_cloudfront.function_name}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-lambda-cloudfront-logs"
  }
}

# EventBridge Rule to trigger Lambda on ECS task state changes
resource "aws_cloudwatch_event_rule" "ecs_task_state_change" {
  name        = "${var.project_name}-ecs-task-running"
  description = "Trigger when ECS task reaches RUNNING state"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Task State Change"]
    detail = {
      clusterArn    = [aws_ecs_cluster.main.arn]
      lastStatus    = ["RUNNING"]
      desiredStatus = ["RUNNING"]
    }
  })

  tags = {
    Name = "${var.project_name}-ecs-task-state-rule"
  }
}

# EventBridge Target - Lambda function
resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.ecs_task_state_change.name
  target_id = "UpdateCloudFront"
  arn       = aws_lambda_function.update_cloudfront.arn
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_cloudfront.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ecs_task_state_change.arn
}
