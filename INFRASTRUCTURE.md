# AWS Infrastructure Architecture

## Overview

This document describes the AWS infrastructure architecture for the Expenses App application, including the cost optimization strategy implemented in October 2025.

**Region:** eu-central-1 (Frankfurt)
**Project Name:** expenses-app

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────┬──────────────────────────────────────┬──────────────┘
             │                                      │
             │ HTTPS                                │ HTTPS
             ▼                                      ▼
    ┌────────────────┐                    ┌──────────────────┐
    │   CloudFront   │◄───────────────────┤   Lambda         │
    │  Distribution  │    Auto-updates    │   (EventBridge)  │
    │   (Frontend +  │    origin DNS      └──────────────────┘
    │    Backend)    │                             ▲
    └────────┬───────┘                             │
             │                                     │ ECS Task
             │                                     │ State Change
             ├──────────────┬──────────────────────┤
             │              │                      │
             ▼              ▼                      │
    ┌────────────┐  ┌──────────────────┐         │
    │ S3 Bucket  │  │  ECS Fargate     │◄────────┘
    │ (Static)   │  │  Task (Django)   │
    └────────────┘  │  Port 8000       │
                    │  Public DNS      │
                    └──────────────────┘
                             │
                             │ Outbound HTTPS
                             ▼
                     ┌──────────────────┐
                     │   External DB    │
                     │   (Supabase)     │
                     │   PostgreSQL     │
                     └──────────────────┘
