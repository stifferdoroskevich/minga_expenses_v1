# AWS Infrastructure Architecture

## Overview

This document describes the AWS infrastructure architecture for the Minga Expenses application, including the cost optimization strategy implemented in October 2025.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────┬──────────────────────────────────────┬──────────────┘
             │                                      │
             │ HTTPS                                │ HTTPS
             ▼                                      ▼
    ┌────────────────┐                    ┌──────────────────┐
    │   CloudFront   │                    │   CloudFront     │
    │  Distribution  │                    │  (API Requests)  │
    │   (Frontend)   │                    └────────┬─────────┘
    └────────┬───────┘                             │
             │                                     │
             ▼                                     ▼
    ┌────────────────┐                    ┌──────────────────┐
    │   S3 Bucket    │                    │   ALB (HTTPS)    │
    │  (Static Site) │                    │  Public Subnets  │
    └────────────────┘                    └────────┬─────────┘
                                                   │
                     ┌─────────────────────────────┴──────┐
                     │         AWS VPC (10.0.0.0/16)      │
                     │                                     │
                     │  ┌───────────────────────────────┐ │
                     │  │   Public Subnets              │ │
                     │  │   (10.0.1.0/24, 10.0.2.0/24)  │ │
                     │  │                               │ │
                     │  │   ┌─────────────────────┐    │ │
                     │  │   │  ECS Fargate Tasks  │    │ │
                     │  │   │  (Django Backend)   │    │ │
                     │  │   │  • Public IP: Yes   │    │ │
                     │  │   │  • Port: 8000       │    │ │
                     │  │   └─────────────────────┘    │ │
                     │  │                               │ │
                     │  │   Internet Gateway            │ │
                     │  │   (Direct Internet Access)    │ │
                     │  └───────────────────────────────┘ │
                     │                                     │
                     │  ┌───────────────────────────────┐ │
                     │  │   Private Subnets             │ │
                     │  │   (10.0.10.0/24, 10.0.11.0/24)│ │
                     │  │   • Reserved for future use   │ │
                     │  │   • Route via IGW             │ │
                     │  └───────────────────────────────┘ │
                     └─────────────────────────────────────┘
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
  - Caches static assets
  - Origin: S3 bucket
  - Custom error pages for SPA routing

**Cost:** ~$1-3/month

### 2. Backend (Django API)

**Services:**
- **ECS Cluster**: Container orchestration
  - Service: Fargate (serverless)
  - CPU: 256 units (0.25 vCPU)
  - Memory: 512 MB
  - Desired count: 1 task

- **ECS Service Configuration**:
  - Launch type: FARGATE
  - Network: Public subnets
  - Public IP: Enabled
  - Security group: Only accepts traffic from ALB on port 8000

- **Application Load Balancer (ALB)**:
  - Type: Application
  - Scheme: Internet-facing
  - Subnets: Public (both AZs)
  - Listeners:
    - HTTP (80): Forwards to target group
    - HTTPS (443): Forwards to target group
  - Health check: `/api/health/`

- **ECR Repository**: Docker image storage
  - Stores Django application images
  - Lifecycle policy: Keep last 5 images

- **CloudWatch Logs**:
  - Log group: `/ecs/minga-expenses-django`
  - Retention: 7 days

**Cost:** ~$18-19/month

### 3. Networking

**VPC Configuration:**
- CIDR: 10.0.0.0/16
- Availability Zones: 2

**Public Subnets** (10.0.1.0/24, 10.0.2.0/24):
- Hosts: ALB, ECS Tasks
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

1. **ALB Security Group**:
   - Inbound:
     - Port 80 (HTTP) from 0.0.0.0/0
     - Port 443 (HTTPS) from 0.0.0.0/0
   - Outbound: All traffic

2. **ECS Tasks Security Group**:
   - Inbound:
     - Port 8000 from ALB security group only
   - Outbound: All traffic (for database, ECR, Secrets Manager)

**IAM Roles:**

1. **ECS Execution Role**:
   - Pulls images from ECR
   - Writes logs to CloudWatch
   - Reads secrets from Secrets Manager

2. **ECS Task Role**:
   - Application-level permissions
   - ECS Exec enabled (for debugging)

**Secrets Management:**
- AWS Secrets Manager stores:
  - Database credentials
  - Django secret key
- Injected as environment variables at runtime

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
| Application Load Balancer | $16.70 | Fixed + data processed |
| ECS Fargate (1 task) | $2.50 | 0.25 vCPU, 512 MB RAM |
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
| **Total** | **~$22-23/month** | Low traffic estimate |

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

**Why it's safe:**
- ECS tasks still protected by security groups
- Only ALB can reach ECS tasks on port 8000
- Public IPs don't expose services (security groups control access)
- Common pattern for Fargate + ALB architecture

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
1. Logs into ECR
2. Builds Django Docker image
3. Pushes to ECR repository
4. Forces ECS service redeployment

### Frontend Deployment

```bash
# Build and deploy frontend
./deploy-frontend.sh
```

This script:
1. Builds React application
2. Syncs to S3 bucket
3. Creates CloudFront invalidation

## Network Flow

### User Request Flow (Frontend)

