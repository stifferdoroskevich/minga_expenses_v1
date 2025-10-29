# Security Group for ECS Tasks
# Allows traffic from CloudFront and internet (for direct access during testing)
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.project_name}-ecs-tasks-"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP traffic on port 8000 from anywhere
  # In production, you could restrict this to CloudFront IP ranges only
  # CloudFront IP ranges: https://d7uri8nf7uskq.cloudfront.net/tools/list-cloudfront-ips
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic from CloudFront and internet"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-tasks-sg"
  }
}