```

## Components

### 1. Frontend (React SPA)

**Services:**
- **S3 Bucket**: Static website hosting
  - Stores built React application
  - Configured for website hosting
  - Private bucket (accessed only via CloudFront)

- **CloudFront Distribution**: Global CDN
  - HTTPS enabled by default
  - Caches static assets (S3 origin)
  - Proxies API requests directly to ECS task (custom origin)
  - Custom error pages for SPA routing

**Cost:** ~$1-2/month

### 2. Backend (Django API)

**Services:**
- **ECS Cluster**: Container orchestration
  - Name: `expenses-app-cluster`
  - Service: Fargate (serverless)
  - CPU: 256 units (0.25 vCPU)
  - Memory: 512 MB
  - Desired count: 1 task

- **ECS Service Configuration**:
  - Name: `expenses-app-django-service`
  - Launch type: FARGATE
  - Network: Public subnets
  - Public IP: Enabled (gets public DNS name)
  - Security group: Accepts traffic on port 8000
  - **No Load Balancer** - CloudFront connects directly

- **Lambda Function** (NEW):
  - Name: `expenses-app-update-cloudfront`
  - Trigger: EventBridge rule on ECS task state change
  - Function: Updates CloudFront origin when ECS task IP changes
  - Runtime: Python 3.11
  - Timeout: 60 seconds

- **EventBridge Rule** (NEW):
  - Monitors ECS task state changes
  - Triggers Lambda when task reaches RUNNING state
  - Enables automatic CloudFront origin updates

- **ECR Repository**: Docker image storage
  - Stores Django application images
  - Lifecycle policy: Keep last 5 images

- **CloudWatch Logs**:
  - ECS logs: `/ecs/expenses-app-django`
  - Lambda logs: `/aws/lambda/expenses-app-update-cloudfront`
  - Retention: 7 days

**Cost:** ~$3-4/month

### 3. Networking

**VPC Configuration:**
- CIDR: 10.0.0.0/16
- Availability Zones: 2
- Region: eu-central-1

**Public Subnets** (10.0.1.0/24, 10.0.2.0/24):
- Hosts: ECS Tasks
- Route table: Internet Gateway
- Auto-assign public IPs: Yes

**Private Subnets** (10.0.10.0/24, 10.0.11.0/24):
- Currently unused (reserved)
- Route table: Internet Gateway (direct)
- Auto-assign public IPs: No

**Internet Gateway:**
- Attached to VPC
- Provides internet access to all subnets

**Cost:** ~$0 (no NAT Gateway)

### 4. Security

**Security Groups:**

1. **ECS Tasks Security Group**:
   - Inbound:
     - Port 8000 from 0.0.0.0/0 (CloudFront and internet)
   - Outbound: All traffic (for database, ECR, Secrets Manager)
   - Note: Could be further restricted to CloudFront IP ranges only

**IAM Roles:**

1. **ECS Execution Role**:
   - Pulls images from ECR
   - Writes logs to CloudWatch
   - Reads secrets from Secrets Manager

2. **ECS Task Role**:
   - Application-level permissions
   - ECS Exec enabled (for debugging)

3. **Lambda Execution Role** (NEW):
   - Permissions to:
     - Describe ECS tasks
     - Describe EC2 network interfaces
     - Update CloudFront distribution
     - Create CloudFront invalidations
     - Write to CloudWatch Logs

**Secrets Management:**
- AWS Secrets Manager stores:
  - Database credentials
  - Django secret key
- Injected as environment variables at runtime

**CloudFront Custom Header** (NEW):
- Random 32-character token sent from CloudFront to ECS
- Header: `X-Custom-Origin-Auth`
- Provides additional security layer

### 5. Database

**External Service:**
- Provider: Supabase
- Type: PostgreSQL
- Connection: HTTPS (outbound from ECS tasks)
- Not managed by Terraform

## Cost Breakdown

### Monthly Costs (Estimated)

| Service | Cost | Notes |
|---------|------|-------|
| **Backend** | | |
| ECS Fargate (1 task) | $2.50 | 0.25 vCPU, 512 MB RAM |
| Lambda (auto-update) | $0.20 | ~10-20 executions/month |
| ECR Storage | $0.50 | <1GB storage |
| CloudWatch Logs | $0.50 | 7-day retention |
| Secrets Manager | $0.40 | 1 secret |
| **Frontend** | | |
| S3 Storage | $0.10 | ~1GB static files |
| S3 Requests | $0.20 | Low traffic |
| CloudFront Data Transfer | $1.00 | First 10TB @ $0.085/GB |
| CloudFront Requests | $0.50 | HTTP/HTTPS requests |
| **Database** | | |
| Supabase | $0.00 | Free tier |
| **Total** | **~$5-6/month** | Low traffic estimate |

### Cost Optimization History

**October 2025: NAT Gateway Removal**
- **Before:** ~$55/month
- **After:** ~$22/month
- **Savings:** ~$33/month (~60% reduction)

**What changed:**
1. Removed NAT Gateway (~$32/month)
2. Removed Elastic IP for NAT (~$3/month)
3. Moved ECS tasks to public subnets
4. Enabled public IP assignment on ECS tasks

**October 2025: ALB Removal**
- **Before:** ~$22/month
- **After:** ~$5-6/month
- **Savings:** ~$17/month (~77% reduction from previous)

**What changed:**
1. Removed Application Load Balancer (~$16.70/month)
2. CloudFront connects directly to ECS task
3. Added Lambda function to auto-update CloudFront origin (~$0.20/month)
4. Added EventBridge rule to trigger Lambda

**Total Savings Since Start: ~$50/month (~91% reduction!)**

## Deployment

### Infrastructure Deployment

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Backend Deployment

```bash
# Build and push Docker image
./deploy.sh
```

This script:
1. Logs into ECR (eu-central-1)
2. Builds Django Docker image
3. Pushes to ECR repository
4. Forces ECS service redeployment
5. Lambda automatically updates CloudFront when task starts

### Frontend Deployment

```bash
# Build and deploy frontend
./deploy-frontend.sh
```

This script:
1. Builds React application
2. Syncs to S3 bucket
3. Creates CloudFront invalidation

### Manual ECS Task Restart (if needed)

```bash
aws ecs update-service \
  --cluster expenses-app-cluster \
  --service expenses-app-django-service \
  --force-new-deployment \
  --region eu-central-1
```

### Check Lambda Logs

```bash
aws logs tail /aws/lambda/expenses-app-update-cloudfront --follow --region eu-central-1
```

## Network Flow

### User Request Flow (Frontend)

1. User visits CloudFront URL: `https://d1k7i3mj2om7ti.cloudfront.net`
2. CloudFront serves cached content or fetches from S3
3. Browser loads React application
4. React app makes API calls to same CloudFront domain
5. CloudFront proxies `/api/*` requests to ECS task
6. Django processes request
7. Response returns through same path

### User Request Flow (API)

1. User/Frontend makes request to `/api/*`
2. CloudFront receives request
3. CloudFront forwards to ECS task public DNS (e.g., `ec2-3-123-45-67.eu-central-1.compute.amazonaws.com:8000`)
4. Django processes request and responds
5. Response goes back through CloudFront to user

### ECS Task Outbound Flow

1. ECS task needs external access (ECR, database, Secrets Manager)
2. Traffic goes through Internet Gateway (direct)
3. No NAT Gateway hop (cost optimization)
4. Response returns to ECS task

### Lambda Auto-Update Flow (NEW)

