#!/bin/bash

echo "Initializing LocalStack SQS..."

# Wait for LocalStack to be ready
sleep 10

# Create SQS queue with error handling
echo "Creating SQS queue 'test-queue'..."
awslocal sqs create-queue --queue-name test-queue --region us-east-1 || {
    echo "Warning: Queue might already exist or LocalStack is not ready"
}

# Verify queue was created
echo "Verifying queue..."
awslocal sqs list-queues --region us-east-1

echo "LocalStack SQS initialization complete!"
