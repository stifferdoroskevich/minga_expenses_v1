# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"


  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "django_app" {
  family                   = "${var.project_name}-django"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "django"
      image = "${aws_ecr_repository.django_app.repository_url}:latest"

      essential = true

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      secrets = [
        {
          name      = "DB_NAME"
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:db_name::"
        },
        {
          name      = "DB_USER"
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:db_user::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:db_password::"
        },
        {
          name      = "DB_HOST"
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:db_host::"
        },
        {
          name      = "DB_PORT"
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:db_port::"
        },
        {
          name      = "DJANGO_SECRET_KEY"
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:django_secret_key::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/${var.project_name}-django"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-django-task"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "django_app" {
  name              = "/ecs/${var.project_name}-django"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-django-logs"
  }
}

# ECS Service
resource "aws_ecs_service" "django_app" {
  name            = "${var.project_name}-django-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.django_app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  force_new_deployment   = true
  enable_execute_command = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.public[*].id
    assign_public_ip = true
  }

  # No load balancer - CloudFront connects directly to ECS task

  tags = {
    Name = "${var.project_name}-django-service"
  }
}