1. ECS task starts (new deployment or restart)
2. EventBridge detects task state change to RUNNING
3. Lambda function is triggered
4. Lambda queries ECS for task's public DNS name
5. Lambda updates CloudFront origin to point to new DNS
6. Lambda creates CloudFront invalidation for `/api/*` and `/admin/*`
7. CloudFront routes traffic to new task (30-60 second transition)

## Monitoring

### CloudWatch

**Metrics tracked:**
- ECS CPU/Memory utilization
- Lambda invocations, errors, duration
- CloudFront request count
- ECS task health

**Logs:**
- Django application logs: `/ecs/expenses-app-django`
- Lambda function logs: `/aws/lambda/expenses-app-update-cloudfront`
- Retention: 7 days

**Alarms:**
- None configured (optional: set up for production)

### Health Checks

**ECS Task Health:**
- Endpoint: `http://<task-dns>:8000/api/health/`
- CloudFront can be configured to check this

**Lambda Function Health:**
- Monitor CloudWatch Logs for execution success/failure
- Check CloudFront origin matches current task DNS

## Scaling

### Current Configuration

**Vertical Scaling (Task size):**
- CPU: 256 units (0.25 vCPU)
- Memory: 512 MB
- Sufficient for low-traffic personal use

**Horizontal Scaling (Task count):**
- Desired count: 1
- Min/Max: Not configured (manual scaling only)
- Note: With >1 task, you'd need a load balancer or Service Discovery

### Future Scaling Options

If traffic increases significantly:

**Option 1: Add Network Load Balancer**
- Cheaper than ALB (~$8/month)
- Provides static IP
- Allows multiple ECS tasks

**Option 2: Keep single task + vertical scaling**
- Increase to 512 CPU / 1024 MB (~$5/month)
- Still no load balancer needed

**Option 3: AWS App Runner**
- Alternative to ECS
- Auto-scaling built-in
- Similar pricing

## Disaster Recovery

### Backup Strategy

**Application Code:**
- Stored in Git repository
- ECR keeps last 5 images

**Database:**
- Managed by Supabase
- Daily backups (Supabase feature)

**Infrastructure:**
- Defined in Terraform
- Can recreate from code

### Recovery Procedure

1. Ensure Terraform state is available
2. Run `terraform apply` to recreate infrastructure
3. Push latest Docker image to ECR (or use existing image)
4. ECS automatically pulls and runs
5. Lambda automatically updates CloudFront origin

**Recovery Time:** ~10-15 minutes

## Security Best Practices

### Implemented

✅ HTTPS everywhere (CloudFront)
✅ Security groups restrict traffic
✅ Secrets in Secrets Manager (not environment variables)
✅ IAM roles with least privilege
✅ Private ECR repository
✅ CloudWatch logging enabled
✅ Custom header authentication (CloudFront → ECS)
✅ Lambda function with minimal permissions

### Recommended for Production

⚠️ Enable AWS WAF on CloudFront
⚠️ Set up CloudWatch alarms
⚠️ Restrict ECS security group to CloudFront IP ranges only
⚠️ Implement rate limiting in Django
⚠️ Add custom domain with Route53
⚠️ Enable AWS Shield Standard (free)
⚠️ Validate custom header in Django middleware

## Troubleshooting

### Common Issues

**ECS task won't start:**
1. Check CloudWatch logs: `/ecs/expenses-app-django`
2. Verify secrets are correctly configured
3. Ensure ECR image is available
4. Check security group allows outbound traffic

**API returns 502/503:**
1. Check Lambda logs - did it update CloudFront?
2. Verify CloudFront origin matches current task DNS
3. Check ECS task is running
4. Manually trigger Lambda if needed
5. Wait 30-60 seconds after task restart

**Lambda not triggering:**
1. Check EventBridge rule is enabled
2. Verify Lambda permissions
3. Check ECS task actually reached RUNNING state
4. Manually invoke Lambda for testing

**Frontend not loading:**
1. Check S3 bucket has files
2. Verify CloudFront distribution is deployed
3. Create CloudFront invalidation if needed
4. Check browser console for errors

**CloudFront still points to old task:**
1. Check Lambda execution logs
2. Manually update CloudFront origin if needed
3. Verify EventBridge rule is firing

### Manual Lambda Invocation (for testing)

```bash
aws lambda invoke \
  --function-name expenses-app-update-cloudfront \
  --region eu-central-1 \
  response.json

cat response.json
```

## Application URLs

