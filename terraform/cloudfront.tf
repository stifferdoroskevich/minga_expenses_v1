# Random password for CloudFront custom header (security)
resource "random_password" "cloudfront_custom_header" {
  length  = 32
  special = false
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac"
  description                       = "Origin Access Control for ${var.project_name} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Use only North America and Europe

  # S3 Origin for Frontend
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # ECS Task Origin for Backend API (DNS will be updated by Lambda)
  origin {
    domain_name = "localhost.localdomain"  # Placeholder - will be updated by Lambda on first task start
    origin_id   = "ECS-Backend"

    custom_origin_config {
      http_port              = 8000
      https_port             = 443
      origin_protocol_policy = "http-only"  # Connect directly to ECS task on port 8000
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Custom-Origin-Auth"
      value = random_password.cloudfront_custom_header.result
    }
  }

  # Note: Lambda will update the ECS-Backend origin domain_name dynamically
  # If Terraform tries to revert it, you may need to manually adjust or re-run Lambda

  # Default behavior - serve frontend from S3
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # API behavior - proxy to ECS
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "ECS-Backend"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept", "Content-Type", "Origin"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0     # Don't cache API responses
    max_ttl                = 0
    compress               = true
  }

  # Django Admin behavior - proxy to ECS
  ordered_cache_behavior {
    path_pattern     = "/admin/*"
    target_origin_id = "ECS-Backend"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept", "Content-Type", "Origin", "Referer"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0     # Don't cache admin pages
    max_ttl                = 0
    compress               = true
  }

  # Static files for Django Admin
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    target_origin_id = "ECS-Backend"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = false
      headers      = []

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400  # Cache static files for 1 day
    max_ttl                = 31536000
    compress               = true
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-frontend-cdn"
  }

  lifecycle {
    # Ignore changes to origin domain_name made by Lambda
    # Lambda updates the ECS-Backend origin dynamically when tasks start
    ignore_changes = [origin]
  }
}
