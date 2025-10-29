#!/bin/bash

set -e

AWS_REGION="eu-central-1"
PROJECT_NAME="expenses-app"

echo "=== Backend Deployment Script ==="
echo "Region: $AWS_REGION"
echo "Project: $PROJECT_NAME"
echo ""

echo "=== Getting Terraform outputs ==="
cd terraform
ECR_URL=$(terraform output -raw ecr_repository_url)
cd ..

echo "ECR Repository: $ECR_URL"
echo ""

echo "=== Building and pushing Django image ==="
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL

docker build -t $PROJECT_NAME-django .
docker tag $PROJECT_NAME-django:latest $ECR_URL:latest
docker push $ECR_URL:latest

echo ""
echo "=== Updating ECS service ==="
aws ecs update-service \
  --cluster $PROJECT_NAME-cluster \
  --service $PROJECT_NAME-django-service \
  --force-new-deployment \
  --region $AWS_REGION

echo ""
echo "=== Backend deployment initiated ==="
echo ""
echo "Lambda will automatically update CloudFront when the new task starts."
echo "This takes about 1-2 minutes."
echo ""
echo "Monitor Lambda logs with:"
echo "  aws logs tail /aws/lambda/$PROJECT_NAME-update-cloudfront --follow --region $AWS_REGION"
echo ""
echo "Monitor ECS task startup:"
echo "  aws ecs describe-services --cluster $PROJECT_NAME-cluster --services $PROJECT_NAME-django-service --region $AWS_REGION"
echo ""
echo "Check health when ready:"
echo "  curl https://d1k7i3mj2om7ti.cloudfront.net/api/health/"