- **Frontend:** https://d1k7i3mj2om7ti.cloudfront.net
- **API:** https://d1k7i3mj2om7ti.cloudfront.net/api/
- **Admin:** https://d1k7i3mj2om7ti.cloudfront.net/admin/
- **Health Check:** https://d1k7i3mj2om7ti.cloudfront.net/api/health/

## Future Improvements

### Performance
- [ ] Implement Redis caching layer
- [ ] Add CloudFront caching headers for API responses
- [ ] Optimize Lambda cold start time

### Cost Optimization
- [ ] Consider AWS Lightsail for simpler workloads
- [ ] Evaluate Fargate Spot for additional savings
- [ ] Review CloudWatch log retention (currently 7 days)
- [ ] Restrict ECS security group to CloudFront IPs only

### Features
- [ ] Add custom domain (Route53)
- [ ] Implement CI/CD pipeline (GitHub Actions)
- [ ] Set up staging environment
- [ ] Add AWS WAF for security

### Monitoring
- [ ] Configure CloudWatch alarms for Lambda failures
- [ ] Set up SNS notifications
- [ ] Implement application performance monitoring
- [ ] Add cost anomaly detection

## References

- [Terraform Configuration](terraform/)
- [ALB Removal Guide](ALB_REMOVAL_README.md)
- [Deployment Guide](DEPLOY_WITHOUT_ALB.md)
- [Django Backend](expenses/)
- [React Frontend](frontend/)

## Architecture Decisions

### Why Remove ALB?

**Decision:** Connect CloudFront directly to ECS task, remove ALB

**Rationale:**
1. **Cost:** Saves $16.70/month (ALB charges)
2. **Simplicity:** Fewer components to manage
3. **Sufficient:** Only 1 task, no need for load balancing
4. **Automation:** Lambda handles IP changes automatically

**Trade-offs:**
- ~30-60 seconds downtime during task restarts (acceptable for personal project)
- Need Lambda automation to update CloudFront
- No sophisticated health checks (ECS handles this)
- Limited to 1 task (but that's all we need)

### Why Lambda Auto-Update?

**Decision:** Use Lambda + EventBridge to auto-update CloudFront origin

**Rationale:**
1. **Automation:** No manual intervention when task restarts
2. **Cost:** Lambda executions are cheap (~$0.20/month)
3. **Reliability:** EventBridge reliably detects ECS state changes
4. **Simplicity:** Python code is easy to understand and modify

**Trade-offs:**
- Added complexity (one more component)
- Cold start delay (~1-2 seconds)
- Requires IAM permissions for Lambda

### Why Public Subnets for ECS?

**Decision:** Run ECS Fargate tasks in public subnets with public IPs

**Rationale:**
1. **Cost:** Eliminates $33/month NAT Gateway cost
2. **Performance:** Direct internet access (no NAT hop)
3. **Security:** Security groups still restrict inbound traffic
4. **Simplicity:** Fewer infrastructure components
5. **Common pattern:** Standard for Fargate deployments

**Trade-offs:**
- Tasks have public IPs (but not accessible due to security groups)
- Slightly less "traditional" than private subnet architecture
- No downside for this use case

### Why Fargate over EC2?

**Decision:** Use ECS Fargate instead of EC2 instances

**Rationale:**
1. **Serverless:** No server management
2. **Cost:** More cost-effective for single-container workloads
3. **Simplicity:** No patching, no instance types to choose
4. **Scaling:** Easy to add more tasks (though we only need 1)

### Why CloudFront + S3 for Frontend?

**Decision:** Use S3 + CloudFront instead of EC2/Nginx

**Rationale:**
1. **Cost:** Cheapest option (~$1-2/month)
2. **Performance:** Global CDN with edge locations
3. **Scalability:** Handles traffic spikes automatically
4. **Reliability:** 99.99% uptime SLA
5. **HTTPS:** Free TLS certificate

## Changelog

**October 28, 2025**
- Removed Application Load Balancer for cost optimization
- Added Lambda function to auto-update CloudFront origin
- Added EventBridge rule to trigger Lambda on ECS task changes
- CloudFront now connects directly to ECS task
- Cost reduced from ~$22/month to ~$5-6/month (~77% reduction)
- Updated all documentation with actual resource names and region

**October 23, 2025**
- Removed NAT Gateway for cost optimization
- Moved ECS tasks to public subnets
- Updated all documentation
- Cost reduced from ~$55/month to ~$22/month

**[Previous date]**
- Initial infrastructure deployment
- Backend and frontend deployed
- HTTPS enabled on ALB
