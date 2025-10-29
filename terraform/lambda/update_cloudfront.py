"""
Lambda function to update CloudFront origin when ECS task IP changes.
Triggered by EventBridge when ECS task state changes to RUNNING.
"""
import json
import boto3
import os
import time
from datetime import datetime

ecs_client = boto3.client('ecs')
cloudfront_client = boto3.client('cloudfront')
ec2_client = boto3.client('ec2')

DISTRIBUTION_ID = os.environ['CLOUDFRONT_DISTRIBUTION_ID']
CLUSTER_NAME = os.environ['ECS_CLUSTER_NAME']
SERVICE_NAME = os.environ['ECS_SERVICE_NAME']


def lambda_handler(event, context):
    """
    Handle ECS task state change events.
    Updates CloudFront origin when task starts with new IP.
    """
    print(f"Received event: {json.dumps(event)}")

    # Check if this is a task state change to RUNNING
    if event.get('detail-type') != 'ECS Task State Change':
        print("Not an ECS task state change event")
        return {'statusCode': 200, 'body': 'Event ignored'}

    detail = event.get('detail', {})
    last_status = detail.get('lastStatus')
    desired_status = detail.get('desiredStatus')

    # Only process when task is RUNNING
    if last_status != 'RUNNING' or desired_status != 'RUNNING':
        print(f"Task not in RUNNING state: lastStatus={last_status}, desiredStatus={desired_status}")
        return {'statusCode': 200, 'body': 'Task not running yet'}

    # Get task details
    task_arn = detail.get('taskArn')
    cluster = detail.get('clusterArn', '').split('/')[-1]

    print(f"Processing task: {task_arn} in cluster: {cluster}")

    try:
        # Get task public DNS name
        public_dns = get_task_public_dns(cluster, task_arn)

        if not public_dns:
            print("Could not get public DNS for task")
            return {'statusCode': 500, 'body': 'Failed to get task DNS'}

        print(f"Task public DNS: {public_dns}")

        # Update CloudFront distribution
        update_cloudfront_origin(public_dns)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'CloudFront origin updated successfully',
                'taskArn': task_arn,
                'publicDNS': public_dns,
                'timestamp': datetime.utcnow().isoformat()
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_task_public_dns(cluster, task_arn):
    """
    Get the public DNS name of an ECS task.
    """
    try:
        # Describe the task to get ENI details
        response = ecs_client.describe_tasks(
            cluster=cluster,
            tasks=[task_arn]
        )

        if not response['tasks']:
            print("Task not found")
            return None

        task = response['tasks'][0]

        # Get network interface ID from task
        attachments = task.get('attachments', [])
        eni_id = None

        for attachment in attachments:
            if attachment.get('type') == 'ElasticNetworkInterface':
                for detail in attachment.get('details', []):
                    if detail.get('name') == 'networkInterfaceId':
                        eni_id = detail.get('value')
                        break

        if not eni_id:
            print("No network interface found for task")
            return None

        print(f"Task ENI: {eni_id}")

        # Get public DNS from ENI
        eni_response = ec2_client.describe_network_interfaces(
            NetworkInterfaceIds=[eni_id]
        )

        if not eni_response['NetworkInterfaces']:
            print("Network interface not found")
            return None

        eni = eni_response['NetworkInterfaces'][0]
        association = eni.get('Association', {})
        public_dns = association.get('PublicDnsName')

        if not public_dns:
            print("No public DNS name found, falling back to IP-based DNS")
            public_ip = association.get('PublicIp')
            if public_ip:
                # Convert IP to AWS public DNS format
                # e.g., 3.123.45.67 becomes ec2-3-123-45-67.compute-1.amazonaws.com
                # This works for us-east-1, adjust region if needed
                dns_ip = public_ip.replace('.', '-')
                region = os.environ.get('AWS_REGION', 'us-east-1')
                public_dns = f"ec2-{dns_ip}.{region}.compute.amazonaws.com"
                print(f"Generated DNS from IP: {public_dns}")

        return public_dns

    except Exception as e:
        print(f"Error getting task DNS: {str(e)}")
        raise


def update_cloudfront_origin(new_dns):
    """
    Update CloudFront distribution origin to point to new ECS task DNS.
    """
    try:
        # Get current distribution configuration
        print(f"Getting CloudFront distribution: {DISTRIBUTION_ID}")
        config_response = cloudfront_client.get_distribution_config(
            Id=DISTRIBUTION_ID
        )

        config = config_response['DistributionConfig']
        etag = config_response['ETag']

        # Find the backend origin (not S3)
        updated = False
        for origin in config['Origins']['Items']:
            # Skip S3 origins (they contain .s3. in domain name)
            if '.s3.' in origin['DomainName'] or origin.get('S3OriginConfig'):
                continue

            print(f"Updating origin: {origin['Id']}")
            print(f"Old domain: {origin['DomainName']}")
            print(f"New domain: {new_dns}")

            # Update the domain to the new DNS name
            origin['DomainName'] = new_dns

            # Ensure custom origin config exists and uses HTTP
            if 'CustomOriginConfig' not in origin:
                origin['CustomOriginConfig'] = {
                    'HTTPPort': 8000,
                    'HTTPSPort': 443,
                    'OriginProtocolPolicy': 'http-only',
                    'OriginSslProtocols': {
                        'Quantity': 1,
                        'Items': ['TLSv1.2']
                    }
                }
            else:
                origin['CustomOriginConfig']['HTTPPort'] = 8000
                origin['CustomOriginConfig']['OriginProtocolPolicy'] = 'http-only'

            updated = True
            break

        if not updated:
            print("Warning: No backend origin found to update")
            return False

        # Update the distribution
        print("Updating CloudFront distribution...")
        cloudfront_client.update_distribution(
            Id=DISTRIBUTION_ID,
            DistributionConfig=config,
            IfMatch=etag
        )

        print("CloudFront distribution updated successfully")

        # Create invalidation to clear cache
        print("Creating CloudFront invalidation...")
        cloudfront_client.create_invalidation(
            DistributionId=DISTRIBUTION_ID,
            InvalidationBatch={
                'Paths': {
                    'Quantity': 2,
                    'Items': ['/api/*', '/admin/*']
                },
                'CallerReference': f"ecs-task-{int(time.time())}"
            }
        )

        print("Invalidation created")
        return True

    except Exception as e:
        print(f"Error updating CloudFront: {str(e)}")
        raise
