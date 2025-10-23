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
- VPC with public/private subnets (both using Internet Gateway directly)
- Application Load Balancer (ALB)
- ECS Cluster with Fargate (tasks run in public subnets with public IPs)
- ECR Repository
- Security Groups (ECS tasks only accept traffic from ALB)
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
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin $(cd terraform && terraform output -raw ecr_repository_url)
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

Expected monthly cost: **~$20/month** (down from ~$55/month)
- ALB: $16.70
- ECS Fargate: $2.50
- ECR: $0.50
- CloudWatch Logs: $0.50

**Cost Optimization Applied:** NAT Gateway has been removed (~$35/month savings). ECS tasks now run in public subnets with public IP addresses, accessing the internet directly via the Internet Gateway. Security is maintained through security groups that only allow traffic from the ALB.

## Troubleshooting

1. **Container fails to start**: Check CloudWatch logs at `/ecs/expenses-app-django`
2. **Database connection issues**: Verify environment variables in ECS task definition
3. **Health check failures**: Ensure `/api/health/` endpoint is accessible

## Frontend Deployment (React App)

**See [FRONTEND_DEPLOYMENT_REQUIREMENTS.md](FRONTEND_DEPLOYMENT_REQUIREMENTS.md) for detailed requirements (spoiler: you don't need a domain or SSL certificate!)**

### Step 0: Ensure CORS is Configured

Your backend needs to allow requests from your CloudFront domain. Update your Django settings:

```python
# In core/settings_prod.py or core/settings.py
CORS_ALLOW_ALL_ORIGINS = True  # Simple option for personal projects

# Or be more specific (update after getting your CloudFront URL):
# CORS_ALLOWED_ORIGINS = [
#     "https://d1234abcd5678.cloudfront.net",  # Your CloudFront URL
# ]
```

### Step 1: Configure Frontend API Endpoint

Before building the frontend, you need to configure the API endpoint to point to your deployed backend.

Create a `.env.production` file in the `frontend` directory:

```bash
cd frontend
cat > .env.production << EOF
VITE_API_URL=https://$(cd ../terraform && terraform output -raw alb_dns_name)/api/
EOF
cd ..
```

Or manually create `frontend/.env.production`:
```
VITE_API_URL=https://your-alb-dns-name-here/api/
```

**Note**:
- Make sure the URL ends with `/api/` to match your Django API endpoints
- Use `https://` (not `http://`) to avoid mixed content errors with CloudFront

### Step 2: Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

This creates an optimized production build in the `frontend/dist` directory.

### Step 3: Deploy Frontend Infrastructure

If you haven't already deployed the frontend infrastructure:

```bash
cd terraform
terraform apply
```

This will create:
- S3 bucket for static website hosting
- CloudFront distribution for global CDN
- Proper bucket policies and configurations

### Step 4: Upload Frontend to S3

```bash
# Sync the built files to S3
aws s3 sync frontend/dist/ s3://$(cd terraform && terraform output -raw frontend_s3_bucket)/ --delete

# Create CloudFront invalidation to clear cache
aws cloudfront create-invalidation \
  --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

### Step 5: Access Frontend

Get the frontend URL:
```bash
cd terraform
echo "Frontend URL: $(terraform output -raw frontend_cloudfront_url)"
```

### Frontend Deployment Commands Summary

```bash
# Configure API endpoint
cd frontend
cat > .env.production << EOF
VITE_API_URL=https://$(cd ../terraform && terraform output -raw alb_dns_name)/api/
EOF

# Build frontend
npm install
npm run build
cd ..

# Deploy infrastructure (if not already done)
cd terraform
terraform apply
cd ..

# Upload to S3
aws s3 sync frontend/dist/ s3://$(cd terraform && terraform output -raw frontend_s3_bucket)/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# Get frontend URL
cd terraform
terraform output frontend_cloudfront_url
```

### Frontend Update Process

When you make changes to the frontend:

```bash
# 1. Rebuild
cd frontend
npm run build
cd ..

# 2. Upload to S3
aws s3 sync frontend/dist/ s3://$(cd terraform && terraform output -raw frontend_s3_bucket)/ --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

**Note**: CloudFront invalidations may take a few minutes to complete. The first 1,000 invalidation paths per month are free, then $0.005 per path.

### Frontend Cost Estimate

Expected monthly cost for frontend: **~$1-3/month** (for low traffic)
- S3 Storage: $0.10 (for ~1GB)
- S3 Requests: $0.50
- CloudFront: $1.00 (first 10TB of data transfer is $0.085/GB)
- CloudFront Requests: $0.50

## Cleanup

```bash
# Delete frontend files from S3 first
aws s3 rm s3://$(cd terraform && terraform output -raw frontend_s3_bucket)/ --recursive

# Then destroy infrastructure
cd terraform
terraform destroy
```