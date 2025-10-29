# AWS Deployment Guide (No ALB)

## Overview

- Architecture: CloudFront → ECS Fargate (Django) with Lambda auto-updating CloudFront origin on ECS task changes.
- Goal: Keep costs ~$5–6/month by removing the ALB and using a small Lambda triggered by EventBridge.

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
from django.urls import path

def health_check(request):
    return JsonResponse({"status": "healthy"})

urlpatterns = [
    path('api/health/', health_check),
    # ... your other urls
]
```

## Step 2: Secrets in AWS Secrets Manager

Create a secret (console or CLI) referenced by Terraform.

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
  --region eu-central-1
```

Update `terraform/terraform.tfvars`:

```hcl
aws_region      = "eu-central-1"
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

Creates:
- VPC with public subnets (tasks get public IPs)
- ECS Cluster + Service (Fargate)
- ECR repository
- CloudFront distribution (frontend + backend origins)
- S3 bucket for frontend
- Lambda function + EventBridge rule to update CloudFront origin when ECS task changes
- IAM roles, security groups, CloudWatch log groups

## Step 4: Build and Push Backend Image

```bash
# ECR login
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin $(cd terraform && terraform output -raw ecr_repository_url)

# Build Docker image
docker build -t expenses-app-django .

# Tag and push to ECR
docker tag expenses-app-django:latest $(cd terraform && terraform output -raw ecr_repository_url):latest
docker push $(cd terraform && terraform output -raw ecr_repository_url):latest
```

## Step 5: Redeploy ECS and Run Migrations

Force a new deployment (triggers Lambda → CloudFront origin update):

```bash
aws ecs update-service \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --service $(cd terraform && terraform output -raw ecs_service_name) \
  --force-new-deployment \
  --region eu-central-1
```

Run DB migrations via ECS Exec:

```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --service-name $(cd terraform && terraform output -raw ecs_service_name) \
  --region eu-central-1 \
  --query 'taskArns[0]' --output text)

aws ecs execute-command \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --task "$TASK_ARN" \
  --container django \
  --interactive \
  --command "/bin/bash" \
  --region eu-central-1
```

Inside container:

```bash
python manage.py migrate
python manage.py createsuperuser
```

## Step 6: Monitor Lambda and CloudFront

```bash
# Lambda (auto-update) logs
aws logs tail /aws/lambda/expenses-app-update-cloudfront --follow --region eu-central-1

# CloudFront deployment status
DIST_ID=$(cd terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.Status' --output text

# Current backend origin domain
aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DistributionConfig.Origins.Items[1].DomainName' --output text
```

Expected Lambda log messages include the task ENI, public IP/DNS, and a successful origin update.

## Step 7: Verify Health

```bash
CLOUDFRONT_URL=$(cd terraform && terraform output -raw frontend_cloudfront_url)

# Frontend
curl -I "$CLOUDFRONT_URL"

# API health
curl "$CLOUDFRONT_URL/api/health/"
```

## Frontend Deployment

### Configure CORS

```python
# core/settings_prod.py
CORS_ALLOW_ALL_ORIGINS = True
# Or restrict later to your CloudFront URL
```

### Build and Upload

```bash
# Configure API endpoint for frontend
cd frontend
cat > .env.production << EOF
VITE_API_URL=$(cd ../terraform && terraform output -raw frontend_cloudfront_url)/api/
EOF

npm install
npm run build
cd ..

# Upload to S3
aws s3 sync frontend/dist/ s3://$(cd terraform && terraform output -raw frontend_s3_bucket)/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Troubleshooting

- API 502/503: Ensure CloudFront origin matches the current ECS task DNS/IP. Tail Lambda logs; force a new ECS deployment to retrigger the update.
- Lambda not triggering: Check EventBridge rule and Lambda policy. You can manually invoke the Lambda.
- Security group issues: Ensure ECS task SG allows inbound port 8000 from everywhere (CloudFront egress varies) or from CloudFront only if using custom headers.
- Task restarts: Tail `/ecs/expenses-app-django` and inspect task stopped reasons.

Handy commands:

```bash
# Manual Lambda invoke (basic)
aws lambda invoke \
  --function-name expenses-app-update-cloudfront \
  --region eu-central-1 \
  response.json

# Get current task public DNS
TASK_ARN=$(aws ecs list-tasks --cluster $(cd terraform && terraform output -raw ecs_cluster_name) --region eu-central-1 --query 'taskArns[0]' --output text)
ENI_ID=$(aws ecs describe-tasks --cluster $(cd terraform && terraform output -raw ecs_cluster_name) --tasks "$TASK_ARN" --region eu-central-1 --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
aws ec2 describe-network-interfaces --network-interface-ids "$ENI_ID" --region eu-central-1 --query 'NetworkInterfaces[0].Association.PublicDnsName' --output text
```

## Costs (Approx.)

- ECS Fargate: ~$2.5
- Lambda: ~$0.2
- CloudFront: ~$1.5
- S3: ~$0.3
- ECR: ~$0.5
- CloudWatch Logs: ~$0.5
- Total: ~$5–6/month

## Cleanup

```bash
aws s3 rm s3://$(cd terraform && terraform output -raw frontend_s3_bucket)/ --recursive

cd terraform
terraform destroy
```
---
Last Updated: October 29, 2025
Architecture: CloudFront → ECS (no ALB)
Cost: ~$5–6/month