1. User visits CloudFront URL
2. CloudFront serves cached content or fetches from S3
3. Browser loads React application
4. React app makes API calls to CloudFront (API requests)
5. CloudFront forwards to ALB
6. ALB routes to ECS task
7. Django processes request
8. Response returns through same path

### ECS Task Outbound Flow

1. ECS task needs external access (ECR, database, Secrets Manager)
2. Traffic goes through Internet Gateway (direct)
3. No NAT Gateway hop (cost optimization)
4. Response returns to ECS task

## Monitoring

### CloudWatch

**Metrics tracked:**
- ECS CPU/Memory utilization
- ALB request count
- ALB target response time
- ALB HTTP status codes
- ECS task health

**Logs:**
- Django application logs: `/ecs/minga-expenses-django`
- Retention: 7 days

**Alarms:**
- None configured (optional: set up for production)

### Health Checks

**ALB Health Check:**
- Path: `/api/health/`
- Interval: 30 seconds
- Healthy threshold: 2 consecutive successes
- Unhealthy threshold: 2 consecutive failures
- Timeout: 5 seconds

## Scaling

### Current Configuration

**Vertical Scaling (Task size):**
- CPU: 256 units (0.25 vCPU)
- Memory: 512 MB
- Sufficient for low-traffic personal use

**Horizontal Scaling (Task count):**
- Desired count: 1
- Min/Max: Not configured (manual scaling only)

### Future Scaling Options

**Auto-scaling (if needed):**
1. Create auto-scaling target
2. Set min/max tasks (e.g., 1-4)
3. Add scaling policies:
   - CPU > 70% → Scale out
   - CPU < 30% → Scale in
4. Expected cost: $2.50 per additional task

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
3. Push latest Docker image to ECR
4. ECS automatically pulls and runs

**Recovery Time:** ~10 minutes

## Security Best Practices

### Implemented

✅ HTTPS everywhere (CloudFront, ALB)
✅ Security groups restrict traffic
✅ Secrets in Secrets Manager (not environment variables)
✅ IAM roles with least privilege
✅ Private ECR repository
✅ CloudWatch logging enabled

### Recommended for Production

⚠️ Enable AWS WAF on ALB/CloudFront
⚠️ Set up CloudWatch alarms
⚠️ Enable AWS Config for compliance
⚠️ Implement backup/disaster recovery automation
⚠️ Add custom domain with Route53
⚠️ Enable AWS Shield Standard (free) or Advanced
⚠️ Implement rate limiting in Django

## Troubleshooting

### Common Issues

**ECS task won't start:**
1. Check CloudWatch logs: `/ecs/minga-expenses-django`
2. Verify secrets are correctly configured
3. Ensure ECR image is available
4. Check security group allows outbound traffic

**ALB health check failing:**
1. Verify `/api/health/` endpoint returns 200
2. Check security group allows ALB → ECS on port 8000
3. Review ECS task logs

**Frontend not loading:**
1. Check S3 bucket has files
2. Verify CloudFront distribution is deployed
3. Create CloudFront invalidation if needed
4. Check browser console for CORS errors

**CORS errors:**
1. Update Django `CORS_ALLOWED_ORIGINS` with CloudFront URL
2. Ensure backend allows frontend domain

## Future Improvements

### Performance
- [ ] Implement Redis caching layer
- [ ] Add CloudFront caching headers
- [ ] Enable ALB slow start for graceful scaling

### Cost Optimization
- [ ] Consider AWS Lightsail for simpler workloads
- [ ] Evaluate Fargate Spot for additional savings
- [ ] Review CloudWatch log retention (currently 7 days)

### Features
- [ ] Add custom domain (Route53)
- [ ] Implement CI/CD pipeline (GitHub Actions)
- [ ] Set up staging environment
- [ ] Add AWS WAF for security

### Monitoring
- [ ] Configure CloudWatch alarms
- [ ] Set up SNS notifications
- [ ] Implement application performance monitoring
- [ ] Add cost anomaly detection

## References

- [Terraform Configuration](terraform/)
- [Deployment Guide](deployment.md)
- [Django Backend](expenses/)
- [React Frontend](frontend/)

## Architecture Decisions

### Why Public Subnets for ECS?

**Decision:** Run ECS Fargate tasks in public subnets with public IPs

**Rationale:**
1. **Cost:** Eliminates $33/month NAT Gateway cost
2. **Performance:** Direct internet access (no NAT hop)
3. **Security:** Security groups still restrict all inbound traffic
4. **Simplicity:** Fewer infrastructure components
5. **Common pattern:** Standard for Fargate + ALB deployments

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
4. **Scaling:** Easy to add more tasks

### Why CloudFront + S3 for Frontend?

**Decision:** Use S3 + CloudFront instead of EC2/Nginx

**Rationale:**
1. **Cost:** Cheapest option (~$1-3/month)
2. **Performance:** Global CDN with edge locations
3. **Scalability:** Handles traffic spikes automatically
4. **Reliability:** 99.99% uptime SLA
5. **HTTPS:** Free TLS certificate

## Changelog

**October 23, 2025**
- Removed NAT Gateway for cost optimization
- Moved ECS tasks to public subnets
- Updated all documentation
- Cost reduced from ~$55/month to ~$22/month

**[Previous date]**
- Initial infrastructure deployment
- Backend and frontend deployed
- HTTPS enabled on ALB
