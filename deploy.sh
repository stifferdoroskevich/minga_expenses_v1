#!/bin/bash

set -e

AWS_REGION="us-east-1"
PROJECT_NAME="expenses-app"

echo "=== Getting Terraform outputs ==="
cd terraform
ECR_URL=$(terraform output -raw ecr_repository_url)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
ALB_DNS=$(terraform output -raw alb_dns_name)
cd ..

echo "=== Building and pushing Django image ==="
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL

docker build -t $PROJECT_NAME-django .
docker tag $PROJECT_NAME-django:latest $ECR_URL:latest
docker push $ECR_URL:latest

echo "=== Updating ECS service ==="
aws ecs update-service \
  --cluster $PROJECT_NAME-cluster \
  --service $PROJECT_NAME-django-service \
  --force-new-deployment \
  --region $AWS_REGION

echo "=== Building React app ==="
cd frontend
export REACT_APP_API_URL="http://$ALB_DNS"
npm install
npm run build

echo "=== Deploying React to S3 ==="
aws s3 sync build/ s3://$S3_BUCKET/ --delete

echo "=== Invalidating CloudFront cache ==="
CLOUDFRONT_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='$S3_BUCKET.s3.amazonaws.com']].Id" --output text)
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

echo "=== Deployment complete ==="
echo "Frontend URL: https://$(cd ../terraform && terraform output -raw cloudfront_domain)"
echo "API URL: http://$ALB_DNS"