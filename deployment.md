# AWS Deployment Guide

## Prerequisites

1. AWS CLI installed and configured
2. Terraform installed (v1.0+)
3. Docker installed
4. External PostgreSQL database (Supabase) already configured

## Step 1: Prepare Django

1. Ensure `core/settings_prod.py` is configured for production
2. Add health check endpoint in `core/urls.py`:

```python
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "healthy"})

urlpatterns = [
    path('api/health/', health_check),
    # ... your other urls
]
```



## Step 2: Configure Terraform and secrets

### 2.1 Create a secret on AWS Secrets Manager

Create a secret in AWS Secrets Manager with the following JSON structure. The secret name will be referenced in your `terraform.tfvars` file.

**AWS Console Method:**
1. Go to AWS Secrets Manager in the AWS Console
2. Click "Store a new secret"
3. Select "Other type of secret"
4. Choose "Plaintext" and paste the following JSON (replace with your actual values):

```json
{
  "db_name": "your_database_name",
  "db_user": "your_database_user",
  "db_password": "your_database_password",
  "db_host": "your-supabase-host.supabase.co",
  "db_port": "",
  "django_secret_key": "your-django-secret-key-here"
}
```

5. Name your secret (e.g., `prod/expenses-app`)
6. Complete the wizard with default settings

**AWS CLI Method:**
```bash
aws secretsmanager create-secret \
  --name prod/expenses-app \
  --description "Secrets for expenses app production environment" \
  --secret-string '{
    "db_name": "your_database_name",
    "db_user": "your_database_user",
    "db_password": "your_database_password",
    "db_host": "your-supabase-host.supabase.co",
    "db_port": "5432",
    "django_secret_key": "your-django-secret-key-here"
  }' \
  --region us-east-1
```

### 2.2 Update `terraform/terraform.tfvars` with your values:

```hcl
aws_region      = "us-east-1"
project_name    = "expenses-app"
secret_aws_name = "prod/expenses-app"  # Must match the secret name created in Step 2.1
key_name        = "your-key-pair-name"
```

**Note:** All sensitive parameters (database credentials, Django secret key) are now stored in AWS Secrets Manager and will be automatically injected into your ECS containers at runtime.

## Step 3: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates:
- VPC with public/private subnets
- Application Load Balancer (ALB)
- ECS Cluster with Fargate
- ECR Repository
- Security Groups
- IAM Roles
- CloudWatch Log Groups

## Step 4: Build and Push Docker Image

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(cd terraform && terraform output -raw ecr_repository_url)

# Build Docker image
docker build -t expenses-app-django .

# Tag and push to ECR
docker tag expenses-app-django:latest $(cd terraform && terraform output -raw ecr_repository_url):latest
docker push $(cd terraform && terraform output -raw ecr_repository_url):latest
```

## Step 5: Update ECS Service

After pushing the image, update the ECS service to use the new image:
```bash
aws ecs update-service \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --service $(cd terraform && terraform output -raw ecs_service_name) \
  --force-new-deployment \
  --region us-east-1
```

## Step 6: Run Database Migrations

Install the ECS exec plugin if not already installed:
https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-linux.html

Get the running task ARN:
```bash
aws ecs list-tasks \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --service-name $(cd terraform && terraform output -raw ecs_service_name) \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text
```

Connect to ECS task and run migrations:
```bash
aws ecs execute-command \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --task <TASK_ID> \
  --container django \
  --interactive \
  --command "/bin/bash" \
  --region us-east-1

# Inside container
python manage.py migrate
python manage.py createsuperuser
```

## Step 7: Access Application

Get the application URL:
```bash
cd terraform
echo "API: http://$(terraform output -raw alb_dns_name)"
```

## Deployment Commands Summary

```bash
# Full deployment process
cd terraform
terraform apply

# Build and push image
cd ..
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(cd terraform && terraform output -raw ecr_repository_url)
docker build -t expenses-app-django .
docker tag expenses-app-django:latest $(cd terraform && terraform output -raw ecr_repository_url):latest
docker push $(cd terraform && terraform output -raw ecr_repository_url):latest

# Update service
aws ecs update-service \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --service $(cd terraform && terraform output -raw ecs_service_name) \
  --force-new-deployment \
  --region us-east-1
```

## Cost Monitoring

Expected monthly cost: **~$20/month**
- ALB: $16.70
- ECS Fargate: $2.50
- ECR: $0.50
- VPC/NAT Gateway: $32.40
- CloudWatch Logs: $0.50

Note: NAT Gateway is the most expensive component. Consider removing it if your app doesn't need outbound internet access from private subnets.

## Troubleshooting

1. **Container fails to start**: Check CloudWatch logs at `/ecs/expenses-app-django`
2. **Database connection issues**: Verify environment variables in ECS task definition
3. **Health check failures**: Ensure `/api/health/` endpoint is accessible

## Cleanup

```bash
cd terraform
terraform destroy
```